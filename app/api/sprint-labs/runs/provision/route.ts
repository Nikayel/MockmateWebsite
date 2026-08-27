import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"
import {
  getSprintLabRun,
  seedWorkspaceFilesIfAbsent,
  sprintLabRunErrorStatus,
} from "@/lib/sprint-labs/runs"
import { requireSprintLabsEnabled, requireTierForSprint } from "@/lib/sprint-labs/route-guards"
import {
  materializeInitialTree,
  provisioningErrorStatus,
  type ProvisionedFile,
} from "@/lib/sprint-labs/provisioning/materialize-initial-tree"

const provisionInputSchema = z.object({
  runId: z.string().min(1),
  ticketKey: z.string().min(1),
})

/**
 * Two DISTINCT error namespaces reach this route, and their string codes are not guaranteed
 * disjoint (`SPRINT_LAB_RUN_ERRORS.UNKNOWN_TICKET` — "a board move to a ticket not on this run" —
 * happens to share its literal string with `PROVISIONING_ERRORS.UNKNOWN_TICKET` — "this ticket key
 * doesn't exist in the workbook at all" — even though the two mean different things and map to
 * different statuses, 409 vs 404). Composing both mappers behind one `??` would let whichever
 * runs first silently win for that string, which is exactly the bug this split avoids: each mapper
 * below is applied ONLY to the call site whose errors it can actually receive, so the two can never
 * collide in practice, and a future error code in either namespace remains free to reuse the other
 * namespace's strings without a silent status mix-up (round 1 fix: caught by this route's own
 * provision test, `route.test.ts`).
 */
function runErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  const status = sprintLabRunErrorStatus(error)
  if (status !== null) {
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
  logger.error(fallbackMessage, { error })
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

function materializeErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  const status = provisioningErrorStatus(error)
  if (status !== null) {
    return NextResponse.json({ error: (error as Error).message }, { status })
  }
  logger.error(fallbackMessage, { error })
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

/**
 * POST /api/sprint-labs/runs/provision — the learner's initial file tree for one ticket (RULING
 * R27: request-time, reusing Task 7's dynamic materializer — see
 * `lib/sprint-labs/provisioning/materialize-initial-tree.ts` for the full shape and the
 * security/production notes). Body: `{ runId, ticketKey }`.
 *
 * `workbookId` is deliberately never read from the request body: it comes off the OWNED run
 * (`run.workbookId`), so a caller cannot probe an arbitrary workbook's tickets by forging one.
 * Rate-limited like the other write-ish Sprint Labs surface (`PUT /runs/files`) — a signed-in
 * client can call this repeatedly and cheaply (every ticket open).
 *
 * Idempotently seeds the T6 workspace-file store for every provisioned "editable" path not already
 * saved there (first-open only, per path — never overwrites the learner's saved progress on
 * re-open; see `seedWorkspaceFilesIfAbsent`'s own doc comment for why this is evaluated per path
 * rather than per ticket), then returns the FULL provisioned set (all roles) so the workspace can
 * render immediately without a second round trip. `useSprintLabRunSync` (T6's autosave hook)
 * remains the source of truth for `sync.files` after this: its own load merges the durable overlay
 * on top of whatever seed the caller passes it, unaffected by whether that seed came from here.
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = await apiRateLimit(request)
  if (rateLimitResult) return rateLimitResult

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

  const parsed = provisionInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    const run = await getSprintLabRun(auth.userId, parsed.data.runId)
    if (!run) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

    const tierBlocked = await requireTierForSprint(auth.userId, run)
    if (tierBlocked) return tierBlocked

    let files: ProvisionedFile[]
    try {
      files = materializeInitialTree(run.workbookId, parsed.data.ticketKey)
    } catch (error) {
      return materializeErrorResponse(error, "Failed to materialize the ticket's initial file tree")
    }

    const editable = files.filter((file) => file.role === "editable")
    await seedWorkspaceFilesIfAbsent(auth.userId, run.id, editable)

    return NextResponse.json({ files })
  } catch (error) {
    return runErrorResponse(error, "Failed to provision sprint lab workspace")
  }
}
