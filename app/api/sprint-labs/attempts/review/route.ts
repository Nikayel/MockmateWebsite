/**
 * POST /api/sprint-labs/attempts/review — the review round on a review-only
 * ticket. Accepts the learner's accept/push-back decision (+ optional
 * reason) per bot comment id; scores Verification/Communication per rubric;
 * releases correctness + trap id + reference.diff iff the attempt is
 * already finalized (R11). Thin handler (docs/sprint-labs/PLAN.md Task 8).
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limit"
import { getSprintLabRun } from "@/lib/sprint-labs/runs"
import { requireSprintLabsEnabled, requireTierForSprint } from "@/lib/sprint-labs/route-guards"
import {
  reviewAttemptInputSchema,
  reviewSprintLabAttempt,
} from "@/lib/sprint-labs/grading/attempts-service"
import { attemptServiceErrorResponse } from "../route"

export async function POST(request: NextRequest) {
  const rateLimited = await apiRateLimit(request)
  if (rateLimited) return rateLimited

  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const disabled = await requireSprintLabsEnabled(auth.userId)
  if (disabled) return disabled

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = reviewAttemptInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors.map((e) => e.message) },
      { status: 400 }
    )
  }

  try {
    const run = await getSprintLabRun(auth.userId, parsed.data.runId)
    const tierBlocked = await requireTierForSprint(auth.userId, run)
    if (tierBlocked) return tierBlocked

    const outcome = await reviewSprintLabAttempt(auth.userId, parsed.data)
    return NextResponse.json(outcome)
  } catch (error) {
    return attemptServiceErrorResponse(error, "Failed to record sprint lab review round")
  }
}
