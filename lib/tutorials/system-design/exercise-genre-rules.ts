/**
 * What a supplied-artifact exercise has to satisfy to be worth authoring.
 *
 * ## Why these rules live in a module instead of inside the test
 *
 * The corpus test that applies them runs against 416 real exercises, so on a green corpus it proves
 * only that nothing is broken right now — it cannot show that the rules would CATCH anything. The
 * rules being importable means `exercise-genre-rules.test.ts` can feed each one a synthetic exercise
 * carrying exactly the defect it targets and assert it is reported. That is the difference between a
 * guard and a comment, and this repo has been bitten by the difference (see the one-sided
 * correct-answer-length gate in `curriculumfixesbacklog.md`, which measured the wrong thing twice
 * and moved a number without moving the tell).
 *
 * Every rule below exists because a critique or diagnosis exercise fails SILENTLY. If the supplied
 * design announces its own defect, the learner reads the sentence back, the exercise scores as
 * complete, and nothing anywhere reports that it stopped being hard.
 */
import type { DesignExercise } from "@/lib/tutorials/types"

/** An artifact shorter than this has nothing in it to find. */
export const MIN_ARTIFACT_CHARS = 240
/** An artifact longer than this is a reading-comprehension test wearing a design exercise's clothes. */
export const MAX_ARTIFACT_CHARS = 3600
/** A label longer than this stops being a label and starts being the prompt. */
export const MAX_LABEL_CHARS = 48

/**
 * Phrases that state a conclusion the learner is supposed to reach.
 *
 * Deliberately narrow. An incident artifact SHOULD say "p99 climbed to 4s" and "the error rate
 * tripled": those are observations, and observations are the material of a diagnosis. What it must
 * not do is say which observation is the cause. Everything below is a verdict, not an observation.
 */
export const VERDICT_PHRASES = [
  "the problem is",
  "the problem here is",
  "the bug is",
  "the flaw is",
  "the flaw in",
  "the root cause",
  "this is wrong",
  "this is incorrect",
  "the mistake is",
  "which is wrong because",
  "this will fail because",
  "this breaks because",
  "should instead",
  "the fix is",
] as const

/** The first verdict phrase in `text`, or null. */
export function findVerdict(text: string): string | null {
  const lower = text.toLowerCase()
  return VERDICT_PHRASES.find((phrase) => lower.includes(phrase)) ?? null
}

/**
 * Tokens specific enough that finding one in both the artifact and the model answer means the answer
 * is talking about THIS artifact: proper nouns (Postgres, DynamoDB) and quantities (4s, 12GB, 500ms).
 */
export function distinctiveTokens(text: string): Set<string> {
  const tokens = new Set<string>()
  for (const match of text.matchAll(/\b[A-Z][A-Za-z0-9]{3,}\b/g)) tokens.add(match[0].toLowerCase())
  for (const match of text.matchAll(/\b\d[\d.,]*\s?(ms|s|m|h|kb|mb|gb|tb|qps|rps|%)\b/gi))
    tokens.add(match[0].toLowerCase().replace(/\s+/g, ""))
  return tokens
}

/** Words that mean the prompt has pointed the learner at the artifact panel. */
const REFERENCE_WORDS = ["below", "above", "supplied", "shown", "attached", "opposite"]

/**
 * Every way this exercise's artifact is broken, as human-readable strings. Empty means sound.
 *
 * Returns ALL violations rather than the first, because an authoring agent fixing them one run at a
 * time will otherwise take one round trip per defect.
 */
export function auditSuppliedExercise(exercise: DesignExercise): string[] {
  const supplied = exercise.supplied
  if (!supplied) return []
  const problems: string[] = []
  const body = supplied.body.trim()

  if (supplied.label.trim().length === 0) problems.push("artifact has no label")
  else if (supplied.label.length > MAX_LABEL_CHARS)
    problems.push(`label is ${supplied.label.length} chars, over the ${MAX_LABEL_CHARS} cap`)

  if (body.length < MIN_ARTIFACT_CHARS)
    problems.push(`artifact is ${body.length} chars, under the ${MIN_ARTIFACT_CHARS} minimum`)
  else if (body.length > MAX_ARTIFACT_CHARS)
    problems.push(`artifact is ${body.length} chars, over the ${MAX_ARTIFACT_CHARS} cap`)

  const bodyVerdict = findVerdict(supplied.body)
  if (bodyVerdict) problems.push(`artifact states the verdict: "${bodyVerdict}"`)

  const promptVerdict = findVerdict(exercise.prompt)
  // Moving the giveaway from the artifact up into the prompt is not a fix.
  if (promptVerdict) problems.push(`prompt states the verdict: "${promptVerdict}"`)

  const starter = exercise.starterAnswer?.trim()
  if (starter && (starter.includes(body.slice(0, 120)) || body.includes(starter.slice(0, 120))))
    problems.push("artifact is duplicated into the editable starterAnswer")

  if (/^design\b/i.test(exercise.prompt.trim()))
    // "Design a rate limiter" plus a supplied design is two exercises stapled together, and the
    // learner will answer the one that does not require reading.
    problems.push("prompt asks for a design from scratch while also supplying one")

  const prompt = exercise.prompt.toLowerCase()
  const label = supplied.label.toLowerCase()
  if (!REFERENCE_WORDS.some((word) => prompt.includes(word)) && !prompt.includes(label))
    problems.push("prompt never points at the artifact, so it reads as broken copy")

  const artifactTokens = distinctiveTokens(supplied.body)
  if (artifactTokens.size > 0) {
    const answerTokens = distinctiveTokens(exercise.modelAnswerOutline.join("\n"))
    let shared = false
    for (const token of artifactTokens) if (answerTokens.has(token)) shared = true
    // A critique whose model answer never names anything in the design under review is a generic
    // essay with an artifact bolted on, which is the cheapest way to fake this ticket.
    if (!shared) problems.push("model answer never names anything in the artifact")
  }

  return problems
}
