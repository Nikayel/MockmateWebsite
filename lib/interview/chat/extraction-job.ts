import type { ConversationTracker } from "@/lib/interview/interview-phases"
import type { ChatRequestContext } from "./request-context"
import { shouldRunExtraction } from "@/lib/interview/conversation-extraction"
import { getFlag } from "@/lib/feature-flags"
import { logger } from "@/lib/logger"

type ConversationTrackerWithExtraction = ConversationTracker & {
  lastExtractionAt?: number
}

export type ConversationExtractionJob = {
  sessionId?: string
  /** Real user behind the interview, so the extraction LLM call bills to them
   * instead of the reserved system identity. */
  userId?: string
  recentMessages: Array<{ role: string; content: string }>
  currentTracker: ConversationTracker
  messageCount: number
  lastExtractionAt: number
  currentMessage: string
  optimalComplexityContext?: {
    optimalTimeComplexity: string
    optimalSpaceComplexity: string
  }
}

export function prepareConversationExtraction(
  request: ChatRequestContext,
  userId: string | undefined
): ConversationExtractionJob | null {
  const {
    sessionContext,
    scenarioType,
    role,
    conversationTracker,
    context,
    message,
    sessionId,
    solutionComplexity,
  } = request
  const enableExtraction = !(sessionContext && scenarioType === "bugfix")
  const extractionJob: ConversationExtractionJob | null =
    enableExtraction && role === "interviewer" && conversationTracker && context && message
      ? {
          sessionId,
          userId,
          // The WHOLE conversation, not a tail. This job builds the
          // conversationTracker that `check_already_discussed` reads, so a
          // window here is what decides whether the interviewer knows it has
          // already asked something. At `.slice(-10)` a 43-message session on
          // 2026-08-22 re-probed one thread seven times: the tracker could
          // only see the last ten messages, and the earlier probes on that
          // same thread had fallen out of view.
          recentMessages: (context as Array<{ type: string; message: string }>).map((m) => ({
            role: m.type === "user" ? "candidate" : "interviewer",
            content: m.message,
          })),
          currentTracker: conversationTracker as unknown as ConversationTracker,
          messageCount: Array.isArray(context) ? context.length : 0,
          lastExtractionAt:
            (conversationTracker as unknown as ConversationTrackerWithExtraction)
              .lastExtractionAt || 0,
          currentMessage: message,
          optimalComplexityContext: solutionComplexity
            ? {
                optimalTimeComplexity: solutionComplexity.optimal || "O(n)",
                optimalSpaceComplexity: solutionComplexity.optimalSpace || "O(n)",
              }
            : undefined,
        }
      : null

  if (extractionJob) {
    if (getFlag("USE_EXTRACTION_SERVICE")) {
      logger.debug("[Chat API] Deferred extraction service until after response", { sessionId })
    } else if (
      shouldRunExtraction(
        extractionJob.messageCount,
        extractionJob.lastExtractionAt,
        extractionJob.currentMessage
      )
    ) {
      logger.debug("[Chat API] Deferred LLM extraction until after response", { sessionId })
    }
  }

  return extractionJob
}
