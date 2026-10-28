/**
 * POST /api/sprint-labs/attempts — open a hidden-suite attempt for one
 * ticket. Validates budget/cooldown/policy (attempts-service.ts), issues
 * `{attemptId, variantId, ioCase inputs, probe bodies (assisted only),
 * regression manifest}`. Thin handler: parse -> auth -> flag -> rate-limit
 * -> tier -> service -> response (docs/sprint-labs/PLAN.md Task 8).
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limiting"
import { attemptServiceErrorResponse } from "@/lib/sprint-labs/grading/attempt-http-error"
import { getSprintLabRun } from "@/lib/sprint-labs/runs"
import { requireSprintLabsEnabled, requireTierForSprint } from "@/lib/sprint-labs/route-guards"
import {
  openAttemptInputSchema,
  openSprintLabAttempt,
} from "@/lib/sprint-labs/grading/attempts-service"

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

  const parsed = openAttemptInputSchema.safeParse(body)
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

    const result = await openSprintLabAttempt(auth.userId, parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    return attemptServiceErrorResponse(error, "Failed to open sprint lab attempt")
  }
}
