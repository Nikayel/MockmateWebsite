import type { AIResponse } from "@/lib/ai-providers"
import type { ConversationTracker } from "@/lib/interview/interview-phases"
import { validateWithRegexRetry, type ValidationContext } from "@/lib/interview/response-validation"
import { logger } from "@/lib/logger"
import type { ChatGenerationContext } from "./generation-context"
import { createChatRegenerator } from "./response-regeneration"
import { observeSemanticRules } from "./semantic-observer"

export async function validateChatResponse(
  aiResponse: AIResponse,
  input: ChatGenerationContext
): Promise<void> {
  const { request, currentPhase } = input
  const { role, sessionId, message, conversationTracker, hasSubmitted, solutionComplexity } =
    request
  // HARD GATES: Deterministic validation with retry loop
  // This catches rule violations that prompt engineering alone can't prevent
  // Gates are deterministic (not AI) - they always catch specific patterns
  if (role === "interviewer") {
    const activeTracker = conversationTracker as unknown as ConversationTracker | undefined

    const validationContext: ValidationContext = {
      response: aiResponse.text,
      phase: currentPhase,
      tracker: activeTracker,
      hasSubmitted: hasSubmitted || false,
      lastUserMessage: message,
      isOptimalSolution: solutionComplexity?.isOptimal || false,
    }

    // DEBUG: Log validation context
    logger.info("[Hard Gates] Validation context", {
      sessionId,
      phase: currentPhase,
      responsePreview: aiResponse.text.substring(0, 100),
    })

    const regenerate = createChatRegenerator(input)

    // Run REGEX-ONLY validation with up to 2 retries for critical violations.
    // PERF-S1: the semantic LLM check used to run here on the blocking path (a
    // second provider call per message, multiplied across retries — up to 5+
    // calls for a flagged message). Regex hard gates stay synchronous; semantic
    // validation now runs fire-and-forget below.
    const gateResult = await validateWithRegexRetry(validationContext, regenerate, 2)

    // Update response if regenerated
    if (gateResult.retries > 0) {
      aiResponse.text = gateResult.response
      logger.info("[Hard Gates] Response regenerated", {
        sessionId,
        retries: gateResult.retries,
        remainingViolations: gateResult.violations.map((v) => v.rule),
      })
    }

    // Log any remaining violations (warnings that didn't trigger regeneration)
    if (gateResult.violations.length > 0) {
      logger.warn("[Hard Gates] Violations in final response", {
        sessionId,
        violations: gateResult.violations.map((v) => ({
          rule: v.rule,
          severity: v.severity,
        })),
      })
    }

    observeSemanticRules(aiResponse.text, input)
  }
}
