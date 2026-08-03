/**
 * Plain-language translation of FSRS beliefs.
 *
 * The open-learner-model principle: a mastery score alone is a black box with
 * a number on it; score + evidence + a sentence a learner can act on is an
 * explanation. These helpers turn (stability, elapsed) into that sentence.
 */

import { calculateRetrievability } from "../spaced-repetition/fsrs-algorithm"
import { displayRetention } from "../spaced-repetition/memory-bands"

/** Below this recall probability we say memory is no longer "solid". */
export const SOLID_RECALL_THRESHOLD = 0.9

const MAX_FORECAST_DAYS = 3650

/**
 * Days from now until retrievability drops below `threshold`, given the
 * card's stability and how many days have already elapsed since review.
 *
 * Numeric inversion (binary search over the real forgetting curve) rather
 * than hand-inverting ts-fsrs power-curve constants — stays correct if the
 * library's weights change.
 *
 * Returns 0 when recall is already below the threshold.
 */
export function daysUntilRetentionDrops(
  stability: number,
  elapsedDays: number,
  threshold: number = SOLID_RECALL_THRESHOLD
): number {
  if (stability <= 0) return 0
  if (calculateRetrievability(stability, Math.max(0, elapsedDays)) < threshold) return 0
  if (calculateRetrievability(stability, elapsedDays + MAX_FORECAST_DAYS) >= threshold) {
    return MAX_FORECAST_DAYS
  }

  let lo = 0
  let hi = MAX_FORECAST_DAYS
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2
    if (calculateRetrievability(stability, elapsedDays + mid) >= threshold) {
      lo = mid
    } else {
      hi = mid
    }
  }
  return Math.round(hi)
}

/** "in ~4 days" / "today" / "in ~3 weeks" */
function humanizeDays(days: number): string {
  if (days <= 0) return "already"
  if (days < 1.5) return "by tomorrow"
  if (days < 14) return `in ~${Math.round(days)} days`
  if (days < 60) return `in ~${Math.round(days / 7)} weeks`
  return `in ~${Math.round(days / 30)} months`
}

/**
 * One-sentence belief for a reviewed card.
 * e.g. "The system estimates a ~72% chance you could solve this cold today,
 * and that your recall will drop below solid ~in 4 days."
 */
export function describeCardBelief(retrievability: number, daysUntilForgetting: number): string {
  // displayRetention, not Math.round: this sentence is the belief bar's accessible
  // name and it renders visibly in the expanded panel, in both cases immediately
  // beside the same estimate rendered through displayRetention. Rounding it
  // differently made one row state two percentages for one estimate — usually 1-2
  // points apart, but 7 at a band edge, which is exactly where a "~70%" beside the
  // word "Weakening" was already fixed once.
  const chance = displayRetention(retrievability)
  if (daysUntilForgetting <= 0) {
    return `The system estimates a ~${chance}% chance you could solve this cold today — below its solid-recall bar, which is why it wants a review.`
  }
  return `The system estimates a ~${chance}% chance you could solve this cold today, and that your recall drops below solid ${humanizeDays(daysUntilForgetting)}.`
}

/** One-sentence belief for a concept rollup. */
export function describeConceptBelief(
  label: string,
  meanRetrievability: number,
  cardCount: number,
  atRiskCount: number
): string {
  const mean = displayRetention(meanRetrievability)
  if (atRiskCount === 0) {
    return `Across ${cardCount} ${cardCount === 1 ? "problem" : "problems"}, the system believes your ${label} recall averages ~${mean}% right now.`
  }
  return `Across ${cardCount} ${cardCount === 1 ? "problem" : "problems"}, the system believes your ${label} recall averages ~${mean}% — ${atRiskCount} ${atRiskCount === 1 ? "problem is" : "problems are"} at risk of being forgotten.`
}
