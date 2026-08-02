/**
 * Per-card evidence: the review history that produced the model's belief.
 *
 * Sourced from algorithm_research_events — the per-review log every scheduled
 * review already writes (score, quality rating, pre/post scheduling state,
 * predicted vs actual retention). The learner model un-hides it.
 */

import { adminDb } from "../firebase-admin"
import type { AlgorithmResearchEvent } from "../types"

export interface EvidenceRow {
  event_id: string
  timestamp: string
  /** Interview score (with communication). */
  score: number | null
  /** Code-focused mastery score the scheduler actually consumed. */
  mastery_score: number | null
  /** SM-2 0-5 or FSRS 1-4 quality rating recorded for the review. */
  quality_rating: number | null
  hints_used: number | null
  is_first_review: boolean
  /** What the model predicted going in, and whether the user actually recalled. */
  predicted_retention: number | null
  actual_retention: boolean | null
  /**
   * Whether the prediction matched the outcome, as the scheduler judged it at write
   * time. Surfaced rather than recomputed from the two fields above: the
   * predicted-recall cut-off is a scheduling rule, and the UI must not own a second
   * copy of it. This is what lets /knowledge report its own error rate.
   */
  retention_as_predicted: boolean | null
  /** Scheduling movement this review caused. */
  interval_before_days: number | null
  interval_after_days: number | null
  stability_before: number | null
  stability_after: number | null
  mastery_level_after: string | null
}

const MAX_EVIDENCE_ROWS = 10

/**
 * How many rows the no-index fallback reads before ordering in memory. A single card
 * accumulates one event per review, so this covers any realistic history; a card that
 * somehow exceeded it would surface a slightly stale window rather than an error.
 */
const FALLBACK_SCAN_LIMIT = 100

/**
 * Firestore rejects a query it has no index for with FAILED_PRECONDITION (gRPC 9).
 * Matched on the numeric code first and the message only as a fallback, because the
 * message is not part of the API contract.
 */
function isMissingIndexError(error: unknown): boolean {
  const code = (error as { code?: number | string } | null | undefined)?.code
  if (code === 9 || code === "failed-precondition") return true
  return error instanceof Error && error.message.includes("requires an index")
}

/**
 * Latest-first review events for one card.
 *
 * The natural form of this query — two equality filters plus `orderBy timestamp` —
 * needs the composite index `algorithm_research_events (user_id, problem_id,
 * timestamp DESC)`. That index is declared in `firestore.indexes.json` but is NOT
 * deployed on the live project, so the query throws and every caller 500s: the
 * evidence panel on /knowledge and, worse, the whole "This seems wrong" challenge
 * flow through `amendForChallenge`.
 *
 * Deploying the index is still the right fix and makes the fast path live again. Until
 * then, fall back to the equality-only query, which Firestore serves by merging
 * single-field indexes with no composite required, and order in memory. Document ids
 * are `<user>_<problem>_<epochMs>`, so the fallback's implicit __name__ order is
 * already close; the explicit sort makes it exact.
 */
export async function fetchCardResearchEvents(
  userId: string,
  problemId: string,
  limit: number
): Promise<Array<AlgorithmResearchEvent & { id: string }>> {
  const forCard = adminDb
    .collection("algorithm_research_events")
    .where("user_id", "==", userId)
    .where("problem_id", "==", problemId)

  const withId = (doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
    ...(doc.data() as AlgorithmResearchEvent),
    id: doc.id,
  })

  try {
    const snapshot = await forCard.orderBy("timestamp", "desc").limit(limit).get()
    return snapshot.docs.map(withId)
  } catch (error) {
    if (!isMissingIndexError(error)) throw error
    console.warn(
      "algorithm_research_events (user_id, problem_id, timestamp DESC) is not deployed; " +
        "serving card evidence from the unordered fallback. Run: firebase deploy --only firestore:indexes"
    )
    const snapshot = await forCard.limit(FALLBACK_SCAN_LIMIT).get()
    return snapshot.docs
      .map(withId)
      .sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""))
      .slice(0, limit)
  }
}

function toRow(event: AlgorithmResearchEvent & { id?: string }): EvidenceRow {
  return {
    event_id: event.id ?? "",
    timestamp: event.timestamp,
    score: event.score ?? null,
    mastery_score: event.mastery_score ?? null,
    quality_rating: event.quality_rating ?? null,
    hints_used: event.hints_used ?? null,
    is_first_review: event.is_first_review === true,
    predicted_retention: event.pre_review?.predicted_retention ?? null,
    actual_retention: event.actual_retention ?? null,
    retention_as_predicted: event.retention_as_predicted ?? null,
    interval_before_days: event.pre_review?.interval_days ?? null,
    interval_after_days: event.post_review?.new_interval_days ?? null,
    stability_before: event.pre_review?.stability ?? null,
    stability_after: event.post_review?.new_stability ?? null,
    mastery_level_after: event.post_review?.mastery_level ?? null,
  }
}

/** Latest-first review history for one card (most recent MAX_EVIDENCE_ROWS). */
export async function getCardEvidence(userId: string, problemId: string): Promise<EvidenceRow[]> {
  const events = await fetchCardResearchEvents(userId, problemId, MAX_EVIDENCE_ROWS)
  return events.map(toRow)
}

export { toRow as mapResearchEventToEvidenceRow }
