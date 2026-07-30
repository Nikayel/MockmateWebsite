/**
 * Admin/research aggregation over the open learner model.
 *
 * Answers the questions the co-regulation study is actually built to ask, which no
 * other admin surface reports:
 *
 *  - How often do learners dispute what the model believes about them?
 *  - When they dispute it, ARE THEY RIGHT? Every challenge pulls a verification
 *    review, and its outcome is ground truth. `dispute_accuracy_pct` is the study's
 *    headline dependent variable.
 *  - Which reason do they give, and does that reason predict being right?
 *  - Is the correction machinery actually reaching the principled path
 *    (`event_snapshot` FSRS replay) or falling back?
 *  - Is the black-box control condition seeing comparable traffic?
 *
 * Cost shape: challenge docs are read in full (they are inherently low-volume — one
 * per dispute) up to `MAX_CHALLENGES_SCANNED`, while the far larger event collection
 * is measured with Firestore count() aggregates instead of document reads.
 */

import { adminDb } from "../firebase-admin"
import { LEARNER_MODEL_EVENTS, type LearnerModelEventType } from "./events"
import type { ChallengeDoc } from "./challenges"
import type { ChallengeReason, LearnerModelCondition } from "./types"

/**
 * Ceiling on challenge docs scanned per request. Well above current volume; when it
 * binds, `truncated` says so rather than letting the dashboard silently report a
 * partial history as if it were complete.
 */
export const MAX_CHALLENGES_SCANNED = 500

const REASONS: ChallengeReason[] = ["typo", "rushed", "learned_elsewhere"]
const AMENDMENT_SOURCES = ["event_snapshot", "field_fallback", "none"] as const
const CONDITIONS: LearnerModelCondition[] = ["open", "black_box"]

export interface VerificationOutcome {
  total: number
  pending: number
  verified: number
  /** Verified reviews where the learner's dispute held up (they really did know it). */
  passed: number
  /** Verified reviews where the model's original belief was vindicated. */
  failed: number
  /** passed / verified, as a percentage. Null until at least one verification resolves. */
  accuracy_pct: number | null
}

export interface LearnerModelAdminStats {
  generated_at: string
  /** True when the challenge scan hit MAX_CHALLENGES_SCANNED. */
  truncated: boolean

  challenges: VerificationOutcome & {
    /** Distinct users who have disputed at least one belief. */
    distinct_challengers: number
    by_reason: Record<ChallengeReason, VerificationOutcome>
    /** How the Correct layer amended the card. `none` = verification pull only. */
    by_amendment_source: Record<(typeof AMENDMENT_SOURCES)[number], number>
    /** Mean mastery_score of resolved verification reviews. */
    mean_verification_score: number | null
  }

  /** Event volume per type, from count() aggregates. */
  events_by_type: Record<LearnerModelEventType, number>
  /** Event volume per study condition — the control arm should not be silent. */
  events_by_condition: Record<LearnerModelCondition, number>
  events_total: number

  /** Newest challenges, for the admin table. */
  recent: RecentChallengeRow[]
}

export interface RecentChallengeRow {
  id: string
  user_id: string
  title: string
  pattern: string
  reason: ChallengeReason
  condition: LearnerModelCondition
  created_at: string
  status: ChallengeDoc["status"]
  amendment_source: string | null
  /** Retrievability the model asserted at the moment the learner objected. */
  believed_retrievability: number | null
  stability_before: number | null
  stability_after: number | null
  verification_score: number | null
  verification_passed: boolean | null
}

/** An empty outcome accumulator. */
function emptyOutcome(): VerificationOutcome {
  return { total: 0, pending: 0, verified: 0, passed: 0, failed: 0, accuracy_pct: null }
}

/** Fold one challenge into an outcome accumulator. */
function accumulate(outcome: VerificationOutcome, challenge: ChallengeDoc): void {
  outcome.total++
  if (challenge.status === "verified" && challenge.verification) {
    outcome.verified++
    if (challenge.verification.passed) outcome.passed++
    else outcome.failed++
  } else {
    outcome.pending++
  }
}

/** Percentage of resolved verifications where the learner turned out to be right. */
function finalize(outcome: VerificationOutcome): VerificationOutcome {
  outcome.accuracy_pct =
    outcome.verified > 0 ? Math.round((outcome.passed / outcome.verified) * 100) : null
  return outcome
}

