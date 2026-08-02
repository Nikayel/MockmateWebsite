/**
 * Correct layer: the model visibly responds to a challenge.
 *
 * Reasons map to principled FSRS amendments:
 * - "typo"    → the last review is replayed with rating Good(3): exactly what
 *               FSRS would have produced had the slip not happened (no lapse
 *               increment, no stability penalty).
 * - "rushed"  → same replay with Hard(2) — a weaker correction via the same
 *               single code path, rating parameterized.
 * - "learned_elsewhere" → no re-rate; memory state is left untouched.
 *
 * Replay uses the full pre-review card snapshot stored on the latest research
 * event (pre_review.fsrs_card). For events written before snapshots existed,
 * a conservative field fallback restores pre_review.stability, removes the
 * lapse if the review was rated Again, and leaves difficulty as-is. With no
 * event at all, no state changes.
 *
 * EVERY challenge — regardless of reason or amendment source — pulls a
 * verification review to tomorrow. The verification flows through the normal
 * review path and gives ground truth on whether the learner was right (the
 * study's key dependent variable). The pull changes the due date only, never
 * the memory state (deferSingleProblem-in-reverse).
 */

import { adminDb } from "../firebase-admin"
import { fetchCardResearchEvents } from "./evidence"
import {
  scheduleFSRS,
  DEFAULT_FSRS_CONFIG,
  type FSRSCard,
} from "../spaced-repetition/fsrs-algorithm"
import { reconstructState } from "../spaced-repetition/algorithm-router"
import { buildFsrsCardUpdate } from "../spaced-repetition/fsrs-migration"
import type { ProblemMastery } from "../spaced-repetition"
import type { AlgorithmResearchEvent } from "../types"
import type { ChallengeReason } from "./types"
import type { ChallengeCorrection } from "./challenges"

export type AmendmentSource = "event_snapshot" | "field_fallback" | "none"

/** Corrected rating per reason; null = verification-pull only. */
export function correctedRatingForReason(reason: ChallengeReason): 2 | 3 | null {
  if (reason === "typo") return 3 // Good
  if (reason === "rushed") return 2 // Hard
  return null // learned_elsewhere
}

/** Rehydrate a serialized FSRSCard (dates arrive as ISO strings). */
function parseCardSnapshot(serialized: string): FSRSCard | null {
  try {
    const raw = JSON.parse(serialized) as FSRSCard & {
      lastReview: string | null
      nextReview: string
    }
    if (typeof raw !== "object" || raw === null || typeof raw.stability !== "number") {
      return null
    }
    return {
      ...raw,
      lastReview: raw.lastReview ? new Date(raw.lastReview) : null,
      nextReview: new Date(raw.nextReview),
    }
  } catch {
    return null
  }
}

export interface AmendedCardResult {
  card: FSRSCard
  source: AmendmentSource
}

/**
 * Pure amendment math: given the current card, the challenge reason, and the
 * latest research event (if any), return the corrected memory state.
 */
