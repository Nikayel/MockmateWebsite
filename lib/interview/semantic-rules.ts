/**
 * Semantic Rules - LLM-based validation rules
 *
 * These catch violations that regex can't reliably detect.
 * Used by: response-validation.ts (validateSemanticRules)
 */

export interface SemanticRule {
  id: string
  description: string
  examples: string[]
}

export const SEMANTIC_RULES: SemanticRule[] = [
  {
    id: "no-approach-in-clarification",
    description:
      "During CLARIFICATION phase, AI asks about approach/thinking/solution before user brings it up",
    examples: [
      "BAD: 'What's your thinking on how to solve this?'",
      "BAD: 'Before you start coding, I want to understand your approach'",
      "BAD: 'How are you thinking about solving this?'",
      "GOOD: 'Take your time reading. Any questions about the problem?'",
      "GOOD: 'Let me know if anything is unclear.'",
    ],
  },
  {
    id: "no-direct-correction",
    description: "AI corrects user's mistake directly instead of probing their reasoning",
    examples: [
      "BAD: 'Actually, it's O(n) not O(n²)'",
      "BAD: 'No, that approach is actually optimal'",
      "GOOD: 'Walk me through how you arrived at O(n²)'",
    ],
  },
  {
    id: "no-explaining-complexity",
    description: "AI explains complexity/approach instead of asking user to explain",
    examples: [
      "BAD: 'It's O(n²) because of the nested loops'",
      "BAD: 'The sort adds O(n log n) to your solution'",
      "GOOD: 'Where does that complexity come from?'",
    ],
  },
  {
    id: "no-revealing-approach",
    description: "AI reveals the solution approach instead of guiding with questions",
    examples: [
      "BAD: 'You should use a hash map here'",
      "BAD: 'The trick is to sort first, then use two pointers'",
      "GOOD: 'What data structure might help here?'",
    ],
  },
  {
    id: "no-validation-phrases",
    description: "AI validates/confirms correctness instead of staying neutral",
    examples: [
      "BAD: 'Nice, you've got the right idea'",
      "BAD: 'Perfect, that checks out'",
      "GOOD: 'Okay. Walk me through why.'",
    ],
  },
  {
    id: "no-teaching-edge-cases",
    description: "AI teaches the correct answer for edge cases instead of noting the mistake",
    examples: [
      "BAD: 'Actually, if you're at stair 0, there's one way to be there'",
      "BAD: 'The answer for zero should actually be 1'",
      "GOOD: 'Okay, noted. Anything else?'",
    ],
  },
  {
    id: "no-summarizing",
    description: "AI parrots/restates what user said instead of advancing the interview",
    examples: [
      "BAD: 'So you're saying you'd use a hash map'",
      "BAD: 'What I'm hearing is that you want to iterate twice'",
      "GOOD: 'Okay. What's the space complexity?'",
    ],
  },
]

/**
 * Build the semantic validation prompt for LLM
 */
export function buildSemanticValidationPrompt(response: string): string {
  const rulesText = SEMANTIC_RULES.map(
    (r) => `${r.id}: ${r.description}\n${r.examples.join("\n")}`
  ).join("\n\n")

  return `You are a response validator. Check if this interviewer response violates any rules.

RESPONSE TO CHECK:
"${response}"

RULES (violation = regenerate):
${rulesText}

Return JSON only:
{
  "violated": true/false,
  "rule": "rule-id or null",
  "evidence": "quote from response that violates, or null",
  "suggestion": "how to fix it, or null"
}

Be strict. If the AI is explaining instead of asking, that's a violation.`
}
