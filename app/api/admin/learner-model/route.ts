/**
 * Admin Learner Model API
 *
 * GET /api/admin/learner-model
 * Challenge/correction/verification aggregates for the open learner model — the
 * co-regulation study's dependent variables. Admin-gated and audit-logged.
 *
 * Thin by design: check the permission, call the service, respond.
 *
 * Gated on VIEW_ANALYTICS rather than "is an admin": these are study dependent
 * variables aggregated from per-user challenge history, which the support role
 * has no reason to read.
 */

import { NextResponse } from "next/server"
import { withPermission } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { logAdminAction, AUDIT_ACTIONS } from "@/lib/admin/audit"
import { getLearnerModelAdminStats } from "@/lib/learner-model/admin-stats"
import { logger } from "@/lib/logger"

export const GET = withPermission(PERMISSIONS.VIEW_ANALYTICS, async (_request, context) => {
  try {
    const stats = await getLearnerModelAdminStats()

    // Reading per-user challenge history is a privileged action; record it.
    await logAdminAction(context.userId, AUDIT_ACTIONS.VIEW_LEARNER_MODEL_STATS, {
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
})
