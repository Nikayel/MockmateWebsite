import type { SilentNote, SilentNoteType } from "@/lib/interview/interview-phases"
import type { ProblemContext } from "./transcript-analysis-types"

/**
 * The semantic mistake-detection prompt, shared by both transcript analyzers.
 *
 * transcript-analysis.ts (Node) and transcript-analysis-edge.ts (Edge) carried
 * byte-similar copies of this prompt and of the JSON parsing that follows it.
 * The runtime split is real; the prompt is not runtime-specific, and a scoring
 * instruction that exists in two places is a scoring instruction that will
 * eventually mean two things. The types file next to this one was extracted for
 * exactly this reason, and this is the same class of duplication one layer up.
 */

/** Transcript characters sent to the model. */
const MAX_TRANSCRIPT_CHARS = 6000

/**
 * Code characters sent to the model.
 *
 * Smaller than the transcript budget on purpose: an interview solution is tens
 * of lines, and anything much larger is pasted boilerplate that would crowd out
 * the conversation this prompt is actually about.
 */
const MAX_CODE_CHARS = 2500

export interface SemanticPromptOptions {
  transcriptText: string
  problemContext: ProblemContext
  existingNotes: Array<{ type: SilentNoteType }>
}

/**
 * Build the analysis prompt.
 *
 * The complexity instruction is CONDITIONAL on having the code. Without it the
 * prompt previously still asked for "stated O(x) but actual is O(y)" while
 * providing no way to determine the actual, which invites the model to either
 * invent a verdict or restate the overclaim-vs-optimal comparison that
 * `buildComplexitySilentNotes` already makes deterministically and correctly.
 */
export function buildSemanticAnalysisPrompt({
  transcriptText,
  problemContext,
  existingNotes,
}: SemanticPromptOptions): string {
  const existingTypes = existingNotes.map((n) => n.type).join(", ")
  const code = problemContext.candidateCode?.trim()
  const hasCode = !!code

  const codeSection = hasCode
    ? `

CANDIDATE'S FINAL CODE:
\`\`\`
${code.substring(0, MAX_CODE_CHARS)}
\`\`\``
    : ""

  // Only ask for the comparison the model can actually perform.
  const complexityRule = hasCode
    ? `1. Complexity claims that do not match THE CODE ABOVE. Analyse what the code
   actually does, then compare it to what the candidate said. Flag only a clear
   mismatch, for example claiming O(n) for a nested scan over the input.
   Judge the code as written, NOT against the optimal solution: a candidate who
   writes a suboptimal solution and describes its cost accurately is CORRECT and
   must not be flagged. Ignore constant factors and lower-order terms.`
    : `1. Complexity claims the transcript itself contradicts (the candidate stated
   two different complexities for the same approach, or their own description of
   the algorithm does not match the complexity they gave it). The code is NOT
   available, so do NOT guess at what it does.`

  return `Analyze this technical interview transcript for UNCORRECTED mistakes.

PROBLEM: ${problemContext.title}
OPTIMAL TIME COMPLEXITY: ${problemContext.optimalTimeComplexity}
OPTIMAL SPACE COMPLEXITY: ${problemContext.optimalSpaceComplexity}
CRITICAL EDGE CASES: ${problemContext.criticalEdgeCases.join(", ")}${codeSection}

Already detected: ${existingTypes || "none"}

TRANSCRIPT:
${transcriptText.substring(0, MAX_TRANSCRIPT_CHARS)}

Find mistakes the CANDIDATE made that the INTERVIEWER did NOT correct. Only include:
${complexityRule}
2. Wrong edge case handling (said X happens, but Y happens)
3. Claiming solution is optimal when it's not
4. Confusing different approaches or data structures
5. Incomplete/vague answers that weren't probed

DO NOT include:
- Mistakes the interviewer already corrected
- Types already detected: ${existingTypes}
- Stylistic preferences
- Minor clarifications
- Anything you are not confident about. An empty array is a better answer than a
  guess: every item here becomes a recorded mistake against a real candidate.

Return JSON array (max 3 items):
[
  {
    "type": "wrong_complexity|wrong_edge_case|missed_edge_case|wrong_optimality|confused_approach|incomplete_answer",
    "userSaid": "exact quote or close paraphrase (max 100 chars)",
    "correct": "what the correct answer would be",
    "context": "brief context"
  }
]

If no uncorrected mistakes found, return empty array: []`
}

/** The note types the prompt is allowed to return. */
const VALID_NOTE_TYPES: readonly SilentNoteType[] = [
  "wrong_complexity",
  "wrong_edge_case",
  "missed_edge_case",
  "wrong_optimality",
  "confused_approach",
  "incomplete_answer",
]

/** Matches the prompt's own cap, so a verbose model cannot inflate the count. */
const MAX_NOTES = 3

/**
 * Parse the model's reply into silent notes.
 *
 * Returns [] on anything malformed rather than throwing: a scoring input that
 * cannot be read is a reason to record no mistake, never a reason to fail the
 * feedback the candidate is waiting for.
 *
 * `timestampMs` is injected so callers stay testable without faking the clock.
 */
export function parseSemanticAnalysisResponse(text: string, timestampMs: number): SilentNote[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const notes: SilentNote[] = []
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue
    const item = raw as Record<string, unknown>
    const type = item.type

    // An unrecognised type would otherwise be cast straight through and land in
    // the tracker as a mistake nothing downstream knows how to render.
    if (typeof type !== "string" || !VALID_NOTE_TYPES.includes(type as SilentNoteType)) continue

    notes.push({
      type: type as SilentNoteType,
      timestamp: timestampMs,
      userSaid: typeof item.userSaid === "string" ? item.userSaid : "",
      correct: typeof item.correct === "string" ? item.correct : undefined,
      context: typeof item.context === "string" ? item.context : undefined,
    })
    if (notes.length >= MAX_NOTES) break
  }
  return notes
}
