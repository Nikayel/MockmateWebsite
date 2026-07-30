/**
 * GET /api/learner-model/history?problem_id=<id>
 *
 * The evidence behind one card's belief: its recent review history from
 * algorithm_research_events. 403 in the black-box condition — the control
 * group gets no evidence by design.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getFlag } from "@/lib/feature-flags"
import { getCardEvidence } from "@/lib/learner-model/evidence"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  problem_id: z.string().min(1).max(256),
})

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ enabled: false }, { status: 404 })
    }
    if (getFlag("LEARNER_MODEL_BLACK_BOX", userId)) {
      return NextResponse.json(
        { error: "Forbidden", message: "Evidence is not available for this account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({ problem_id: searchParams.get("problem_id") })
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "problem_id is required" },
        { status: 400 }
      )
    }

    const evidence = await getCardEvidence(userId, parsed.data.problem_id)
    return NextResponse.json({ problem_id: parsed.data.problem_id, evidence })
  } catch (error) {
    console.error("Learner model history API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to load evidence" },
      { status: 500 }
    )
  }
}
