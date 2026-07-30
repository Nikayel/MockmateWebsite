/**
 * Verification linking: when a challenged card is reviewed, record whether
 * the learner's challenge held up.
 *
 * `passed` uses the same mastery_score >= 56 threshold as the research
 * tracker's actual_retention, so "was the learner right when they disputed
 * the model?" is directly comparable with the rest of the retention data —
 * this is the study's key dependent variable.
 *
 * Called from the review write path AFTER the normal scheduling update;
 * failures must never break the review itself.
 */

import { adminDb } from "../firebase-admin"
import { logLearnerModelEvent, LEARNER_MODEL_EVENTS } from "./events"
import type { ChallengeDoc } from "./challenges"

/** Same bar as AlgorithmResearchEvent.actual_retention. */
export const VERIFICATION_PASS_THRESHOLD = 56

export interface VerificationInput {
  masteryScore: number
  reviewedAt: string
  researchEventId?: string | null
}

export function isVerificationPassed(masteryScore: number): boolean {
  return masteryScore >= VERIFICATION_PASS_THRESHOLD
}

/**
 * Resolve every pending challenge on (userId, problemId) with this review's
 * outcome. Equality-only query — no composite index needed. Idempotent:
 * already-verified challenges are not matched again.
 */
export async function resolveVerificationForReview(
  userId: string,
  problemId: string,
  input: VerificationInput
): Promise<number> {
  const snapshot = await adminDb
    .collection("learner_model_challenges")
    .where("user_id", "==", userId)
    .where("problem_id", "==", problemId)
    .where("status", "==", "pending_verification")
    .get()

  if (snapshot.empty) return 0

  const passed = isVerificationPassed(input.masteryScore)
  const verification = {
    reviewed_at: input.reviewedAt,
    mastery_score: input.masteryScore,
    passed,
    research_event_id: input.researchEventId ?? null,
  }

  let resolved = 0
  for (const doc of snapshot.docs) {
    const challenge = doc.data() as ChallengeDoc
    await doc.ref.update({ status: "verified", verification })
    resolved++

    await logLearnerModelEvent(
      userId,
      LEARNER_MODEL_EVENTS.VERIFICATION_COMPLETED,
      challenge.condition,
      {
        challenge_id: challenge.id,
        problem_id: problemId,
        reason: challenge.reason,
        passed,
        mastery_score: input.masteryScore,
      }
    )
  }
  return resolved
}

/** Recent challenges for the /practice trace banner (last 7 days). */
export async function getRecentChallenges(userId: string): Promise<ChallengeDoc[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const snapshot = await adminDb
    .collection("learner_model_challenges")
    .where("user_id", "==", userId)
    .orderBy("created_at", "desc")
    .limit(10)
    .get()

  return snapshot.docs
    .map((doc) => doc.data() as ChallengeDoc)
    .filter((challenge) => challenge.created_at >= cutoff)
}
