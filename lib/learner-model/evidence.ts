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
  /** Scheduling movement this review caused. */
  interval_before_days: number | null
  interval_after_days: number | null
  stability_before: number | null
  stability_after: number | null
  mastery_level_after: string | null
}

const MAX_EVIDENCE_ROWS = 10

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
    interval_before_days: event.pre_review?.interval_days ?? null,
    interval_after_days: event.post_review?.new_interval_days ?? null,
    stability_before: event.pre_review?.stability ?? null,
    stability_after: event.post_review?.new_stability ?? null,
    mastery_level_after: event.post_review?.mastery_level ?? null,
  }
}

/** Latest-first review history for one card (most recent MAX_EVIDENCE_ROWS). */
export async function getCardEvidence(userId: string, problemId: string): Promise<EvidenceRow[]> {
  const snapshot = await adminDb
    .collection("algorithm_research_events")
    .where("user_id", "==", userId)
    .where("problem_id", "==", problemId)
    .orderBy("timestamp", "desc")
    .limit(MAX_EVIDENCE_ROWS)
    .get()

  return snapshot.docs.map((doc) =>
    toRow({ ...(doc.data() as AlgorithmResearchEvent), id: doc.id })
  )
}

export { toRow as mapResearchEventToEvidenceRow }
