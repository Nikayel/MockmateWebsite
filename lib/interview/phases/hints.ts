import type { HintLevel } from "./types"

export const HINT_PROGRESSION: HintLevel[] = [
  {
    level: 1,
    type: "leading_question",
    description: "Ask a question that points toward the issue without revealing it",
  },
  {
    level: 2,
    type: "concrete_example",
    description: "Walk through a specific input that exposes the problem",
  },
  {
    level: 3,
    type: "direct_nudge",
    description: "Suggest the general direction (data structure, technique)",
  },
  {
    level: 4,
    type: "explicit_help",
    description: "Give specific guidance (only if running out of time)",
  },
]

export function getHintGuidance(hintsGiven: number): string {
  const currentLevel = Math.min(hintsGiven + 1, 4)
  const hint = HINT_PROGRESSION[currentLevel - 1]

  return `
HINT GUIDANCE (You've given ${hintsGiven} hints so far):
Current hint level: ${currentLevel}/4 - ${hint.type}
Strategy: ${hint.description}

${currentLevel === 1 ? `EXAMPLE: "Have you thought about what happens when the input is empty?"` : ""}
${currentLevel === 2 ? `EXAMPLE: "Let's trace through with input [2,7] and target 9 - what happens at each step?"` : ""}
${currentLevel === 3 ? `EXAMPLE: "Think about what data structure gives you O(1) lookups"` : ""}
${currentLevel === 4 ? `EXAMPLE: "Consider using a hash map to store values you've seen"` : ""}
`
}