/** Count matching docs without reading them. Returns 0 if the aggregate fails. */
async function countWhere(collection: string, field: string, value: string): Promise<number> {
  try {
    const snapshot = await adminDb.collection(collection).where(field, "==", value).count().get()
    return snapshot.data().count
  } catch {
    // A missing index or an empty collection must not take down the whole dashboard.
    return 0
  }
}

/**
 * Aggregate every learner-model signal an admin or researcher needs.
 *
 * Never throws on partial failure: event aggregates degrade to 0 independently, so a
 * challenge history still renders if the event collection is unavailable.
 */
export async function getLearnerModelAdminStats(): Promise<LearnerModelAdminStats> {
  const snapshot = await adminDb
    .collection("learner_model_challenges")
    .orderBy("created_at", "desc")
    .limit(MAX_CHALLENGES_SCANNED)
    .get()

  const challenges = snapshot.docs.map((doc) => doc.data() as ChallengeDoc)

  const overall = emptyOutcome()
  const byReason = Object.fromEntries(REASONS.map((r) => [r, emptyOutcome()])) as Record<
    ChallengeReason,
    VerificationOutcome
  >
  const bySource = Object.fromEntries(AMENDMENT_SOURCES.map((s) => [s, 0])) as Record<
    (typeof AMENDMENT_SOURCES)[number],
    number
  >
  const challengers = new Set<string>()
  let verificationScoreTotal = 0
  let verificationScoreCount = 0

  for (const challenge of challenges) {
    accumulate(overall, challenge)
    if (byReason[challenge.reason]) accumulate(byReason[challenge.reason], challenge)
    challengers.add(challenge.user_id)

    const source = challenge.correction?.amendment_source
    if (source && source in bySource) bySource[source]++

    if (typeof challenge.verification?.mastery_score === "number") {
      verificationScoreTotal += challenge.verification.mastery_score
      verificationScoreCount++
    }
  }

  const eventTypes = Object.values(LEARNER_MODEL_EVENTS)
  const [typeCounts, conditionCounts] = await Promise.all([
    Promise.all(eventTypes.map((type) => countWhere("learner_model_events", "event_type", type))),
    Promise.all(
      CONDITIONS.map((condition) => countWhere("learner_model_events", "condition", condition))
    ),
  ])

  const eventsByType = Object.fromEntries(
    eventTypes.map((type, index) => [type, typeCounts[index]])
  ) as Record<LearnerModelEventType, number>
  const eventsByCondition = Object.fromEntries(
    CONDITIONS.map((condition, index) => [condition, conditionCounts[index]])
  ) as Record<LearnerModelCondition, number>

  return {
    generated_at: new Date().toISOString(),
    truncated: challenges.length === MAX_CHALLENGES_SCANNED,
    challenges: {
      ...finalize(overall),
      distinct_challengers: challengers.size,
      by_reason: Object.fromEntries(
        REASONS.map((reason) => [reason, finalize(byReason[reason])])
      ) as Record<ChallengeReason, VerificationOutcome>,
      by_amendment_source: bySource,
      mean_verification_score:
        verificationScoreCount > 0
          ? Math.round(verificationScoreTotal / verificationScoreCount)
          : null,
    },
    events_by_type: eventsByType,
    events_by_condition: eventsByCondition,
    events_total: conditionCounts.reduce((sum, count) => sum + count, 0),
    recent: challenges.slice(0, 25).map(toRecentRow),
  }
}

/** Flatten a challenge doc into the admin table's row shape. */
function toRecentRow(challenge: ChallengeDoc): RecentChallengeRow {
  return {
    id: challenge.id,
    user_id: challenge.user_id,
    title: challenge.title,
    pattern: challenge.pattern,
    reason: challenge.reason,
    condition: challenge.condition,
    created_at: challenge.created_at,
    status: challenge.status,
    amendment_source: challenge.correction?.amendment_source ?? null,
    believed_retrievability: challenge.belief_snapshot?.retrievability ?? null,
    stability_before: challenge.correction?.before.stability ?? null,
    stability_after: challenge.correction?.after.stability ?? null,
    verification_score: challenge.verification?.mastery_score ?? null,
    verification_passed: challenge.verification?.passed ?? null,
  }
}
