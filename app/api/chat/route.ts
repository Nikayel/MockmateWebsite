import { NextRequest, NextResponse } from "next/server"
import { enforceMeteredAiRequest } from "@/lib/ai/metered-request"
import { logger } from "@/lib/logger"
import { chatRequestSchema } from "@/lib/interview/chat-request-schema"
import { claimProactiveNudge } from "@/lib/interview/session-lifecycle/server"
import { getInterviewerTurns } from "@/lib/interview/conversation-pacing"
import { buildChatRequestContext } from "@/lib/interview/chat/request-context"
import { buildProactiveSkipResponse } from "@/lib/interview/chat/response-flow"
import { resolveChatInterviewState } from "@/lib/interview/chat/interview-state"
import { buildChatModelInput } from "@/lib/interview/chat/model-input"
import { generateValidatedChatResponse } from "@/lib/interview/chat/generate-response"
import { prepareConversationExtraction } from "@/lib/interview/chat/extraction-job"
import { runConversationExtractionAfterResponse } from "@/lib/interview/chat/conversation-extraction"
import { trackChatCompletion } from "@/lib/interview/chat/completion-telemetry"
import { createValidatedChatStream } from "@/lib/interview/chat/validated-response-stream"

export async function POST(request: NextRequest) {
  // Authenticate and charge this submitted action once; provider calls meter their own work.
  const metered = await enforceMeteredAiRequest(request, {
    policy: "chat",
  })
  if (metered.response) {
    return metered.response
  }
  const { userId: rateLimitUserId } = metered

  const startTime = Date.now()

  try {
    // Parse and validate request body with Zod schema
    const rawBody = await request.json()
    if (new TextEncoder().encode(JSON.stringify(rawBody)).byteLength > 1_000_000) {
      return NextResponse.json(
        {
          error:
            "This session context is too large to send safely. Your saved history is preserved.",
        },
        { status: 413 }
      )
    }
    const parseResult = chatRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      logger.warn("[Chat API] Invalid request body", {
        errors: parseResult.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      })
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.errors.map((e) => e.message) },
        { status: 400 }
      )
    }

    const requestContext = buildChatRequestContext(parseResult.data)
    const {
      sessionContext,
      message,
      responseMode,
      context,
      role,
      isProactive,
      sessionId,
      timeSinceLastMessage,
      messageCount,
    } = requestContext

    // SECURITY: attribute cost/usage to the VERIFIED user (from the auth token
    // via enforceQuota), never the client-supplied body field — passing a body
    // userId would let a caller spoof another user's identity and drain their
    // budget. requireAuth guarantees rateLimitUserId is a real uid here.
    const userId = rateLimitUserId
    const interviewerTurns = getInterviewerTurns(sessionContext, context)
    const proactiveSkip = buildProactiveSkipResponse({
      role,
      isProactive,
      context: interviewerTurns,
      timeSinceLastMessage,
    })
    if (proactiveSkip) return NextResponse.json(proactiveSkip)
    if (isProactive) {
      const claimed =
        sessionId && (await claimProactiveNudge(sessionId, userId, parseResult.data.ownerId))
      if (!claimed)
        return NextResponse.json({
          reply: null,
          skipped: true,
          reason: "Session is paused or check-in budget is exhausted",
        })
    }

    // For proactive messages (interviewer jumping in), message might be empty
    if (!message && !isProactive) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Note: Size validation is now handled by Zod schema (message: 10KB, currentCode: 100KB)

    // LLM-based conversation extraction is prepared here but runs after the
    // response is generated so chat latency does not wait on a secondary LLM call.
    const extractionJob = prepareConversationExtraction(requestContext, userId)

    const interviewState = resolveChatInterviewState(requestContext)
    const { currentPhase, phaseContext, currentCodeLen, starterLen } = interviewState
    const { systemPrompt, history, promptFlow } = await buildChatModelInput(
      requestContext,
      interviewState,
      parseResult.data,
      userId
    )

    if (promptFlow.earlyResponse) {
      return NextResponse.json(promptFlow.earlyResponse)
    }

    const fullUserMessage = promptFlow.fullUserMessage

    const aiResponse = await generateValidatedChatResponse({
      request: requestContext,
      userId,
      systemPrompt,
      fullUserMessage,
      history,
      currentPhase,
      signal: request.signal,
    })

    trackChatCompletion(requestContext, userId, aiResponse, Date.now() - startTime)

    if (!request.signal?.aborted) runConversationExtractionAfterResponse(extractionJob)

    const finalizedResponse = {
      reply: aiResponse.text,
      provider: aiResponse.provider, // Include provider for debugging
      latencyMs: aiResponse.latencyMs,
      // DEBUG: Include phase info to verify detection
      _debug: {
        phase: currentPhase,
        messageCount,
        approachExplained: phaseContext.approachExplained,
        currentCodeLength: currentCodeLen,
        starterCodeLength: starterLen,
        codeWritten: currentCodeLen - starterLen,
      },
    }

    return responseMode === "validated-stream" && role === "interviewer"
      ? createValidatedChatStream(finalizedResponse)
      : NextResponse.json(finalizedResponse)
  } catch (error: unknown) {
    logger.error("Chat API error", {
      error,
      message: error instanceof Error ? error.message : undefined,
      status:
        typeof error === "object" && error !== null && "status" in error ? error.status : undefined,
      endpoint: "/api/chat",
    })
    // Return generic error message to avoid leaking internal details
    return NextResponse.json(
      {
        error: "Failed to process chat message. Please try again.",
      },
      { status: 500 }
    )
  }
}
