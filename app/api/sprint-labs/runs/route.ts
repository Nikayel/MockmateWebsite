import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { requireTierForUser } from "@/lib/quota-enforcement"
import { getFlagAsync } from "@/lib/feature-flags"
import { recordSessionStartAdmin } from "@/lib/quota/session-start-admin"
import { logger } from "@/lib/logger"
import {
  advanceSprintLabRun,
  advanceSprintLabRunInputSchema,
  createSprintLabRun,
  createSprintLabRunInputSchema,
  getActiveSprintLabRun,
  getSprintLabRun,
  moveSprintLabTicket,
  moveSprintLabTicketInputSchema,
  requireKnownWorkbookAndTickets,
  requireOwnedActiveRun,
  SPRINT_LAB_RUN_ERRORS,
  sprintLabRunErrorStatus,
} from "@/lib/sprint-labs/runs"
import { requireTierForSprint } from "@/lib/sprint-labs/route-guards"

/** Not-yet-launched surface: a disabled flag reads as "this route doesn't exist" rather than 403. */
async function requireSprintLabsEnabled(userId: string): Promise<NextResponse | null> {
  if (await getFlagAsync("SPRINT_LABS_ENABLED", userId)) return null
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

function serviceErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  const status = sprintLabRunErrorStatus(error)
  if (status !== null) {
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
  logger.error(fallbackMessage, { error })
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

/**
 * Fix round 2026-08-26, I1: the write this route performs must actually be
 * GATED on quota, not just recorded after the fact. Returns the response to
 * send back on failure, or `null` to proceed.
 */
async function requireSessionStart(
  userId: string,
  scenarioId: string
): Promise<NextResponse | null> {
  const result = await recordSessionStartAdmin(userId, scenarioId)
  if (result.success) return null
  return NextResponse.json({ error: "Session limit exceeded", ...result }, { status: 403 })
}

/**
 * GET /api/sprint-labs/runs?runId=...       -> fetch a specific run (owner only)
 * GET /api/sprint-labs/runs?workbookId=...  -> fetch the active run for resume
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const disabled = await requireSprintLabsEnabled(auth.userId)
  if (disabled) return disabled

  const { searchParams } = new URL(request.url)
  const runId = searchParams.get("runId")
  const workbookId = searchParams.get("workbookId")
  if (!runId && !workbookId) {
    return NextResponse.json({ error: "runId or workbookId is required" }, { status: 400 })
  }

  try {
    const run = runId
      ? await getSprintLabRun(auth.userId, runId)
      : await getActiveSprintLabRun(auth.userId, workbookId as string)

    const tierBlocked = await requireTierForSprint(auth.userId, run)
    if (tierBlocked) return tierBlocked

    return NextResponse.json({ run })
  } catch (error) {
    return serviceErrorResponse(error, "Failed to fetch sprint lab run")
  }
}

/**
 * POST /api/sprint-labs/runs — create-or-resume a run for a workbook. Body:
 * `{ workbookId, contentVersion, ticketKeys }` (CreateSprintLabRunInput). A
 * genuinely fresh create always lands at sprint 1 (free); resuming a run
 * already past sprint 1 is gated below, after create-or-resume settles which
 * case this is (fix round 2026-08-26, I2).
 */
export async function POST(request: NextRequest) {
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

  const parsed = createSprintLabRunInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors.map((e) => e.message) },
      { status: 400 }
    )
  }

  try {
    const run = await createSprintLabRun(auth.userId, parsed.data)

    const tierBlocked = await requireTierForSprint(auth.userId, run)
    if (tierBlocked) return tierBlocked

    // Fires on both a fresh create and a resume: recordSessionStartAdmin
    // itself recognizes a repeat scenarioId within the billing period as a
    // free redo, which is exactly the semantics re-opening a workbook needs.
    // Its result is now actually checked (I1) — a quota failure returns 403
    // instead of silently handing back the run anyway.
    const quotaBlocked = await requireSessionStart(
      auth.userId,
      `sprint-labs:${run.workbookId}:${run.currentSprint}`
    )
    if (quotaBlocked) return quotaBlocked

    return NextResponse.json({ run })
  } catch (error) {
    return serviceErrorResponse(error, "Failed to create sprint lab run")
  }
}

