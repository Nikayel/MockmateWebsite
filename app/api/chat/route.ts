import { NextRequest, NextResponse } from "next/server"
import { enforceMeteredAiRequest } from "@/lib/ai/metered-request"
import { logger } from "@/lib/logger"
import { chatRequestSchema } from "@/lib/interview/chat-request-schema"
import { processChatMessage } from "@/lib/interview/chat/chat-service"
import { createValidatedChatStream } from "@/lib/interview/chat/validated-response-stream"

export async function POST(request: NextRequest) {
  // Authenticate and charge this submitted action once; provider calls meter their own work.
  const metered = await enforceMeteredAiRequest(request, {
    policy: "chat",
  })
  if (metered.response) {
    return metered.response
  }

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

    const result = await processChatMessage(parseResult.data, {
      // Cost attribution must use the authenticated user, not the body's userId.
      userId: metered.userId,
      signal: request.signal,
      startTime,
    })
    if (result.kind === "early") return NextResponse.json(result.body, { status: result.status })

    return parseResult.data.responseMode === "validated-stream" &&
      parseResult.data.role === "interviewer"
      ? createValidatedChatStream(result.response)
      : NextResponse.json(result.response)
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
