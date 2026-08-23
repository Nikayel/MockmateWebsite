/**
 * Hint Generation Module
 *
 * LLM-first hint generation with fallback to pattern-based templates.
 * Generates progressive, contextual hints based on user's code and problem.
 */
import { runHintGraph } from "./graph"

import { generateHintId } from "./code-analyzer"
import type {
  HintGenerationRequest,
  HintGenerationResponse,
  GeneratedHint,
  HintLevel,
} from "./types"

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

/** The deepest rung the ladder goes to. */
export const MAX_HINT_LEVEL: HintLevel = 4

/**
 * Get the best hint at a specific level, from a batch generated against the
 * candidate's CURRENT state.
 *
 * Level, not id, is the unit of progression. Hints cannot be generated once and
 * revealed later, because their whole value is being tailored to the code in
 * front of the candidate right now - so every call regenerates. That makes ids
 * useless for tracking progress: `generateHintId()` returns
 * `hint_${Date.now()}_${random}`, so an id from an earlier batch can never
 * appear in a later one. Level survives regeneration because it is semantic.
 *
 * A batch does not always contain the level asked for. `finalizeHints` dedupes
 * by title and caps at 8 hints, so a run can skip a rung entirely. Rather than
 * return nothing and leave the caller with no move, this climbs to the next
 * level that does exist. It never descends: a candidate who has seen rung 2
 * must not be handed rung 1 as though it were progress.
 */
export async function getHintAtLevel(
  request: HintGenerationRequest,
  level: HintLevel
): Promise<GeneratedHint | null> {
  const response = await generateHints(request)
  if (response.hints.length === 0) return null

  // Within a level, prefer the most relevant. finalizeHints already sorts by
  // level then relevance, so the first match at a level is the best one.
  for (let candidate = level; candidate <= MAX_HINT_LEVEL; candidate++) {
    const hint = response.hints.find((h) => h.level === candidate)
    if (hint) return hint
  }

  return null
}

/**
 * Get the next hint in the ladder.
 *
 * `highestRevealedLevel` is what drives escalation. `previousHintIds` is
 * accepted for older callers and used only as a fallback count; see the note on
 * GetNextHintPayload for why matching on it never worked.
 */
export async function getNextHint(
  request: HintGenerationRequest,
  previousHintIds: string[],
  highestRevealedLevel?: HintLevel
): Promise<GeneratedHint | null> {
  const revealed =
    highestRevealedLevel ??
    // Fallback for callers that only track ids. Their count is a weaker signal
    // than a level (a batch can hold several hints at one rung), but it still
    // escalates, which id-matching never did.
    (Math.min(previousHintIds.length, MAX_HINT_LEVEL) as HintLevel)

  if (revealed >= MAX_HINT_LEVEL) {
    return {
      id: generateHintId(),
      level: MAX_HINT_LEVEL,
      category: "implementation",
      title: "Additional Guidance",
      content:
        "You've seen all available hints. Try reviewing them again, or consider breaking the problem into smaller subproblems. What's the simplest version of this problem you could solve?",
      isBlurred: true,
      source: "ai",
      relevanceScore: 0.5,
    }
  }

  return getHintAtLevel(request, (revealed + 1) as HintLevel)
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
