/**
 * Hint Generation Module
 *
 * LLM-first hint generation with fallback to pattern-based templates.
 * Generates progressive, contextual hints based on user's code and problem.
 */
import { runHintGraph } from "./graph"

import { generateHintId } from "./code-analyzer"
import type { HintGenerationRequest, HintGenerationResponse, GeneratedHint } from "./types"

// Re-export types for consumers
export * from "./types"
export { calculateStruggleLevel, getRecommendedRevealLevel } from "./struggle-calculator"

/**
 * Main hint generation function
 * LLM-first with fallback to pattern templates
 */
export async function generateHints(
  request: HintGenerationRequest
): Promise<HintGenerationResponse> {
  return runHintGraph(request)
}

/**
 * Get a single progressive hint (for "give me a hint" requests)
 */
export async function getNextHint(
  request: HintGenerationRequest,
  previousHintIds: string[]
): Promise<GeneratedHint | null> {
  const response = await generateHints(request)

  // Find the next unrevealed hint
  const nextHint = response.hints.find((h) => !previousHintIds.includes(h.id))

  if (!nextHint) {
    // All hints revealed, generate a more direct one
    return {
      id: generateHintId(),
      level: 4,
      category: "implementation",
      title: "Additional Guidance",
      content:
        "You've seen all available hints. Try reviewing them again, or consider breaking the problem into smaller subproblems. What's the simplest version of this problem you could solve?",
      isBlurred: true,
      source: "ai",
      relevanceScore: 0.5,
    }
  }

  return nextHint
}

/**
 * Singleton HintAgent class for backward compatibility
 */
class HintAgent {
  async generate(request: HintGenerationRequest): Promise<HintGenerationResponse> {
    return generateHints(request)
  }

  async getNext(
    request: HintGenerationRequest,
    previousHintIds: string[]
  ): Promise<GeneratedHint | null> {
    return getNextHint(request, previousHintIds)
  }
}

let hintAgentInstance: HintAgent | null = null

export function getHintAgent(): HintAgent {
  if (!hintAgentInstance) {
    hintAgentInstance = new HintAgent()
  }
  return hintAgentInstance
}
