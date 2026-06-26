import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
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
  context: z.string().max(8000).optional(),
})

/**
 * POST /api/labs/chat — milestone-aware interviewer reply for a Case Lab.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const reply = await generateCaseLabChatReply({
      ...parsed.data,
      userId: auth.userId,
    })
    return NextResponse.json({ reply })
  } catch (error) {
    logger.error("Error in case lab chat:", { error })
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 })
  }
}
