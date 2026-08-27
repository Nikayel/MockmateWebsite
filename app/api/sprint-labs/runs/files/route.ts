import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { apiRateLimit } from "@/lib/rate-limit"
import { getFlagAsync } from "@/lib/feature-flags"
import { logger } from "@/lib/logger"
import {
  getSprintLabRun,
  listWorkspaceFiles,
  saveWorkspaceFiles,
  saveWorkspaceFilesInputSchema,
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
 * GET /api/sprint-labs/runs/files?runId=... — the run's saved workspace-file
 * overlay (owner only). This is the "overlay" half of "seed + overlay": the
 * seed tree is compiled content the caller already has, so the client
 * reassembles the two via `reassembleWorkspaceFiles`
 * (`lib/sprint-labs/runs-client.ts`) rather than this route needing to know
 * about compiled workbook content at all.
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
  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 })
  }

  try {
    const files = await listWorkspaceFiles(auth.userId, runId)
    return NextResponse.json({ files })
  } catch (error) {
    return serviceErrorResponse(error, "Failed to load sprint lab workspace files")
  }
}

/**
 * PUT /api/sprint-labs/runs/files — batched save of changed files. Body:
 * `{ runId, files: [{ path, content }] }`, at most
 * `MAX_WORKSPACE_FILES_PER_SAVE` (40) per call. Validation (path shape,
 * per-file size cap) and ownership are the service's job
 * (`saveWorkspaceFiles`); this handler stays a thin parse -> auth -> validate
 * -> service -> response. Rate-limited (fix round 2026-08-26, I5): this is
 * the one write path a signed-in client can call repeatedly and cheaply,
 * unlike the run-lifecycle actions which are naturally infrequent. Tier-gated
 * (fix round 2, controller addition 3): a downgraded user must not be able to
 * keep saving files into a run already past sprint 1, the same guard the run
 * route applies to move-ticket/advance-sprint and to reading/resuming a run.
 */
export async function PUT(request: NextRequest) {
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

  const parsed = saveWorkspaceFilesInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors.map((e) => e.message) },
      { status: 400 }
    )
  }

  const current = await getSprintLabRun(auth.userId, parsed.data.runId)
  const tierBlocked = await requireTierForSprint(auth.userId, current)
  if (tierBlocked) return tierBlocked

  try {
    const files = await saveWorkspaceFiles(auth.userId, parsed.data)
    return NextResponse.json({ files })
  } catch (error) {
    return serviceErrorResponse(error, "Failed to save sprint lab workspace files")
  }
}
