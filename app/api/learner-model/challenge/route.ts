/**
 * POST /api/learner-model/challenge
 *
 * The learner disputes the model's belief about a problem. The challenge is
 * recorded with a belief snapshot, the Correct layer amends the FSRS state
 * (typo/rushed replay the last review with a corrected rating; learned-
 * elsewhere leaves memory untouched), and every challenge pulls a
 * verification review to tomorrow — ground truth on whether the learner was
 * right.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getFlag } from "@/lib/feature-flags"
import {
  createChallenge,
  findRetriedChallenge,
  updateChallengeCorrection,
  ChallengeError,
} from "@/lib/learner-model/challenges"
import { amendForChallenge } from "@/lib/learner-model/amendment"
import { logLearnerModelEvent, LEARNER_MODEL_EVENTS } from "@/lib/learner-model/events"

export const dynamic = "force-dynamic"

const challengeSchema = z.object({
  problem_id: z.string().min(1).max(256),
  reason: z.enum(["typo", "rushed", "learned_elsewhere"]),
  details: z.string().max(500).optional(),
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
      return NextResponse.json({ enabled: false }, { status: 404 })
    }

    const parsed = challengeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid challenge" },
        { status: 400 }
      )
    }

    const condition = getFlag("LEARNER_MODEL_BLACK_BOX", userId) ? "black_box" : "open"

    // Idempotency guard, scoped to the retry window. amendForChallenge re-rates from
    // the card's CURRENT state and pulls a verification review, so a second
    // application corrects twice; the client disables Submit in flight, but a lost
    // response sends the user round the retry path with the challenge already
    // recorded. See findRetriedChallenge for why this must be bounded by BOTH
    // recency and a completed correction — an unbounded version silently swallowed
    // every repeat dispute on a DSA card, forever.
    const retried = await findRetriedChallenge(userId, parsed.data.problem_id)
    if (retried) {
      return NextResponse.json({ success: true, challenge: retried, already_pending: true })
    }

    // Record the challenge (throws 403 in black-box, 404 for unknown cards).
    const { challenge, mastery } = await createChallenge(userId, parsed.data, condition)

    // Apply the correction + verification pull; merge the audit into the doc.
    const { correction } = await amendForChallenge(
      userId,
      parsed.data.problem_id,
      mastery,
      parsed.data.reason
    )
    await updateChallengeCorrection(challenge.id, correction)

    await logLearnerModelEvent(userId, LEARNER_MODEL_EVENTS.CORRECTION_APPLIED, condition, {
      challenge_id: challenge.id,
      problem_id: parsed.data.problem_id,
      correction_type: correction.type,
      amendment_source: correction.amendment_source,
    })
    await logLearnerModelEvent(userId, LEARNER_MODEL_EVENTS.VERIFICATION_SCHEDULED, condition, {
      challenge_id: challenge.id,
      problem_id: parsed.data.problem_id,
      verification_due_at: correction.verification_due_at,
    })

    return NextResponse.json({
      success: true,
      challenge: { ...challenge, correction },
    })
  } catch (error) {
    if (error instanceof ChallengeError) {
      return NextResponse.json(
        { error: "Challenge rejected", message: error.message },
        { status: error.status }
      )
    }
    console.error("Learner model challenge API error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to record challenge" },
      { status: 500 }
    )
  }
}
