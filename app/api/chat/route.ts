import { NextRequest, NextResponse } from "next/server"
import { enforceMeteredAiRequest } from "@/lib/ai/metered-request"
import { logger } from "@/lib/logger"
import { guestChatRateLimit } from "@/lib/rate-limiting"
import { chatRequestSchema } from "@/lib/interview/chat-request-schema"
import { processChatMessage } from "@/lib/interview/chat/chat-service"
import { createValidatedChatStream } from "@/lib/interview/chat/validated-response-stream"
import { authorizeGuestChatTurn, refundGuestChatTurn } from "@/lib/interview/chat/guest-chat-auth"
import {
  GUEST_CHAT_TURN_LIMIT,
  GUEST_TURNS_LIMIT_HEADER,
  GUEST_TURNS_REMAINING_HEADER,
  isValidGuestId,
} from "@/lib/interview/guest-chat-limit"

export async function POST(request: NextRequest) {
  const hasBearerAuth = Boolean(
    request.headers.get("authorization") ?? request.headers.get("Authorization")
  )
  const rawGuestId = !hasBearerAuth
    ? (request.headers.get("x-guest-id") ?? request.headers.get("X-Guest-Id"))
    : null

  let userId: string
  let guestSession: { sessionId: string; turnsRemaining: number } | null = null

  if (rawGuestId) {
    if (!isValidGuestId(rawGuestId)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const rateLimitResponse = await guestChatRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    userId = rawGuestId
  } else {
    // Authenticate and charge this submitted action once; provider calls meter their own work.
    const metered = await enforceMeteredAiRequest(request, {
      policy: "chat",
    })
    if (metered.response) {
      return metered.response
    }
    userId = metered.userId
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

    if (rawGuestId) {
      const guestAuth = await authorizeGuestChatTurn({
        guestId: rawGuestId,
        sessionId: parseResult.data.sessionId,
        isProactive: parseResult.data.isProactive,
      })
      if (guestAuth.kind === "skip") {
        return NextResponse.json(
          { reply: null, skipped: true, reason: guestAuth.reason },
          { status: 200 }
        )
      }
      if (guestAuth.kind === "denied") {
        return NextResponse.json(guestAuth.body, { status: guestAuth.status })
      }
      guestSession = {
        sessionId: guestAuth.sessionId,
        turnsRemaining: guestAuth.turnsRemaining,
      }
    }

    const result = await processChatMessage(parseResult.data, {
      // Cost attribution must use the authenticated user (or verified guest), not the body's userId.
      userId,
      signal: request.signal,
      startTime,
    })

    const usedModelTurn = result.kind === "reply" && result.response.provider !== "local"
    let turnsRemaining = guestSession?.turnsRemaining ?? 0
    if (guestSession && !usedModelTurn) {
      await refundGuestChatTurn(guestSession.sessionId, userId)
      turnsRemaining = Math.min(GUEST_CHAT_TURN_LIMIT, guestSession.turnsRemaining + 1)
    }

    const guestHeaders = guestSession
      ? {
          [GUEST_TURNS_REMAINING_HEADER]: String(turnsRemaining),
          [GUEST_TURNS_LIMIT_HEADER]: String(GUEST_CHAT_TURN_LIMIT),
        }
      : undefined

    if (result.kind === "early") {
      return NextResponse.json(result.body, { status: result.status, headers: guestHeaders })
    }

    return parseResult.data.responseMode === "validated-stream" &&
      parseResult.data.role === "interviewer"
      ? createValidatedChatStream(result.response, { headers: guestHeaders })
      : NextResponse.json(result.response, { headers: guestHeaders })
  } catch (error: unknown) {
    if (guestSession) {
      await refundGuestChatTurn(guestSession.sessionId, userId)
    }
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