export function computeAmendedCard(
  currentCard: FSRSCard,
  reason: ChallengeReason,
  latestEvent: AlgorithmResearchEvent | null,
  now: Date
): AmendedCardResult {
  const correctedRating = correctedRatingForReason(reason)
  if (correctedRating === null || !latestEvent) {
    return { card: currentCard, source: "none" }
  }

  const actualRating = latestEvent.quality_rating
  // Only amend when the correction IMPROVES on what was recorded — re-rating
  // an Easy(4) review down to Good(3) would punish the learner for challenging.
  if (typeof actualRating === "number" && correctedRating <= actualRating) {
    return { card: currentCard, source: "none" }
  }

  // Primary: replay the review from the exact pre-review card.
  const snapshot = latestEvent.pre_review?.fsrs_card
    ? parseCardSnapshot(latestEvent.pre_review.fsrs_card)
    : null
  if (snapshot) {
    const replayed = scheduleFSRS(
      snapshot,
      correctedRating,
      DEFAULT_FSRS_CONFIG,
      new Date(latestEvent.timestamp)
    )
    return { card: replayed, source: "event_snapshot" }
  }

  // Fallback for pre-snapshot events: conservative in-place patch.
  if (typeof latestEvent.pre_review?.stability === "number") {
    const patched: FSRSCard = {
      ...currentCard,
      stability: latestEvent.pre_review.stability,
      // The penalized review incremented lapses only if it was rated Again(1).
      lapses: actualRating === 1 ? Math.max(0, currentCard.lapses - 1) : currentCard.lapses,
      state: currentCard.state === "relearning" ? "review" : currentCard.state,
      // Difficulty deliberately untouched: we cannot reconstruct its
      // pre-review value from stability alone, and leaving the penalty is
      // the conservative choice.
      lastReview: currentCard.lastReview ?? now,
    }
    return { card: patched, source: "field_fallback" }
  }

  return { card: currentCard, source: "none" }
}

/** Tomorrow 09:00 UTC — when the verification review comes due. */
export function verificationDueAt(now: Date): Date {
  const due = new Date(now)
  due.setUTCDate(due.getUTCDate() + 1)
  due.setUTCHours(9, 0, 0, 0)
  return due
}

/**
 * Apply the verification pull: due tomorrow, interval 1d, embedded card kept
 * consistent — memory state (stability/difficulty/lapses) untouched.
 */
export function applyVerificationPull(card: FSRSCard, now: Date): { card: FSRSCard; dueAt: Date } {
  const dueAt = verificationDueAt(now)
  return {
    dueAt,
    card: {
      ...card,
      nextReview: dueAt,
      scheduledDays: 1,
      elapsedDays: 0,
    },
  }
}

export interface AmendmentOutcome {
  correction: ChallengeCorrection
}

/**
 * Full Correct-layer application for a challenge: compute the amendment,
 * apply the verification pull, persist ONE mastery update, and return the
 * before/after audit for the challenge doc.
 */
export async function amendForChallenge(
  userId: string,
  problemId: string,
  mastery: ProblemMastery,
  reason: ChallengeReason,
  now: Date = new Date()
): Promise<AmendmentOutcome> {
  // Latest review event for this card. Shares the evidence panel's reader because it
  // is the same query, and because that reader survives the composite index
  // algorithm_research_events (user_id, problem_id, timestamp DESC) being undeployed.
  // Issuing it raw here meant a challenge — the one action this whole feature exists
  // to offer — failed with a 500 in production.
  const [latestEvent = null] = await fetchCardResearchEvents(userId, problemId, 1)

  const currentState = reconstructState("fsrs", mastery)
  const currentCard = currentState.fsrs_state as FSRSCard

  const before = {
    stability: currentCard?.stability ?? null,
    next_review_at: mastery.next_review_at,
    lapses: currentCard?.lapses ?? null,
  }

  const amended = computeAmendedCard(currentCard, reason, latestEvent, now)
  const pulled = applyVerificationPull(amended.card, now)

  await adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .doc(problemId)
    .update({
      ...buildFsrsCardUpdate(pulled.card),
      next_review_at: pulled.dueAt.toISOString(),
      interval_days: 1,
      last_challenged_at: now.toISOString(),
    })

  const correctedRating = correctedRatingForReason(reason)
  return {
    correction: {
      type: amended.source === "none" ? "verification_pull_only" : "rerate",
      ...(amended.source !== "none" && correctedRating !== null
        ? { corrected_rating: correctedRating }
        : {}),
      amendment_source: amended.source,
      before,
      after: {
        stability: pulled.card.stability ?? null,
        next_review_at: pulled.dueAt.toISOString(),
        lapses: pulled.card.lapses ?? null,
      },
      verification_due_at: pulled.dueAt.toISOString(),
    },
  }
}
