/**
 * POST /api/learner-model/events
 *
 * Client-reported study-harness events (concept expanded, evidence viewed,
 * trace shown). Only a whitelisted subset is accepted — server-emitted event
 * types (views, challenges, corrections, verifications) cannot be forged by
 * clients. The server stamps user_id, condition, and timestamp.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getFlag } from "@/lib/feature-flags"
import { logLearnerModelEvent, CLIENT_REPORTABLE_EVENTS } from "@/lib/learner-model/events"

export const dynamic = "force-dynamic"

const eventSchema = z.object({
  event_type: z.enum(CLIENT_REPORTABLE_EVENTS),
  payload: z
    .record(z.string(), z.union([z.string().max(256), z.number(), z.boolean()]))
    .optional()
    .default({}),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: authResult.error },
        { status: 401 }
      )
    }
    const userId = authResult.userId

    const tierCheck = await requireTierForUser(userId, "pro")
    if (tierCheck.response) return tierCheck.response

    if (!getFlag("OPEN_LEARNER_MODEL", userId)) {
      return NextResponse.json({ success: false }, { status: 404 })
    }

    const parsed = eventSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Unknown or malformed event" },
        { status: 400 }
      )
    }

    const condition = getFlag("LEARNER_MODEL_BLACK_BOX", userId) ? "black_box" : "open"
    await logLearnerModelEvent(userId, parsed.data.event_type, condition, parsed.data.payload)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Learner model events API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to record event" },
      { status: 500 }
    )
  }
}
