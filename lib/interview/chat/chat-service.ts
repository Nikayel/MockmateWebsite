import { registerResponseGeneration } from "@/lib/ai-response-feedback/generations"
import { shouldAcknowledgeWithReaction } from "../reactions/policy"
import { buildChatRequestContext, type ChatRequestData } from "./request-context"
import { checkChatTurnEligibility } from "./turn-eligibility"
import { resolveChatInterviewState } from "./interview-state"
import { buildChatModelInput } from "./model-input"
import { generateValidatedChatResponse } from "./generate-response"
import { prepareConversationExtraction } from "./extraction-job"
import { runConversationExtractionAfterResponse } from "./conversation-extraction"
import { trackChatCompletion } from "./completion-telemetry"
import type { ValidatedChatResponse } from "./validated-response-stream"
import type { EndedConversationResponse, ProactiveSkipResponse } from "./response-flow"

interface ChatExecutionContext {
  /** Always supplied by request authentication, never by the request body. */
  userId: string
  signal: AbortSignal
  startTime: number
}

export type ChatMessageResult =
  | { kind: "reply"; response: ValidatedChatResponse }
  | { kind: "early"; status: 400; body: { error: string } }
  | { kind: "early"; status: 200; body: EndedConversationResponse | ProactiveSkipResponse }

/** Orchestrates a validated turn; authentication and HTTP formatting stay in the route. */
export async function processChatMessage(
  validatedData: ChatRequestData,
  execution: ChatExecutionContext
): Promise<ChatMessageResult> {
  const { userId, signal, startTime } = execution
  const requestContext = buildChatRequestContext(validatedData)
  const early = await checkChatTurnEligibility(requestContext, userId, validatedData.ownerId)
  if (early) return { kind: "early", ...early }

  if (shouldAcknowledgeWithReaction(requestContext)) {
    signal?.throwIfAborted()
    return {
      kind: "reply",
      response: { reply: "", reaction: "acknowledged", provider: "local" },
    }
  }

  const generationId = crypto.randomUUID()
  requestContext.generationId = generationId

  // Prepared before generation, started afterward, and never awaited on the response path.
  const extractionJob = prepareConversationExtraction(requestContext, userId)
  const interviewState = resolveChatInterviewState(requestContext)
  const { currentPhase, phaseContext, currentCodeLen, starterLen } = interviewState
  const { systemPrompt, history, promptFlow } = await buildChatModelInput(
    requestContext,
    interviewState,
    validatedData,
    userId
  )
  if (promptFlow.earlyResponse)
    return { kind: "early", status: 200, body: promptFlow.earlyResponse }

  const aiResponse = await generateValidatedChatResponse({
    request: requestContext,
    userId,
    systemPrompt,
    fullUserMessage: promptFlow.fullUserMessage,
    history,
    currentPhase,
    signal,
  })
  const feedbackAvailable =
    Boolean(aiResponse.text.trim()) &&
    (await registerResponseGeneration({
      generationId,
      userId,
      kind: requestContext.role ?? "partner",
      sessionId: requestContext.sessionId,
      scenarioId: requestContext.scenarioId ?? requestContext.sessionContext?.task.id,
      outputs: [{ id: generationId, content: aiResponse.text }],
    }))
  trackChatCompletion(requestContext, userId, aiResponse, Date.now() - startTime)
  if (!signal?.aborted) runConversationExtractionAfterResponse(extractionJob)

  return {
    kind: "reply",
    response: {
      generationId,
      feedbackAvailable,
      reply: aiResponse.text,
      provider: aiResponse.provider,
      latencyMs: aiResponse.latencyMs,
      ...(aiResponse.action ? { action: aiResponse.action } : {}),
      ...(aiResponse.reaction ? { reaction: aiResponse.reaction } : {}),
      _debug: {
        phase: currentPhase,
        messageCount: requestContext.messageCount,
        approachExplained: phaseContext.approachExplained,
        currentCodeLength: currentCodeLen,
        starterCodeLength: starterLen,
        codeWritten: currentCodeLen - starterLen,
      },
    },
  }
}
