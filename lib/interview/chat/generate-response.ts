import {
  executePartnerHandoff,
  getPartnerHandoffTools,
  PARTNER_HANDOFF_GUIDANCE,
} from "../partner-handoff/tool"
import { PARTNER_HANDOFF_REPLY } from "../partner-handoff/contract"
import { tracePartnerHandoff } from "../partner-handoff/tracing"
import { generateAIResponse, type TaskComplexity } from "@/lib/ai-providers"
import { providerForPhase } from "@/lib/interview/interview-phases"
import { logger } from "@/lib/logger"
import type { ChatGenerationContext } from "./generation-context"
import { observeChatResponse } from "./response-observer"
import { validateChatResponse } from "./response-validation"

export async function generateValidatedChatResponse(input: ChatGenerationContext) {
  const {
    request: { role, sessionId },
    systemPrompt,
    fullUserMessage,
    history,
    currentPhase,
    userId,
    signal,
  } = input
  // Determine task complexity for provider selection
  const complexity: TaskComplexity = role == "interviewer" ? "dialogue" : "code"

  // Reasoning effort follows the PHASE, not just the capability. Both
  // capabilities here run at `low`, which is right while the candidate is
  // orienting and wrong once the interviewer has to judge whether a proposed
  // approach actually works. `preferredProvider` PREPENDS to the capability's
  // chain, so this changes effort only: the vendor order, the retries and the
  // degradation to DeepSeek then Gemini are all unchanged, and if OpenAI is
  // unconfigured the provider is disabled and filtered out.
  const preferredProvider = providerForPhase(currentPhase)

  // DEBUG: Log prompt sizes to identify latency source
  const historyChars = history.reduce((sum, h) => sum + h.content.length, 0)
  logger.info("[Chat API] Prompt size debug", {
    systemPromptChars: systemPrompt.length,
    userMessageChars: fullUserMessage.length,
    historyMessages: history.length,
    historyChars,
    totalEstimatedChars: systemPrompt.length + fullUserMessage.length + historyChars,
    estimatedTokens: Math.ceil((systemPrompt.length + fullUserMessage.length + historyChars) / 4),
  })

  // Use AI provider abstraction with fallback
  // Pass userId/sessionId for proper cost tracking
  const tools = getPartnerHandoffTools(input.request)
  const generate = async () => {
    const aiResponse = await generateAIResponse(
      systemPrompt + (tools ? PARTNER_HANDOFF_GUIDANCE : ""),
      fullUserMessage,
      history,
      {
        complexity,
        preferredProvider,
        userId,
        sessionId,
        service: "interview-chat",
        abortSignal: signal,
        eventType: "chat_message",
        ...(tools ? { tools } : {}),
      }
    )
    if (tools) signal?.throwIfAborted()
    const action = await executePartnerHandoff(aiResponse.toolCalls, input.request)
    if (action) return { ...aiResponse, text: PARTNER_HANDOFF_REPLY, action }
    if (!aiResponse.text.trim())
      throw new Error("The interviewer returned no valid reply or handoff")
    return { ...aiResponse, action: undefined }
  }
  const aiResponse = tools
    ? await tracePartnerHandoff(generate, { sessionId, phase: currentPhase })
    : await generate()
  if (aiResponse.action) return aiResponse

  observeChatResponse(aiResponse.text, input.request)
  await validateChatResponse(aiResponse, input)
  return aiResponse
}
