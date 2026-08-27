/**
 * POST /api/sprint-labs/attempts/complete — grade a submitted attempt.
 * Accepts raw outputs per hidden io-case + client probe booleans + prose
 * fields; the service loads sealed expecteds, compares server-side, computes
 * gate results / escaped defects / five-dimension scores, finalizes at first
 * submission (transactional), and — iff the ticket is review-only — returns
 * the R11 comment texts. Thin handler (docs/sprint-labs/PLAN.md Task 8).
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limit"
import { getSprintLabRun } from "@/lib/sprint-labs/runs"
import { requireSprintLabsEnabled, requireTierForSprint } from "@/lib/sprint-labs/route-guards"
import {
  completeAttemptInputSchema,
  completeSprintLabAttempt,
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

  const parsed = completeAttemptInputSchema.safeParse(body)
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

    const outcome = await completeSprintLabAttempt(auth.userId, parsed.data)
    return NextResponse.json(outcome)
  } catch (error) {
    return attemptServiceErrorResponse(error, "Failed to complete sprint lab attempt")
  }
}
