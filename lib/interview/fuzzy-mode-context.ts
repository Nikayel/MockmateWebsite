/**
 * Fuzzy Mode Context Builder
 *
 * DRY helper that builds interviewer context FROM scenario clarifying questions.
 * This is the ONLY place that converts clarifyingQuestions → interviewer context.
 *
 * Single source of truth: scenario files define the questions, this function
 * formats them for the interviewer AI.
 */

import type { ClarifyingQuestion } from "@/lib/scenarios/types"

/**
 * Build fuzzy mode context for the interviewer from scenario clarifying questions
 *
 * @param clarifyingQuestions - Array of clarifying questions from the scenario
 * @param fuzzyStatement - The vague problem statement (optional, for context)
 * @returns Formatted context string for the interviewer AI prompt
 */
export function buildFuzzyModeContext(
  clarifyingQuestions: ClarifyingQuestion[] | undefined,
  fuzzyStatement: string | undefined
): string {
  if (!clarifyingQuestions?.length || !fuzzyStatement) {
    return ""
  }

  // Group by required vs optional
  const required = clarifyingQuestions.filter((q) => q.required)
  const optional = clarifyingQuestions.filter((q) => !q.required)

  // Build vague aspects from clarifying questions (derive, don't duplicate!)
  const vagueAspects = clarifyingQuestions
    .map((q) => `- ${q.topic || "Question"}: ${q.answer}`)
    .join("\n")

  return `
═══════════════════════════════════════════════════════════════
🎯 REAL INTERVIEW MODE ACTIVE
═══════════════════════════════════════════════════════════════
The problem statement is intentionally VAGUE. The candidate should ask clarifying questions.

ASPECTS THAT ARE INTENTIONALLY VAGUE (${required.length} required to clarify):
${vagueAspects}

YOUR ROLE:
1. When candidate asks about any of these aspects, answer naturally using the context above
2. DO NOT volunteer this information - wait for them to ask
3. If they start coding without clarifying required aspects, note it internally but let them proceed
4. Adapt your answer to how they phrase the question - match their terminology
5. Be encouraging when they ask good questions - it's a positive signal

SCORING: Candidates who ask good clarifying questions will get credit for it in feedback.
═══════════════════════════════════════════════════════════════
`
}
