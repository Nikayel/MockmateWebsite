/**
 * GET /api/sprint-labs/attempts/[attemptId] — the finalized attempt's releasable data (runtimeB
 * task). Read-only: never opens, completes, or reviews an attempt.
 *
 * Naming note (deliberate deviation, disclosed): the dynamic segment is USED as the ticket key,
 * not a literal Firestore attempt id, even though the folder is `[attemptId]` (kept as named by
 * the brief). Retro/review only ever know `(runId, ticketKey)` — never an attemptId — on a fresh
 * tab (there is no per-ticket attemptId anywhere reachable client-side pre-fetch: `SprintLabRun`
 * carries no such field, and every attempts-service function resolves "the attempt(s) for a
 * ticket" via a `.where("ticketKey", "==", ...)` query, never a stored lookup key). A route keyed
 * by a value nothing hands the caller cold cannot satisfy this task's own explicit bar ("works in
 * a fresh tab"), so `getFinalizedSprintLabAttempt` (see its own doc comment) resolves by ticket key
 * instead, and this route hands the REAL attemptId back in the response body for any caller (e.g.
 * the review round) that needs it for a later write. See task-runtimeB-report.md for the full
 * writeup of this contract resolution.
 *
 * `?runId=` is required (query param, mirroring `GET /api/sprint-labs/runs/files`'s own
 * convention) — attempts are stored as a subcollection of a run, so ownership cannot be checked
 * without it regardless of what the path segment carries.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limit"
import { getSprintLabRun } from "@/lib/sprint-labs/runs"
import { requireSprintLabsEnabled, requireTierForSprint } from "@/lib/sprint-labs/route-guards"
import { getFinalizedSprintLabAttempt } from "@/lib/sprint-labs/grading/attempts-service"
import { attemptServiceErrorResponse } from "../route"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const rateLimited = await apiRateLimit(request)
  if (rateLimited) return rateLimited

  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const disabled = await requireSprintLabsEnabled(auth.userId)
  if (disabled) return disabled

  const { attemptId: ticketKey } = await params
  if (!ticketKey) {
    return NextResponse.json({ error: "ticketKey is required" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const runId = searchParams.get("runId")
  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 })
  }

  try {
    const run = await getSprintLabRun(auth.userId, runId)
    const tierBlocked = await requireTierForSprint(auth.userId, run)
    if (tierBlocked) return tierBlocked

    const result = await getFinalizedSprintLabAttempt(auth.userId, { runId, ticketKey })
    if (!result) {
      return NextResponse.json(
        { error: "No finalized attempt for this ticket yet" },
        { status: 404 }
      )
    }
    return NextResponse.json(result)
  } catch (error) {
    return attemptServiceErrorResponse(error, "Failed to load the finalized sprint lab attempt")
  }
}
