/**
 * POST /api/sprint-labs/attempts — open a hidden-suite attempt for one
 * ticket. Validates budget/cooldown/policy (attempts-service.ts), issues
 * `{attemptId, variantId, ioCase inputs, probe bodies (assisted only),
 * regression manifest}`. Thin handler: parse -> auth -> flag -> rate-limit
 * -> tier -> service -> response (docs/sprint-labs/PLAN.md Task 8).
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { getFlagAsync } from "@/lib/feature-flags"
import { apiRateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import { getSprintLabRun } from "@/lib/sprint-labs/runs"
import { requireTierForSprint } from "@/lib/sprint-labs/route-guards"
import {
  openAttemptInputSchema,
  openSprintLabAttempt,
  sprintLabAttemptErrorStatus,
} from "@/lib/sprint-labs/grading/attempts-service"

/** Not-yet-launched surface: a disabled flag reads as "this route doesn't exist" rather than 403. */
async function requireSprintLabsEnabled(userId: string): Promise<NextResponse | null> {
  if (await getFlagAsync("SPRINT_LABS_ENABLED", userId)) return null
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

/**
 * Maps a service error to its HTTP response. `retryAfterSeconds` (attached
 * only to a COOLDOWN_ACTIVE error) is surfaced too, so the client can show a
 * countdown instead of a bare "try again later."
 */
export function attemptServiceErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  const status = sprintLabAttemptErrorStatus(error)
  if (status !== null) {
    const message = (error as Error).message
    const retryAfterSeconds = (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds
    const body: Record<string, unknown> = { error: message }
    if (typeof retryAfterSeconds === "number") body.retryAfterSeconds = retryAfterSeconds
    return NextResponse.json(body, { status })
  }
  logger.error(fallbackMessage, { error })
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

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