/**
 * PATCH /api/sprint-labs/runs — board/sprint mutations, dispatched by
 * `action`:
 *   - `{ action: "move-ticket", runId, ticketKey, to }` — gated behind Pro
 *     when the run's CURRENT sprint is already >= 2 (fix round 2,
 *     controller addition 3: every mutation on a run past sprint 1 needs
 *     Pro, not just the act of advancing into it).
 *   - `{ action: "advance-sprint", runId, toSprint, ticketKeys }` — entering
 *     sprint >= 2 requires Pro; quota is checked and enforced BEFORE the
 *     advance is applied (fix round 2026-08-26, I1). Fix round 2, OPEN 2:
 *     the cheap validation (ownership+active, sequential sprint number,
 *     registry legality) now ALSO runs before quota is spent, not just
 *     before the write — an invalid advance must not burn a session/open on
 *     every retry. `advanceSprintLabRun` re-validates internally before its
 *     own write (one extra read; simplicity and correctness over shaving it
 *     off), so nothing here is trusted past this point without also being
 *     re-checked at the point of the actual mutation.
 */
export async function PATCH(request: NextRequest) {
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

  const action =
    body && typeof body === "object" ? (body as Record<string, unknown>).action : undefined

  if (action === "move-ticket") {
    const parsed = moveSprintLabTicketInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    try {
      // The pre-check read lives inside the try too (round 3 follow-up 1): a
      // transient Firestore failure here must map through serviceErrorResponse
      // like every other failure in this handler, not escape as a raw 500.
      const current = await getSprintLabRun(auth.userId, parsed.data.runId)
      const tierBlocked = await requireTierForSprint(auth.userId, current)
      if (tierBlocked) return tierBlocked

      const run = await moveSprintLabTicket(auth.userId, parsed.data)
      return NextResponse.json({ run })
    } catch (error) {
      return serviceErrorResponse(error, "Failed to update ticket")
    }
  }

  if (action === "advance-sprint") {
    const parsed = advanceSprintLabRunInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    try {
      // Validate FIRST, spend quota SECOND (fix round 2, OPEN 2): ownership +
      // active status, the sequential sprint number, and registry legality
      // must all pass before a session/open is ever spent — otherwise a
      // request that was always going to fail (wrong sequence, inactive
      // run, forged sprint/ticket) could burn quota on every retry without
      // ever actually advancing anything. The sequential check is the one
      // piece duplicated from `advanceSprintLabRun` rather than shared
      // (it's a single comparison); the ownership/active and registry
      // checks reuse the exact same exported functions the mutator itself
      // calls, so there is no separate copy of THEIR logic to drift.
      const current = await requireOwnedActiveRun(auth.userId, parsed.data.runId)
      if (parsed.data.toSprint !== current.currentSprint + 1) {
        throw new Error(SPRINT_LAB_RUN_ERRORS.INVALID_SPRINT_ADVANCE)
      }
      await requireKnownWorkbookAndTickets(
        current.workbookId,
        parsed.data.toSprint,
        parsed.data.ticketKeys
      )

      if (parsed.data.toSprint >= 2) {
        const tierCheck = await requireTierForUser(auth.userId, "pro")
        if (tierCheck.response) return tierCheck.response
      }

      const quotaBlocked = await requireSessionStart(
        auth.userId,
        `sprint-labs:${current.workbookId}:${parsed.data.toSprint}`
      )
      if (quotaBlocked) return quotaBlocked

      const run = await advanceSprintLabRun(auth.userId, parsed.data)
      return NextResponse.json({ run })
    } catch (error) {
      return serviceErrorResponse(error, "Failed to advance sprint")
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
