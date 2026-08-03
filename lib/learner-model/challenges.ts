/**
 * Challenge layer: a learner disputes the model's belief about a card.
 *
 * Every challenge is a first-class doc in the flat learner_model_challenges
 * collection (deterministic id, belief snapshot at challenge time) — these
 * are the primary dependent variables of the co-regulation study: when do
 * learners dispute the model, and are they right when they do (filled in by
 * the verification review).
 */

import { adminDb } from "../firebase-admin"
import { reconstructState, estimateRetention } from "../spaced-repetition/algorithm-router"
import type { ProblemMastery } from "../spaced-repetition"
import { logLearnerModelEvent, LEARNER_MODEL_EVENTS } from "./events"
import type { ChallengeReason, LearnerModelCondition } from "./types"

export interface BeliefSnapshot {
  retrievability: number | null
  stability: number | null
  difficulty: number | null
  lapses: number | null
  interval_days: number
  next_review_at: string
  mastery_level: string
  last_score: number | null
  review_count: number
}

export interface ChallengeCorrection {
  type: "rerate" | "verification_pull_only"
  corrected_rating?: 2 | 3
  amendment_source: "event_snapshot" | "field_fallback" | "none"
  before: { stability: number | null; next_review_at: string; lapses: number | null }
  after: { stability: number | null; next_review_at: string; lapses: number | null }
  verification_due_at: string
}

export interface ChallengeDoc {
  id: string
  user_id: string
  problem_id: string
  scenario_id: string
  title: string
  pattern: string
  reason: ChallengeReason
  details?: string
  created_at: string
  condition: LearnerModelCondition
  belief_snapshot: BeliefSnapshot
  correction: ChallengeCorrection | null
  status: "pending_verification" | "verified"
  verification: {
    reviewed_at: string
    mastery_score: number
    passed: boolean
    research_event_id: string | null
  } | null
}

export interface CreateChallengeInput {
  problem_id: string
  reason: ChallengeReason
  details?: string
}

export class ChallengeError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "ChallengeError"
  }
}

function daysSince(iso: string | undefined, now: Date): number {
  if (!iso) return 0
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 0
  return Math.max(0, (now.getTime() - then) / (1000 * 60 * 60 * 24))
}

/**
 * An already-pending challenge for this card, if one exists.
 *
 * Challenges are NOT idempotent: `amendForChallenge` re-rates from the card's
 * CURRENT state and pulls a verification review, so applying it twice corrects
 * twice. The client disables Submit while in flight, which stops a double-click,
 * but not the retry path — the request lands, the response is lost, the user sees
 * "Couldn't record your challenge. Please try again" and obliges. On the page whose
 * whole claim is that a correction is principled, silently double-applying one is
 * the wrong failure.
 *
 * Three equality filters and no ordering, so Firestore serves it by merging
 * single-field indexes; `resolveVerificationForReview` already relies on the same
 * shape.
 */
export async function findPendingChallenge(
  userId: string,
  problemId: string
): Promise<ChallengeDoc | null> {
  const snapshot = await adminDb
    .collection("learner_model_challenges")
    .where("user_id", "==", userId)
    .where("problem_id", "==", problemId)
    .where("status", "==", "pending_verification")
    .limit(1)
    .get()

  return snapshot.empty ? null : (snapshot.docs[0].data() as ChallengeDoc)
}

/** Load the mastery doc a challenge targets, or throw a typed 404. */
export async function loadMasteryForChallenge(
  userId: string,
  problemId: string
): Promise<ProblemMastery> {
  const doc = await adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .doc(problemId)
    .get()

  if (!doc.exists) {
    throw new ChallengeError("No belief exists for this problem", 404)
  }
  return doc.data() as ProblemMastery
}

/** The model's belief at challenge time — the research baseline. */
export function buildBeliefSnapshot(mastery: ProblemMastery, now: Date): BeliefSnapshot {
  const reviewed = (mastery.review_count ?? 0) > 0
  if (!reviewed) {
    return {
      retrievability: null,
      stability: null,
      difficulty: null,
      lapses: null,
      interval_days: mastery.interval_days ?? 0,
      next_review_at: mastery.next_review_at,
      mastery_level: mastery.mastery_level ?? "new",
      last_score: mastery.last_score ?? null,
      review_count: 0,
    }
  }

  const state = reconstructState("fsrs", mastery)
  const elapsed = daysSince(mastery.last_reviewed_at, now)
  return {
    retrievability: estimateRetention("fsrs", state, elapsed),
    stability: state.fsrs_state?.stability ?? null,
    difficulty: state.fsrs_state?.difficulty ?? null,
    lapses: state.fsrs_state?.lapses ?? null,
    interval_days: mastery.interval_days ?? 0,
    next_review_at: mastery.next_review_at,
    mastery_level: mastery.mastery_level ?? "new",
    last_score: mastery.last_score ?? null,
    review_count: mastery.review_count ?? 0,
  }
}

/**
 * Record a challenge. The correction (Correct layer) is applied by the route
 * after this returns and merged into the stored doc via updateChallengeCorrection.
 */
export async function createChallenge(
  userId: string,
  input: CreateChallengeInput,
  condition: LearnerModelCondition
): Promise<{ challenge: ChallengeDoc; mastery: ProblemMastery }> {
  if (condition === "black_box") {
    // Defense in depth: the UI never shows the affordance in the control
    // condition, but the API enforces it too.
    throw new ChallengeError("Challenges are not available for this account", 403)
  }

  const mastery = await loadMasteryForChallenge(userId, input.problem_id)
  const now = new Date()

  const challenge: ChallengeDoc = {
    id: `${userId}_${input.problem_id}_${now.getTime()}`,
    user_id: userId,
    problem_id: input.problem_id,
    scenario_id: mastery.scenario_id || input.problem_id,
    title: mastery.title || input.problem_id,
    pattern: mastery.pattern,
    reason: input.reason,
    ...(input.details ? { details: input.details } : {}),
    created_at: now.toISOString(),
    condition,
    belief_snapshot: buildBeliefSnapshot(mastery, now),
    correction: null,
    status: "pending_verification",
    verification: null,
  }

  await adminDb.collection("learner_model_challenges").doc(challenge.id).set(challenge)

  await logLearnerModelEvent(userId, LEARNER_MODEL_EVENTS.CHALLENGE_SUBMITTED, condition, {
    challenge_id: challenge.id,
    problem_id: input.problem_id,
    reason: input.reason,
    retrievability_at_challenge: challenge.belief_snapshot.retrievability ?? -1,
  })

  return { challenge, mastery }
}

/** Merge the applied correction into the stored challenge doc. */
export async function updateChallengeCorrection(
  challengeId: string,
  correction: ChallengeCorrection
): Promise<void> {
  await adminDb.collection("learner_model_challenges").doc(challengeId).update({ correction })
}
