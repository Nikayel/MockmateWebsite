/**
 * END-TO-END integration tests against a REAL Firestore emulator.
 *
 * The unit suites prove the math; these prove the plumbing. Specifically the
 * things a mocked Firestore can never catch:
 *  - real WriteBatch chunking and commit semantics
 *  - real cursor pagination (orderBy(documentId) + startAfter)
 *  - Firestore's hard rejection of `undefined` field values
 *  - real multi-equality query behavior (the verification lookup)
 *  - true idempotency across genuine re-reads, not replayed mock state
 *  - the full challenge → amendment → mastery write → verification chain
 *
 * Run: pnpm test:integration
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest"

import { adminDb } from "@/lib/firebase-admin"
import { migrateAllUsersToFsrs } from "@/lib/spaced-repetition/fsrs-migration"
import {
  createFSRSCard,
  scheduleFSRS,
  DEFAULT_FSRS_CONFIG,
  type FSRSCard,
} from "@/lib/spaced-repetition/fsrs-algorithm"
import { createChallenge, updateChallengeCorrection } from "@/lib/learner-model/challenges"
import { amendForChallenge } from "@/lib/learner-model/amendment"
import { resolveVerificationForReview } from "@/lib/learner-model/verification"
import { getCardEvidence } from "@/lib/learner-model/evidence"

const T0 = new Date("2026-07-01T10:00:00.000Z")
const T_REVIEW = new Date("2026-07-20T10:00:00.000Z")

async function deleteCollection(path: string) {
  const snap = await adminDb.collection(path).get()
  await Promise.all(snap.docs.map((d) => d.ref.delete()))
}

async function deleteUserCards(userId: string) {
  const snap = await adminDb.collection("problem_mastery").doc(userId).collection("problems").get()
  await Promise.all(snap.docs.map((d) => d.ref.delete()))
}

async function resetAll(userIds: string[]) {
  await Promise.all([
    deleteCollection("profiles"),
    deleteCollection("learner_model_challenges"),
    deleteCollection("learner_model_events"),
    deleteCollection("algorithm_research_events"),
    ...userIds.map(deleteUserCards),
  ])
}

const sm2CardDoc = (overrides: Record<string, unknown> = {}) => ({
  problem_id: "two-sum",
  scenario_id: "two-sum",
  title: "Two Sum",
  pattern: "arrays-hashing",
  difficulty: "easy",
  ease_factor: 2.0,
  interval_days: 7,
  review_count: 3,
  next_review_at: "2026-08-02T09:00:00.000Z",
  last_reviewed_at: "2026-07-26T09:00:00.000Z",
  last_score: 72,
  average_score: 70,
  best_score: 85,
  scores_history: [65, 70, 72],
  first_seen_at: "2026-07-01T00:00:00.000Z",
  time_spent_minutes: 30,
  hints_used_total: 1,
  mastery_level: "reviewing",
  confidence: 0.6,
  ...overrides,
})

beforeAll(() => {
  // Guard: never let these tests touch a real project.
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBeTruthy()
})

describe("FSRS migration against a real Firestore", () => {
  const users = ["mig-a", "mig-b", "mig-c"]

  beforeEach(async () => {
    await resetAll(users)

    await adminDb.collection("profiles").doc("mig-a").set({
      spaced_repetition_algorithm: "sm2",
      algorithm_user_overridden: false,
    })
    await adminDb.collection("profiles").doc("mig-b").set({
      spaced_repetition_algorithm: "sm2",
      algorithm_user_overridden: true, // explicit user choice — must be respected
    })
    await adminDb.collection("profiles").doc("mig-c").set({
      spaced_repetition_algorithm: "fsrs", // already fsrs, but card lacks a blob
    })

    for (const uid of users) {
      await adminDb
        .collection("problem_mastery")
        .doc(uid)
        .collection("problems")
        .doc("two-sum")
        .set(sm2CardDoc())
    }
  })

  it("dry run reports real counts and writes absolutely nothing", async () => {
    const result = await migrateAllUsersToFsrs({ dryRun: true })

    expect(result.usersScanned).toBe(3)
    expect(result.usersFlippedToFsrs).toBe(1) // only mig-a
    expect(result.usersOverriddenSkipped).toBe(1) // mig-b
    expect(result.usersAlreadyFsrs).toBe(1) // mig-c
    expect(result.cardsConverted).toBe(3)

    // Verify by re-reading real documents, not by inspecting a mock.
    const profile = await adminDb.collection("profiles").doc("mig-a").get()
    expect(profile.data()?.spaced_repetition_algorithm).toBe("sm2")
    const card = await adminDb
      .collection("problem_mastery")
      .doc("mig-a")
      .collection("problems")
      .doc("two-sum")
      .get()
    expect(card.data()?.fsrs_state).toBeUndefined()
  })

  it("real run converts cards in place and preserves the schedule exactly", async () => {
    const before = await adminDb
      .collection("problem_mastery")
      .doc("mig-a")
      .collection("problems")
      .doc("two-sum")
      .get()
    const originalDue = before.data()?.next_review_at

    await migrateAllUsersToFsrs()

    const after = await adminDb
      .collection("problem_mastery")
      .doc("mig-a")
      .collection("problems")
      .doc("two-sum")
      .get()
    const data = after.data()!

    // Schedule untouched — the whole point of converting in place.
    expect(data.next_review_at).toBe(originalDue)
    expect(data.interval_days).toBe(7)
    // SM-2 fields kept as a rollback trail.
    expect(data.ease_factor).toBe(2.0)

    const card = JSON.parse(data.fsrs_state as string) as FSRSCard
    expect(new Date(card.nextReview).toISOString()).toBe(originalDue)
    expect(card.stability).toBe(7)
    // ease 2.0 → difficulty 4.75 on the inverse-linear map:
    // 1 + ((2.5 - 2.0) / (2.5 - 1.3)) * 9
    expect(data.fsrs_difficulty).toBeCloseTo(4.75, 5)

    const profile = await adminDb.collection("profiles").doc("mig-a").get()
    expect(profile.data()?.spaced_repetition_algorithm).toBe("fsrs")
    expect(profile.data()?.algorithm_migrated_from).toBe("sm2")
  })

  it("respects an explicit user override while still upgrading their card", async () => {
    await migrateAllUsersToFsrs()

    const profile = await adminDb.collection("profiles").doc("mig-b").get()
    expect(profile.data()?.spaced_repetition_algorithm).toBe("sm2")
    expect(profile.data()?.algorithm_migrated_from).toBeUndefined()

    const card = await adminDb
      .collection("problem_mastery")
      .doc("mig-b")
      .collection("problems")
      .doc("two-sum")
      .get()
    expect(card.data()?.fsrs_state).toBeTypeOf("string")
  })

  it("is genuinely idempotent — a second real run is a no-op", async () => {
    await migrateAllUsersToFsrs()
    const second = await migrateAllUsersToFsrs()

    expect(second.usersFlippedToFsrs).toBe(0)
    expect(second.cardsConverted).toBe(0)
    expect(second.cardsSkipped).toBe(3)
    expect(second.errors).toEqual([])
  })

  it("pages with a real cursor without reprocessing or skipping users", async () => {
    const seen: string[] = []
    let cursor: string | undefined
    let guard = 0

    while (guard++ < 10) {
      const page = await migrateAllUsersToFsrs({ dryRun: true, maxUsers: 1, cursor })
      expect(page.usersScanned).toBeLessThanOrEqual(1)
      if (page.usersScanned > 0 && page.nextCursor) seen.push(page.nextCursor)
      if (!page.nextCursor) break
      cursor = page.nextCursor
    }

    // Every profile visited exactly once, in documentId order.
    expect(seen).toEqual(["mig-a", "mig-b", "mig-c"])
  })
})

describe("challenge → correction → verification against a real Firestore", () => {
  const userId = "olm-user"
  const problemId = "two-sum"

  /** A card penalized by an Again(1) review, plus the event that caused it. */
  async function seedPenalizedCard() {
    const preCard = scheduleFSRS(createFSRSCard(T0), 3, DEFAULT_FSRS_CONFIG, T0)
    const penalized = scheduleFSRS(preCard, 1, DEFAULT_FSRS_CONFIG, T_REVIEW)

    await adminDb
      .collection("problem_mastery")
      .doc(userId)
      .collection("problems")
      .doc(problemId)
      .set(
        sm2CardDoc({
          fsrs_state: JSON.stringify(penalized),
          fsrs_stability: penalized.stability,
          fsrs_difficulty: penalized.difficulty,
          fsrs_lapses: penalized.lapses,
          last_reviewed_at: T_REVIEW.toISOString(),
          next_review_at: penalized.nextReview.toISOString(),
        })
      )

    await adminDb
      .collection("algorithm_research_events")
      .doc(`${userId}_${problemId}_1`)
      .set({
        id: `${userId}_${problemId}_1`,
        user_id: userId,
        problem_id: problemId,
        scenario_id: problemId,
        algorithm: "fsrs",
        timestamp: T_REVIEW.toISOString(),
        pattern: "arrays-hashing",
        difficulty: "easy",
        score: 40,
        mastery_score: 38,
        quality_rating: 1, // Again — the penalty being disputed
        time_spent_minutes: 25,
        hints_used: 2,
        pre_review: {
          interval_days: 3,
          days_since_last_review: 19,
          days_overdue: 0,
          stability: preCard.stability,
          predicted_retention: 62,
          fsrs_card: JSON.stringify(preCard),
        },
        post_review: {
          new_interval_days: 1,
          new_stability: penalized.stability,
          mastery_level: "learning",
          mastery_level_changed: true,
          fsrs_card: JSON.stringify(penalized),
        },
        actual_retention: false,
        retention_as_predicted: false,
        session_number: 2,
        is_early_review: false,
        is_first_review: false,
      })

    return { preCard, penalized }
  }

  beforeEach(async () => {
    await resetAll([userId])
    await adminDb.collection("profiles").doc(userId).set({ spaced_repetition_algorithm: "fsrs" })
  })

  it("runs the whole typo loop: challenge → replay → verification pull → outcome", async () => {
    const { preCard, penalized } = await seedPenalizedCard()

    // 1. Challenge — writes a real doc with a real belief snapshot.
    const { challenge, mastery } = await createChallenge(
      userId,
      { problem_id: problemId, reason: "typo", details: "misread the return type" },
      "open"
    )
    expect(challenge.status).toBe("pending_verification")
    expect(challenge.belief_snapshot.stability).toBeCloseTo(penalized.stability, 5)

    const storedChallenge = await adminDb
      .collection("learner_model_challenges")
      .doc(challenge.id)
      .get()
    expect(storedChallenge.exists).toBe(true)
    expect(storedChallenge.data()?.details).toBe("misread the return type")

    // 2. Correction — replays the review and pulls verification forward.
    const { correction } = await amendForChallenge(userId, problemId, mastery, "typo")
    await updateChallengeCorrection(challenge.id, correction)

    expect(correction.amendment_source).toBe("event_snapshot")
    expect(correction.corrected_rating).toBe(3)

    const amended = await adminDb
      .collection("problem_mastery")
      .doc(userId)
      .collection("problems")
      .doc(problemId)
      .get()
    const amendedCard = JSON.parse(amended.data()?.fsrs_state as string) as FSRSCard

    // The penalty is genuinely undone in stored state.
    expect(amendedCard.stability).toBeGreaterThan(penalized.stability)
    expect(amendedCard.lapses).toBe(penalized.lapses - 1)
    // And it equals what FSRS would have produced with the corrected grade.
    const expected = scheduleFSRS(preCard, 3, DEFAULT_FSRS_CONFIG, T_REVIEW)
    expect(amendedCard.stability).toBeCloseTo(expected.stability, 5)

    // Verification pulled to tomorrow 09:00 UTC.
    expect(amended.data()?.interval_days).toBe(1)
    expect(amended.data()?.next_review_at).toBe(correction.verification_due_at)
    expect(new Date(correction.verification_due_at).getUTCHours()).toBe(9)

    // 3. Verification — the learner turns out to be right.
    const resolved = await resolveVerificationForReview(userId, problemId, {
      masteryScore: 82,
      reviewedAt: "2026-07-30T09:30:00.000Z",
    })
    expect(resolved).toBe(1)

    const verified = await adminDb.collection("learner_model_challenges").doc(challenge.id).get()
    expect(verified.data()?.status).toBe("verified")
    expect(verified.data()?.verification.passed).toBe(true)
    expect(verified.data()?.verification.mastery_score).toBe(82)

    // 4. Idempotent: the challenge is no longer pending.
    expect(
      await resolveVerificationForReview(userId, problemId, {
        masteryScore: 90,
        reviewedAt: "2026-07-31T09:30:00.000Z",
      })
    ).toBe(0)

    // 5. Study events actually landed (no undefined-value rejections).
    const events = await adminDb
      .collection("learner_model_events")
      .where("user_id", "==", userId)
      .get()
    const types = events.docs.map((d) => d.data().event_type).sort()
    expect(types).toContain("olm_challenge_submitted")
    expect(types).toContain("olm_verification_completed")
  })

  it("records a failed verification when the learner was wrong", async () => {
    await seedPenalizedCard()
    const { challenge, mastery } = await createChallenge(
      userId,
      { problem_id: problemId, reason: "rushed" },
      "open"
    )
    const { correction } = await amendForChallenge(userId, problemId, mastery, "rushed")
    await updateChallengeCorrection(challenge.id, correction)

    await resolveVerificationForReview(userId, problemId, {
      masteryScore: 41, // below the 56 bar
      reviewedAt: "2026-07-30T09:30:00.000Z",
    })

    const doc = await adminDb.collection("learner_model_challenges").doc(challenge.id).get()
    expect(doc.data()?.verification.passed).toBe(false)
    expect(doc.data()?.status).toBe("verified")
  })

  it("omits optional details without tripping Firestore's undefined rejection", async () => {
    await seedPenalizedCard()
    // No `details` key at all — Firestore throws on undefined values, so this
    // asserts the conditional-spread guard is real, not theoretical.
    const { challenge } = await createChallenge(
      userId,
      { problem_id: problemId, reason: "learned_elsewhere" },
      "open"
    )
    const stored = await adminDb.collection("learner_model_challenges").doc(challenge.id).get()
    expect(stored.exists).toBe(true)
    expect(stored.data()?.details).toBeUndefined()
  })

  it("learned_elsewhere leaves memory state untouched but pulls the review in", async () => {
    const { penalized } = await seedPenalizedCard()
    const { mastery } = await createChallenge(
      userId,
      { problem_id: problemId, reason: "learned_elsewhere" },
      "open"
    )
    const { correction } = await amendForChallenge(userId, problemId, mastery, "learned_elsewhere")

    expect(correction.type).toBe("verification_pull_only")

    const doc = await adminDb
      .collection("problem_mastery")
      .doc(userId)
      .collection("problems")
      .doc(problemId)
      .get()
    const card = JSON.parse(doc.data()?.fsrs_state as string) as FSRSCard
    expect(card.stability).toBeCloseTo(penalized.stability, 10)
    expect(card.difficulty).toBeCloseTo(penalized.difficulty, 10)
    expect(card.lapses).toBe(penalized.lapses)
    expect(doc.data()?.interval_days).toBe(1)
  })

  it("rejects challenges for cards that do not exist", async () => {
    await expect(
      createChallenge(userId, { problem_id: "no-such-problem", reason: "typo" }, "open")
    ).rejects.toThrow(/No belief exists/)
  })

  it("rejects challenges in the black-box condition", async () => {
    await seedPenalizedCard()
    await expect(
      createChallenge(userId, { problem_id: problemId, reason: "typo" }, "black_box")
    ).rejects.toThrow(/not available/)
  })

  it("serves per-card evidence from the real research-event query", async () => {
    await seedPenalizedCard()
    const evidence = await getCardEvidence(userId, problemId)

    expect(evidence).toHaveLength(1)
    expect(evidence[0]).toMatchObject({
      mastery_score: 38,
      quality_rating: 1,
      hints_used: 2,
      actual_retention: false,
      interval_before_days: 3,
      interval_after_days: 1,
    })
    expect(evidence[0].predicted_retention).toBe(62)
  })
})
