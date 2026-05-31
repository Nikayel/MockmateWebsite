import type { ConversationTracker, SilentNote } from "@/lib/interview/interview-phases"
import { logger } from "@/lib/logger"
import { getComplexityRank } from "@/lib/interview/shared-patterns"
import type { ExtractionResult, OptimalComplexityContext } from "./types"

export function buildComplexitySilentNotes(
  extracted: ExtractionResult,
  currentTracker: ConversationTracker,
  optimalComplexity?: OptimalComplexityContext
): SilentNote[] | undefined {
  if (!optimalComplexity) {
    return undefined
  }

  const silentNotes: SilentNote[] = [...(currentTracker.silentNotes || [])]
  const existingNoteTypes = new Set(silentNotes.map((note) => `${note.type}:${note.context}`))

  if (extracted.timeComplexityValue && optimalComplexity.optimalTimeComplexity) {
    const statedTimeRank = getComplexityRank(extracted.timeComplexityValue)
    const optimalTimeRank = getComplexityRank(optimalComplexity.optimalTimeComplexity)

    if (statedTimeRank !== -1 && optimalTimeRank !== -1 && statedTimeRank < optimalTimeRank - 1) {
      const noteKey = "wrong_complexity:time complexity"
      if (!existingNoteTypes.has(noteKey)) {
        silentNotes.push({
          type: "wrong_complexity",
          timestamp: Date.now(),
          userSaid: `Stated time complexity as ${extracted.timeComplexityValue}`,
          correct: `Time complexity is ${optimalComplexity.optimalTimeComplexity}`,
          context: "time complexity",
        })
        logger.info("[Extraction] Detected wrong time complexity claim", {
          stated: extracted.timeComplexityValue,
          actual: optimalComplexity.optimalTimeComplexity,
        })
      }
    }
  }

  if (extracted.spaceComplexityValue && optimalComplexity.optimalSpaceComplexity) {
    const statedSpaceRank = getComplexityRank(extracted.spaceComplexityValue)
    const optimalSpaceRank = getComplexityRank(optimalComplexity.optimalSpaceComplexity)

    if (
      statedSpaceRank !== -1 &&
      optimalSpaceRank !== -1 &&
      statedSpaceRank < optimalSpaceRank - 1
    ) {
      const noteKey = "wrong_complexity:space complexity"
      if (!existingNoteTypes.has(noteKey)) {
        silentNotes.push({
          type: "wrong_complexity",
          timestamp: Date.now(),
          userSaid: `Stated space complexity as ${extracted.spaceComplexityValue}`,
          correct: `Space complexity is ${optimalComplexity.optimalSpaceComplexity}`,
          context: "space complexity",
        })
        logger.info("[Extraction] Detected wrong space complexity claim", {
          stated: extracted.spaceComplexityValue,
          actual: optimalComplexity.optimalSpaceComplexity,
        })
      }
    }
  }

  return silentNotes.length > (currentTracker.silentNotes?.length || 0) ? silentNotes : undefined
}
