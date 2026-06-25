import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth-helpers"
import { logger } from "@/lib/logger"
import { getCaseLabRun, upsertCaseLabRun } from "@/lib/labs/case-lab-runs"
import { generateCaseLabFeedback } from "@/lib/labs/case-lab-feedback"

export const dynamic = "force-dynamic"

/**
 * POST /api/labs/feedback — generate structured feedback for a run, persist it
 * onto the Review answer, and mark the run completed. Body: { runId }.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (!auth.authenticated || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json()) as { runId?: string }
    if (!body.runId) {
      return NextResponse.json({ error: "runId is required" }, { status: 400 })
    }

    const run = await getCaseLabRun(auth.userId, body.runId)
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 })
    }

    const feedback = await generateCaseLabFeedback(run, { userId: auth.userId })

    const saved = await upsertCaseLabRun(auth.userId, {
      id: run.id,
      caseLabId: run.caseLabId,
      mode: run.mode,
      status: "completed",
      currentMilestone: "review",
      answers: {
        ...run.answers,
        review: { ...run.answers.review, aiFeedback: feedback },
      },
      milestoneStatus: { ...run.milestoneStatus, review: "done" },
    })

    return NextResponse.json({ run: saved, feedback })
  } catch (error) {
    logger.error("Error generating case lab feedback:", { error })
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 })
  }
}
