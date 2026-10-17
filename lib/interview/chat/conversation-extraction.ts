import { getFlag } from "@/lib/feature-flags"
import { logger } from "@/lib/logger"
import { extractionService } from "@/lib/services/extraction-service"
import {
  shouldRunExtraction,
  extractConversationState,
} from "@/lib/interview/conversation-extraction"
import type { ConversationExtractionJob } from "./extraction-job"

export function runConversationExtractionAfterResponse(
  job: ConversationExtractionJob | null
): void {
  if (!job) return

  void (async () => {
    try {
      if (getFlag("USE_EXTRACTION_SERVICE")) {
        const result = await extractionService({
          messages: job.recentMessages,
          currentTracker: job.currentTracker,
          messageCount: job.messageCount,
          lastExtractionAt: job.lastExtractionAt,
          currentMessage: job.currentMessage,
          optimalComplexity: job.optimalComplexityContext,
          userId: job.userId,
          sessionId: job.sessionId,
        })

        if (result.didRun) {
          logger.info("[Chat API] Completed post-response extraction service job", {
            sessionId: job.sessionId,
            confidence: result.confidence,
            silentNotesCount: result.tracker.silentNotes?.length || 0,
          })
        }
        return
      }

      if (!shouldRunExtraction(job.messageCount, job.lastExtractionAt, job.currentMessage)) {
        return
      }

      const extractionUpdates = await extractConversationState(
        job.recentMessages,
        job.currentTracker,
        job.optimalComplexityContext,
        { userId: job.userId, sessionId: job.sessionId }
      )

      if (Object.keys(extractionUpdates).length > 0) {
        logger.info("[Chat API] Completed post-response LLM extraction job", {
          sessionId: job.sessionId,
          extractionUpdates,
          silentNotesCount: extractionUpdates.silentNotes?.length || 0,
        })
      }
    } catch (extractionError) {
      logger.warn("[Chat API] Post-response extraction failed", {
        sessionId: job.sessionId,
        error: extractionError,
      })
    }
  })()
}
