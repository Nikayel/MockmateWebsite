import { generateStructuredAIResponse } from "@/lib/ai/structured-output"
import { logger } from "@/lib/logger"
import type { ConversationTracker } from "@/lib/interview/interview-phases"
import { formatConversationForExtraction } from "./formatter"
import { mapExtractionToTrackerUpdates } from "./mapper"
import { EXTRACTION_PROMPT } from "./prompt"
import { EXTRACTION_JSON_EXAMPLE, extractionResultSchema } from "./schema"
import type {
  ConversationExtractionOptions,
  ExtendedConversationTracker,
  OptimalComplexityContext,
} from "./types"

export async function extractConversationState(
  recentMessages: Array<{ role: string; content: string }>,
  currentTracker: ConversationTracker,
  optimalComplexity?: OptimalComplexityContext,
  options: ConversationExtractionOptions = {}
): Promise<Partial<ExtendedConversationTracker>> {
  if (!recentMessages || recentMessages.length === 0) {
    return {}
  }

  const conversationText = formatConversationForExtraction(recentMessages)
  if (!conversationText) {
    return {}
  }

  try {
    const response = await generateStructuredAIResponse({
      systemPrompt: EXTRACTION_PROMPT,
      userMessage: conversationText,
      schema: extractionResultSchema,
      schemaName: "ConversationExtractionResult",
      jsonExample: EXTRACTION_JSON_EXAMPLE,
      complexity: "simple",
      temperature: 0.1,
      userId: options.userId || "system-extraction",
      sessionId: options.sessionId,
      maxParseAttempts: 2,
    })

    const updates = mapExtractionToTrackerUpdates(response.data, currentTracker, optimalComplexity)

    logger.info("[Extraction] Successfully extracted conversation state", {
      approachExplained: response.data.approachExplained,
      approachQuality: response.data.approachQuality,
      timeComplexity: response.data.dominantComplexity || response.data.timeComplexityValue,
      spaceComplexity: response.data.spaceComplexityValue,
      edgeCases: response.data.edgeCasesMentioned.length,
      clarifyingQuestions: response.data.clarifyingQuestionsAsked,
      questionsAnswered: response.data.answeredInterviewerQuestions,
      repaired: response.repaired,
      attempts: response.attempts,
      silentNotesAdded:
        (updates.silentNotes?.length || 0) - (currentTracker.silentNotes?.length || 0),
    })

    return updates
  } catch (error) {
    logger.error("[Extraction] Failed to extract conversation state", { error })
    return {}
  }
}
