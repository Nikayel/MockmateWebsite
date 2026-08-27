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
  sprintLabRunErrorStatus,
} from "@/lib/sprint-labs/runs"

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
    return NextResponse.json({ run })
  } catch (error) {
    return serviceErrorResponse(error, "Failed to fetch sprint lab run")
  }
}

/**
 * POST /api/sprint-labs/runs — create-or-resume a run for a workbook. Body:
 * `{ workbookId, contentVersion, ticketKeys }` (CreateSprintLabRunInput).
 * Always sprint 1 (advancing past it is the PATCH `advance-sprint` action
 * below), so no tier gate here — every workbook's sprint 1 is free.
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
    // Fires on both a fresh create and a resume: recordSessionStartAdmin
    // itself recognizes a repeat scenarioId within the billing period as a
    // free redo, which is exactly the semantics re-opening a workbook needs.
    await recordSessionStartAdmin(auth.userId, `sprint-labs:${run.workbookId}:${run.currentSprint}`)
    return NextResponse.json({ run })
  } catch (error) {
    return serviceErrorResponse(error, "Failed to create sprint lab run")
  }
}

/**
 * PATCH /api/sprint-labs/runs — board/sprint mutations, dispatched by
 * `action`:
 *   - `{ action: "move-ticket", runId, ticketKey, to }`
 *   - `{ action: "advance-sprint", runId, toSprint, ticketKeys }` — entering
 *     sprint >= 2 requires Pro (PLAN.md Task 6 ruling); session-start
 *     accounting fires on every advance, same free-redo reasoning as POST.
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

    if (parsed.data.toSprint >= 2) {
      const tierCheck = await requireTierForUser(auth.userId, "pro")
      if (tierCheck.response) return tierCheck.response
    }

    try {
      const run = await advanceSprintLabRun(auth.userId, parsed.data)
      await recordSessionStartAdmin(
        auth.userId,
        `sprint-labs:${run.workbookId}:${run.currentSprint}`
      )
      return NextResponse.json({ run })
    } catch (error) {
      return serviceErrorResponse(error, "Failed to advance sprint")
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
