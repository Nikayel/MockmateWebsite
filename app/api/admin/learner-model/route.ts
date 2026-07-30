/**
 * Admin Learner Model API
 *
 * GET /api/admin/learner-model
 * Challenge/correction/verification aggregates for the open learner model — the
 * co-regulation study's dependent variables. Admin-gated and audit-logged.
 *
 * Thin by design: verify admin, call the service, respond.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/admin/middleware"
import { logAdminAction, AUDIT_ACTIONS } from "@/lib/admin/audit"
import { getLearnerModelAdminStats } from "@/lib/learner-model/admin-stats"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request)
  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 403 }
    )
  }

  try {
    const stats = await getLearnerModelAdminStats()

    // Reading per-user challenge history is a privileged action; record it.
    await logAdminAction(authResult.context!.userId, AUDIT_ACTIONS.VIEW_LEARNER_MODEL_STATS, {
      challengesScanned: stats.challenges.total,
    })

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    logger.error("[Admin Learner Model API] Error", { error })
    return NextResponse.json(
      { success: false, error: "Failed to load learner model stats" },
      { status: 500 }
    )
  }
}
