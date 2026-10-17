import { generateAIResponse } from "@/lib/ai-providers"
import { validateSemanticRules } from "@/lib/interview/response-validation"
import { logger } from "@/lib/logger"
import type { ChatGenerationContext } from "./generation-context"

// Only the first three turns use the existing log-only semantic observer.
const SEMANTIC_VALIDATION_MAX_HISTORY = 6

export function observeSemanticRules(text: string, input: ChatGenerationContext): void {
  const { history, userId, signal } = input
  const { sessionId } = input.request
  // PERF-S1: semantic (LLM) validation runs OFF the critical path and only
  // for early messages, so it adds neither latency nor a per-message provider
  // call on the happy path. Log-only: it never regenerates or blocks.
  if (history.length <= SEMANTIC_VALIDATION_MAX_HISTORY) {
    void validateSemanticRules(text, async (system, user) => {
      const result = await generateAIResponse(system, user, [], {
        complexity: "simple",
        userId,
        sessionId,
        service: "interview-chat",
        abortSignal: signal,
        eventType: "chat_message",
      })
      return { text: result.text }
    })
      .then((semantic) => {
        if (semantic.violated) {
          logger.warn("[Hard Gates] Semantic violation observed (post-hoc, not regenerated)", {
            sessionId,
            rule: semantic.rule,
            evidence: semantic.evidence,
          })
        }
      })
      .catch((error) => {
        logger.warn("[Hard Gates] Post-hoc semantic validation failed", { error, sessionId })
      })
  }
}
