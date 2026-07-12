/**
 * Single source of truth for the interviewer's forbidden validation phrases.
 *
 * These are phrases that confirm correctness ("Nice", "Perfect", ...) which a
 * neutral evaluating interviewer must never use. Both the interviewer prompt
 * (lib/interview/interviewer-prompts.ts) and the response guardrail
 * (lib/interview/guardrails/response-guardrails.ts) derive from this list so the
 * rule cannot drift between the prompt and the runtime check.
 *
 * Order and wording are load-bearing: the interviewer prompt renders these
 * verbatim, so editing an entry changes live model-facing prompt text.
 */
export const FORBIDDEN_VALIDATION_PHRASES: string[] = [
  "Nice",
  "Good",
  "Perfect",
  "Exactly",
  "Correct",
  "Right",
  "That's right",
  "You've got it",
  "You've got the right idea",
  "You've got the logic down",
  "That checks out",
]
