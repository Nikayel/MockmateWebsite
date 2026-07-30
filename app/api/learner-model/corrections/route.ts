/**
 * GET /api/learner-model/corrections
 *
 * The user's recent challenges (last 7 days) — pending and verified — for the
 * /practice trace banner: "Because you corrected X, it's scheduled for a
 * verification review today."
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getFlag } from "@/lib/feature-flags"
import { getRecentChallenges } from "@/lib/learner-model/verification"

export const dynamic = "force-dynamic"

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

    if (!getFlag("OPEN_LEARNER_MODEL", userId) || getFlag("LEARNER_MODEL_BLACK_BOX", userId)) {
      // No trace in the control condition either — the trace IS the
      // transparency intervention.
      return NextResponse.json({ corrections: [] })
    }

    const challenges = await getRecentChallenges(userId)
    return NextResponse.json({
      corrections: challenges.map((c) => ({
        id: c.id,
        problem_id: c.problem_id,
        scenario_id: c.scenario_id,
        title: c.title,
        reason: c.reason,
        created_at: c.created_at,
        status: c.status,
        correction_type: c.correction?.type ?? null,
        verification_due_at: c.correction?.verification_due_at ?? null,
        passed: c.verification?.passed ?? null,
      })),
    })
  } catch (error) {
    console.error("Learner model corrections API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to load corrections" },
      { status: 500 }
    )
  }
}
