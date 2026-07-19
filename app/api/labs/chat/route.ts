import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { chatRateLimit } from "@/lib/rate-limit"
import { enforceMeteredAiRequest } from "@/lib/ai/metered-request"
import { endRequestTracking } from "@/lib/rate-limiter"
import { logger } from "@/lib/logger"
import { generateCaseLabChatReply } from "@/lib/labs/case-lab-chat"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  milestone: z.enum(["clarify", "decompose", "design", "build", "review"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(50),
  lab: z
    .object({
      title: z.string(),
      company: z.string(),
      role: z.string(),
      whyThisCompany: z.string().optional(),
    })
    .optional(),
  roundGuidance: z
    .object({
      whatItTests: z.string().max(600).optional(),
      commonTrap: z.string().max(600).optional(),
    })
    .optional(),
  context: z.string().max(8000).optional(),
})

/**
 * POST /api/labs/chat — milestone-aware interviewer reply for a Case Lab.
 *
 * Metered exactly like the interview `/api/chat`: IP rate limit -> quota + auth
 * (paid LLM path, signed-out rejected) -> per-user tier rate limit -> concurrent
 * request tracking. Without this, the lab chat route was an unmetered LLM hole
 * (free/exhausted users could run unlimited chat). Cost/usage is attributed to
 * the VERIFIED uid from the token, never a body field.
 */
export async function POST(request: NextRequest) {
  // Cost-metering preamble: IP limit -> quota + auth -> per-user tier limit + concurrent tracking.
  const metered = await enforceMeteredAiRequest(request, {
    estimatedTokens: 1000, // ~1000 tokens per reply
    ipLimiter: chatRateLimit,
  })
  if (metered.response) {
    return metered.response
  }
  const { userId, trackingStarted } = metered

  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors.map((e) => e.message) },
        { status: 400 }
      )
    }

    const reply = await generateCaseLabChatReply({
      ...parsed.data,
      userId,
    })
    return NextResponse.json({ reply })
  } catch (error) {
    logger.error("Error in case lab chat:", { error })
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 })
  } finally {
    if (trackingStarted) {
      await endRequestTracking(userId).catch(() => {})
    }
  }
}
