import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { chatRateLimit } from "@/lib/rate-limit"
import { enforceQuota } from "@/lib/quota-enforcement"
import {
  checkRateLimit,
  startRequestTracking,
  endRequestTracking,
  buildRateLimitResponse,
  type RateLimitTier,
} from "@/lib/rate-limiter"
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
  // Layer 1: IP-based rate limiting (prevents raw abuse before any auth work).
  const rateLimitResponse = await chatRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Layer 2: quota + auth. requireAuth rejects signed-out callers with 401
  // before any model call, and yields the verified uid + plan tier.
  const quotaResult = await enforceQuota(request, { requireAuth: true })
  if (!quotaResult.allowed && quotaResult.response) {
    return quotaResult.response
  }

  const tier = (quotaResult.tier || "free") as RateLimitTier
  const userId = quotaResult.userId || "anonymous"
  let trackingStarted = false

  // Layer 3: per-user tier rate limit + concurrent-request tracking.
  if (userId !== "anonymous") {
    const tierRateCheck = await checkRateLimit(userId, tier, 1000) // ~1000 tokens per reply
    if (!tierRateCheck.allowed) {
      return buildRateLimitResponse(tierRateCheck)
    }
    await startRequestTracking(userId, 1000)
    trackingStarted = true
  }

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
