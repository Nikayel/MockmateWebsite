/**
 * Self-scoring against a rubric: storage key, band vocabulary, and the summary line.
 *
 * ## Why the scores stay on the device
 *
 * A self-score is the learner's own opinion of their own prose. It is not evidence of anything, it
 * cannot be validated, and the moment it lands in Firestore somebody will average it into a mastery
 * signal and act on a number that a learner produced about themselves in ten seconds. It is also
 * cheap to lose: the value is in the act of grading, not in the record.
 *
 * So it persists in localStorage, the same way the teach segment position does
 * (`teachSegmentStorageKey`), and no server ever sees it. If that changes it should change
 * deliberately, with a written reason, not because a write was convenient.
 */
import type { RubricDimension } from "@/lib/tutorials/types"

/** The three bands, weakest first. Order is load-bearing: the UI renders them in this order. */
export const RUBRIC_BANDS = ["weak", "adequate", "strong"] as const

export type RubricBand = (typeof RUBRIC_BANDS)[number]

/** A learner's self-score, keyed by dimension index. Sparse: unscored dimensions are absent. */
export type SelfScore = Partial<Record<number, RubricBand>>

/** Where a learner's self-score for one exercise lives. Exercise-scoped, so apply and practice differ. */
export function rubricStorageKey(exerciseId: string): string {
  return `cs_sd_rubric_${exerciseId}`
}

/** The band descriptor for a dimension, so the renderer does not switch on strings. */
export function bandText(dimension: RubricDimension, band: RubricBand): string {
  return dimension[band]
}

/** Parse a persisted self-score, discarding anything that is not a known band. */
export function parseSelfScore(raw: string | null, dimensionCount: number): SelfScore {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {}
  const score: SelfScore = {}
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const index = Number(key)
    if (!Number.isInteger(index) || index < 0 || index >= dimensionCount) continue
    if (typeof value !== "string") continue
    if ((RUBRIC_BANDS as readonly string[]).includes(value)) score[index] = value as RubricBand
  }
  return score
}

export interface SelfScoreSummary {
  scored: number
  total: number
  /** Names of the dimensions the learner put in the weakest band, in authored order. */
  weakest: string[]
  /** True once every dimension carries a band. */
  complete: boolean
}

/**
 * What to tell the learner about their own scoring.
 *
 * Deliberately does NOT compute a percentage or a grade. The useful output of this exercise is
 * "these two axes are where you are thin", not a number, and a number invites comparing yourself to
 * a past self on a scale you invented.
 */
export function summarizeSelfScore(
  dimensions: RubricDimension[],
  score: SelfScore
): SelfScoreSummary {
  const scored = dimensions.filter((_, index) => score[index] !== undefined).length
  return {
    scored,
    total: dimensions.length,
    weakest: dimensions.filter((_, index) => score[index] === "weak").map((d) => d.name),
    complete: scored === dimensions.length && dimensions.length > 0,
  }
}
