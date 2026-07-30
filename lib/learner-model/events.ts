/**
 * Learner-model study-harness event logging.
 *
 * Every interaction with the open learner model is logged as a first-class,
 * queryable event (research-tracker style: deterministic ids, undefined
 * stripping) rather than through the generic analytics_events sink, because
 * these are the dependent variables of a future co-regulation study and get
 * exported per-user.
 *
 * Contract: logging NEVER throws — it must not break the user-facing flow.
 */

import { adminDb } from "../firebase-admin"
import type { LearnerModelCondition } from "./types"

export const LEARNER_MODEL_EVENTS = {
  MODEL_VIEWED: "olm_model_viewed",
  CONCEPT_EXPANDED: "olm_concept_expanded",
  CARD_EVIDENCE_VIEWED: "olm_card_evidence_viewed",
  CHALLENGE_SUBMITTED: "olm_challenge_submitted",
  CORRECTION_APPLIED: "olm_correction_applied",
  VERIFICATION_SCHEDULED: "olm_verification_scheduled",
  VERIFICATION_COMPLETED: "olm_verification_completed",
  TRACE_SHOWN: "olm_trace_shown",
} as const

export type LearnerModelEventType = (typeof LEARNER_MODEL_EVENTS)[keyof typeof LEARNER_MODEL_EVENTS]

/** Event types clients may report directly (everything else is server-emitted). */
export const CLIENT_REPORTABLE_EVENTS = [
  LEARNER_MODEL_EVENTS.CONCEPT_EXPANDED,
  LEARNER_MODEL_EVENTS.CARD_EVIDENCE_VIEWED,
  LEARNER_MODEL_EVENTS.TRACE_SHOWN,
] as const

export interface LearnerModelEvent {
  id: string
  user_id: string
  event_type: LearnerModelEventType
  condition: LearnerModelCondition
  timestamp: string
  payload: Record<string, string | number | boolean>
}

/** Firestore rejects undefined values; strip them defensively. */
function stripUndefined(
  payload: Record<string, string | number | boolean | undefined>
): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) clean[key] = value
  }
  return clean
}

/** Deterministic doc id (research-tracker convention). */
export function buildLearnerModelEventId(
  userId: string,
  eventType: LearnerModelEventType,
  timestampMs: number
): string {
  return `${userId}_${eventType}_${timestampMs}`
}

export async function logLearnerModelEvent(
  userId: string,
  eventType: LearnerModelEventType,
  condition: LearnerModelCondition,
  payload: Record<string, string | number | boolean | undefined> = {}
): Promise<void> {
  try {
    const now = Date.now()
    const event: LearnerModelEvent = {
      id: buildLearnerModelEventId(userId, eventType, now),
      user_id: userId,
      event_type: eventType,
      condition,
      timestamp: new Date(now).toISOString(),
      payload: stripUndefined(payload),
    }

    await adminDb.collection("learner_model_events").doc(event.id).set(event)
  } catch (error) {
    // Analytics must never break the main flow.
    console.error("[LearnerModel] Failed to log event:", error)
  }
}
