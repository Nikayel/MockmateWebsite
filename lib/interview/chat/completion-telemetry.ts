import type { AIResponse } from "@/lib/ai-providers"
import { trackAIChatServer } from "@/lib/analytics-server"
import { logger } from "@/lib/logger"
import type { ChatRequestContext } from "./request-context"

export function trackChatCompletion(
  request: ChatRequestContext,
  userId: string | undefined,
  aiResponse: AIResponse,
  responseTimeMs: number
): void {
  const { sessionId, role, message } = request
  // Track AI chat interaction with provider info
  if (sessionId) {
    trackAIChatServer({
      sessionId,
      userId,
      interactionType: role === "interviewer" ? "interviewer" : "partner",
      messageLength: message?.length || 0,
      responseTimeMs,
      provider: aiResponse.provider, // Track which provider was used
      // Measured provider-reported usage of the primary call (regeneration
      // retries are logged separately); omitted when the provider gave none.
      tokensIn: aiResponse.tokensIn,
      tokensOut: aiResponse.tokensOut,
    }).catch((err) => {
      // COST TRACKING: Log with high severity - costs won't be recorded if this fails
      logger.error("CRITICAL: Analytics tracking failed - usage costs may not be recorded", {
        error: err,
        sessionId,
        userId,
        provider: aiResponse.provider,
        // Include enough info to manually reconcile costs if needed
        tokensUsed: aiResponse.tokensUsed,
        latencyMs: aiResponse.latencyMs,
      })
    })
  }
}
