import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { enforceMeteredAiRequest } from "@/lib/ai/metered-request"
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
 * Metered exactly like the interview `/api/chat`: authenticate and enforce quota,
 * then charge one tiered request token for the submitted action. Each provider
 * call meters its own token and concurrency use. Cost is attributed to the
 * verified uid from the token, never a body field.
 */
export async function POST(request: NextRequest) {
  // Authenticate and charge this submitted action once; provider calls meter their own work.
  const metered = await enforceMeteredAiRequest(request, {
    policy: "chat",
  })
  if (metered.response) {
    return metered.response
  }
  const { userId } = metered

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
  }
}
