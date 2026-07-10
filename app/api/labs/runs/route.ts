import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"
import {
  caseLabRunInputSchema,
  getActiveCaseLabRun,
  getCaseLabRun,
  upsertCaseLabRun,
} from "@/lib/labs/case-lab-runs"

/**
 * GET /api/labs/runs?runId=...      → fetch a specific run (owner only)
 * GET /api/labs/runs?caseLabId=...  → fetch the active run for resume
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const runId = searchParams.get("runId")
  const caseLabId = searchParams.get("caseLabId")

  if (!runId && !caseLabId) {
    return NextResponse.json({ error: "runId or caseLabId is required" }, { status: 400 })
  }

  try {
    const run = runId
      ? await getCaseLabRun(auth.userId, runId)
      : await getActiveCaseLabRun(auth.userId, caseLabId as string)
    return NextResponse.json({ run })
  } catch (error) {
    logger.error("Error fetching case lab run:", { error })
    return NextResponse.json({ error: "Failed to fetch run" }, { status: 500 })
  }
}

/**
 * PUT /api/labs/runs — create or update a run (upsert). Body is a CaseLabRun
 * input; ownership is taken from the authenticated user, never the body.
 */
export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = caseLabRunInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid run", details: parsed.error.errors.map((e) => e.message) },
        { status: 400 }
      )
    }

    const run = await upsertCaseLabRun(auth.userId, parsed.data)
    return NextResponse.json({ run })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    logger.error("Error saving case lab run:", { error })
    return NextResponse.json({ error: "Failed to save run" }, { status: 500 })
  }
}
