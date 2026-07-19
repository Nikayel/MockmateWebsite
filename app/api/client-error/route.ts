/**
 * Client Error Reporting API
 *
 * Receives browser-side error reports (window errors, unhandled promise
 * rejections, React error boundaries) from components/monitoring and funnels
 * them into the server logger, whose error level ships to Sentry
 * (lib/logger.ts). The browser intentionally has no Sentry DSN, so this
 * endpoint is the only client -> Sentry path.
 *
 * Reports may be anonymous (guests matter at launch): auth is attached when a
 * token is present but never required. The payload is rate-limited,
 * schema-validated, and length-truncated before it reaches the logger, and it
 * is never echoed back to the client.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiRateLimit } from "@/lib/rate-limit"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"

// Largest legitimate report (message + two stacks + url + JSON overhead) is
// well under 32KB; reject anything bigger before JSON parsing.
const MAX_BODY_BYTES = 64 * 1024

// Over-length fields are truncated rather than rejected: a giant stack trace
// is still a report worth keeping.
const truncatedString = (max: number) => z.string().transform((value) => value.slice(0, max))

const clientErrorSchema = z.object({
  message: z
    .string()
    .min(1)
    .transform((value) => value.slice(0, 2000)),
  stack: truncatedString(8000).optional(),
  url: truncatedString(500).optional(),
  source: z.enum(["window-error", "unhandled-rejection", "react-boundary"]).optional(),
  componentStack: truncatedString(8000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await apiRateLimit(request)
    if (rateLimitResult) return rateLimitResult

    const contentLength = Number(request.headers.get("content-length"))
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Invalid report" }, { status: 400 })
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid report" }, { status: 400 })
    }

    const parsed = clientErrorSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid report" }, { status: 400 })
    }

    // Attach the user when a token is present, but allow anonymous reports —
    // guest sessions are a launch-critical funnel.
    let userId: string | undefined
    if (request.headers.get("Authorization")?.startsWith("Bearer ")) {
      const authResult = await verifyAuth(request)
      if (authResult.authenticated && authResult.userId) {
        userId = authResult.userId
      }
    }

    const { message, stack, url, source, componentStack } = parsed.data

    // logger.error ships this to Sentry via the existing transport.
    logger.error(`[ClientError] ${message}`, {
      endpoint: "/api/client-error",
      source: source ?? "unknown",
      url,
      stack,
      componentStack,
      userId,
      userAgent: request.headers.get("user-agent")?.slice(0, 256) ?? undefined,
    })

    // Acknowledge without echoing anything back.
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    logger.error("[Client Error API] Error", { error })
    return NextResponse.json({ error: "Failed to record report" }, { status: 500 })
  }
}
