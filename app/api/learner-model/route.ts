/**
 * GET /api/learner-model
 *
 * Returns the open learner model — the system's beliefs about what this user
 * knows (per-concept FSRS retrievability/stability rollups + per-card
 * evidence summaries), or the masked black-box variant for users in the
 * study-control condition.
 *
 * Response: { enabled, condition, model } — condition is computed server-side
 * from feature flags; the client renders whatever it is given and never sees
 * flag internals.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getFlag } from "@/lib/feature-flags"
import { buildLearnerModel, maskForBlackBox } from "@/lib/learner-model"
import { logLearnerModelEvent, LEARNER_MODEL_EVENTS } from "@/lib/learner-model/events"

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

    // Same gate as the rest of spaced repetition: Pro feature.
    const tierCheck = await requireTierForUser(userId, "pro")
    if (tierCheck.response) return tierCheck.response

    if (!getFlag("OPEN_LEARNER_MODEL", userId)) {
      return NextResponse.json({ enabled: false })
    }

    const blackBox = getFlag("LEARNER_MODEL_BLACK_BOX", userId)
    const model = await buildLearnerModel(userId)
    const payload = blackBox ? maskForBlackBox(model) : model

    // Server-side view event: guaranteed even if client logging fails, and
    // stamped with the condition so open-vs-black-box views are comparable.
    await logLearnerModelEvent(userId, LEARNER_MODEL_EVENTS.MODEL_VIEWED, payload.condition, {
      total_cards: payload.total_cards,
      concept_count: payload.concepts.length,
      systems_count: payload.systems.length,
    })

    return NextResponse.json({
      enabled: true,
      condition: payload.condition,
      model: payload,
    })
  } catch (error) {
    console.error("Learner model API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to build learner model" },
      { status: 500 }
    )
  }
}
