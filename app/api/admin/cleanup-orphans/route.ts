import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import {
  verifyAdminAccess,
  requirePermission,
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { logAdminAction } from "@/lib/admin/audit"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const COLLECTIONS = [
  { name: "interview_sessions", field: "user_id" },
  { name: "profile_quota", field: "user_id" },
  { name: "payment_history", field: "user_id" },
  { name: "email_notifications", field: "user_id" },
  { name: "promo_code_usage", field: "userId" },
  { name: "sessions", field: "userId" },
  { name: "session_vectors", field: "userId" },
  { name: "user_learning_state", field: null, idIsUserId: true },
  { name: "problem_mastery", field: "userId" },
  { name: "analytics_events", field: "userId" },
  { name: "user_roadmaps", field: "userId" },
  { name: "performance_profiles", field: "userId" },
]

/**
 * Check authorization - supports both Firebase token (admin) and cron secret
 */
async function checkAuth(req: NextRequest): Promise<{
  authorized: boolean
  adminId?: string
  source: 'admin' | 'cron'
  error?: string
}> {
  const authHeader = req.headers.get("Authorization")

  // Check for cron secret (for automated jobs)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true, adminId: 'cron-job', source: 'cron' }
  }

  // Check for admin token with proper RBAC
  const authResult = await requirePermission(req, PERMISSIONS.MANAGE_SETTINGS)
  if (authResult.authorized) {
    return {
      authorized: true,
      adminId: authResult.context!.userId,
      source: 'admin',
    }
  }

  return { authorized: false, source: 'admin', error: authResult.error }
}

// GET = dry run (preview orphans)
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req)
  if (!auth.authorized) {
    return unauthorizedResponse(auth.error || 'Unauthorized', 401)
  }

  const result = await findOrphans(false)
  return successResponse(result)
}

// POST = delete orphans
export async function POST(req: NextRequest) {
  const auth = await checkAuth(req)
  if (!auth.authorized) {
    return unauthorizedResponse(auth.error || 'Unauthorized', 401)
  }

  const result = await findOrphans(true)

  // Log the action
  if (auth.adminId) {
    await logAdminAction(auth.adminId, 'cleanup_orphans', {
      source: auth.source,
      results: result.results,
      totalDeleted: result.totalDeleted,
    })
  }

  return successResponse(result)
}

async function findOrphans(deleteMode: boolean) {
  const profiles = await adminDb.collection("profiles").get()
  const validIds = new Set(profiles.docs.map(d => d.id))

  const results: Record<string, number> = {}
  let totalDeleted = 0

  for (const col of COLLECTIONS) {
    const snap = await adminDb.collection(col.name).get()
    const orphans = snap.docs.filter(doc => {
      const uid = col.idIsUserId ? doc.id : doc.data()[col.field!]
      return uid && !validIds.has(uid)
    })

    results[col.name] = orphans.length

    if (deleteMode && orphans.length > 0) {
      const batch = adminDb.batch()
      orphans.forEach(doc => batch.delete(doc.ref))
      await batch.commit()
      totalDeleted += orphans.length
    }
  }

  return { mode: deleteMode ? "deleted" : "preview", results, totalDeleted, validProfiles: validIds.size }
}
