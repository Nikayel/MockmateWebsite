import { generateAIResponse, type TaskComplexity } from "@/lib/ai-providers"
import { logger } from "@/lib/logger"
import type { ChatGenerationContext } from "./generation-context"

export function createChatRegenerator(
  input: ChatGenerationContext
): (hint: string) => Promise<string> {
  const { request, systemPrompt, fullUserMessage, history, userId, currentPhase, signal } = input
  const { role, sessionId } = request
  const complexity: TaskComplexity = role == "interviewer" ? "dialogue" : "code"
  // Regeneration function for the retry loop
  const regenerate = async (hint: string): Promise<string> => {
    // Build a forceful correction prompt that REPLACES the original prompt
    const correctedPrompt = `${systemPrompt}

⚠️⚠️⚠️ CRITICAL VIOLATION - YOU MUST FIX THIS ⚠️⚠️⚠️

Your previous response violated interview rules and was REJECTED.

VIOLATION: ${hint}

YOU MUST generate a DIFFERENT response that follows the rules.

${
  currentPhase === "clarification"
    ? `
CLARIFICATION PHASE RULES:
- Do NOT ask about their approach, thinking, or plan
- Do NOT say "before you start coding" or "walk me through"
- ONLY say something like: "Take your time reading. Any questions about the problem?"
- Keep it SHORT (1-2 sentences max)
`
    : ""
}

Generate a compliant response NOW:`

    const regeneratedResponse = await generateAIResponse(
      correctedPrompt,
      fullUserMessage,
      history,
      {
        complexity,
        userId,
        sessionId,
        generationId: request.generationId,
        scenarioId: request.scenarioId,
        service: "interview-chat",
        abortSignal: signal,
        eventType: "chat_message",
        skipCache: true, // Regeneration must bypass the response cache
      }
    )

    // COST TRACKING: Log retry for cost monitoring
    // Each retry is a full AI call that adds to costs
    logger.warn("[Chat API] Response regenerated due to violation (adds to cost)", {
      sessionId,
      userId,
      retryReason: hint.substring(0, 100),
      provider: regeneratedResponse.provider,
      tokensUsed: regeneratedResponse.tokensUsed,
    })

    return regeneratedResponse.text
  }

  return regenerate
}
