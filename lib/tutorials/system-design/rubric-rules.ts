/**
 * What a rubric dimension has to be to be worth reading.
 *
 * ## The failure mode this exists to stop
 *
 * A rubric is only useful if a learner can decide which band they are in by looking at their own
 * text. The natural way to write one is as advice — "should consider replication lag", "make sure to
 * discuss failure modes" — and advice is unusable for that: it tells you what to do next, not what
 * you did. Faced with three bands of advice, a learner picks the middle one every time, and the
 * exercise degrades into a checkbox.
 *
 * So the bands must be written as descriptions of an ANSWER, in the past or present tense:
 * "does not mention replication lag at all" / "names it but does not quantify" / "quantifies the lag
 * and states what the client sees during it". That is checkable. Advice is not.
 *
 * These rules are separated from their corpus test for the same reason the genre rules are: a corpus
 * test on a corpus with no rubrics passes whether the rules are sharp or vacuous.
 */
import type { RubricDimension } from "@/lib/tutorials/types"

/** Fewer than this and the rubric is not localising anything; more and it is a grading form. */
export const MIN_DIMENSIONS = 3
export const MAX_DIMENSIONS = 5

/** A band shorter than this cannot distinguish itself from its neighbours. */
export const MIN_BAND_CHARS = 24
/** A band longer than this is a model answer hiding in a table cell. */
export const MAX_BAND_CHARS = 220

/** A dimension name longer than this has stopped being an axis and started being a sentence. */
export const MAX_NAME_CHARS = 44

/**
 * Openings that mean the band is telling the learner what to do rather than describing what they
 * wrote. Matched at the START of the band only: "the answer should be quantified" is a description
 * and is fine, while "Should quantify the lag" is an instruction.
 */
const ADVICE_OPENERS = [
  "should",
  "consider",
  "make sure",
  "try to",
  "remember to",
  "be sure to",
  "you should",
  "aim to",
  "ensure you",
  "think about",
  "discuss",
  "explain",
  "mention",
  "include",
  "describe",
  "identify",
]

/**
 * Matches the IMPERATIVE form only.
 *
 * The third-person form of the same verb is the descriptive voice this module is trying to
 * encourage: "Describes only the healthy path" and "Mentions replication lag without quantifying it"
 * are model answers of the band, not instructions. An earlier draft also matched `${opener}s ` and
 * flagged both, which would have pushed authors into contorted phrasings to appease the rule — the
 * precise way a guard turns into an obstacle. Test `does not flag a description that merely contains
 * an advice word` pins the distinction.
 */
function isAdvice(band: string): boolean {
  const opening = band.trim().toLowerCase()
  return ADVICE_OPENERS.some((opener) => opening === opener || opening.startsWith(`${opener} `))
}

/** Every way this rubric is broken, as human-readable strings. Empty means sound. */
export function auditRubric(dimensions: RubricDimension[] | undefined): string[] {
  if (!dimensions) return []
  const problems: string[] = []

  if (dimensions.length < MIN_DIMENSIONS)
    problems.push(`${dimensions.length} dimensions, under the ${MIN_DIMENSIONS} minimum`)
  if (dimensions.length > MAX_DIMENSIONS)
    problems.push(`${dimensions.length} dimensions, over the ${MAX_DIMENSIONS} cap`)

  const names = new Set<string>()
  for (const dimension of dimensions) {
    const name = dimension.name.trim()
    if (name.length === 0) problems.push("a dimension has no name")
    else if (name.length > MAX_NAME_CHARS)
      problems.push(`"${name}" is ${name.length} chars, over the ${MAX_NAME_CHARS} cap`)
    if (names.has(name.toLowerCase())) problems.push(`duplicate dimension "${name}"`)
    names.add(name.toLowerCase())

    const bands = { weak: dimension.weak, adequate: dimension.adequate, strong: dimension.strong }
    for (const [band, text] of Object.entries(bands)) {
      const trimmed = text.trim()
      if (trimmed.length < MIN_BAND_CHARS)
        problems.push(`"${name}" ${band} band is ${trimmed.length} chars, under ${MIN_BAND_CHARS}`)
      else if (trimmed.length > MAX_BAND_CHARS)
        problems.push(`"${name}" ${band} band is ${trimmed.length} chars, over ${MAX_BAND_CHARS}`)
      if (isAdvice(trimmed))
        // The defect this module exists for: three bands of advice are three ways of saying the
        // same thing, and the learner cannot tell which one describes their answer.
        problems.push(`"${name}" ${band} band is advice, not a description of an answer`)
    }

    const distinct = new Set(
      [dimension.weak, dimension.adequate, dimension.strong].map((b) => b.trim().toLowerCase())
    )
    if (distinct.size < 3) problems.push(`"${name}" has bands that repeat each other`)
  }

  return problems
}
