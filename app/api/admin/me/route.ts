/**
 * GET /api/admin/me
 *
 * The cheapest possible answer to "is this caller an admin, and what may they do".
 * It resolves the bearer token and reads exactly one admin_roles document (via
 * verifyAdminAccess), then returns the identity that was already in memory.
 * No user listing, no collection scans, no analytics providers.
 *
 * The admin shell calls this on mount to decide between the dashboard, the sign-in
 * screen and the access-denied screen, and to build the navigation for the caller's
 * role. It must stay this cheap: every admin page load hits it.
 */

import { withAdminAuth, successResponse } from "@/lib/admin/middleware"

export const dynamic = "force-dynamic"

export interface AdminMeResponse {
  success: true
  userId: string
  email: string | null
  role: string
  permissions: string[]
}

export const GET = withAdminAuth(async (_request, context) =>
  successResponse({
    userId: context.userId,
    email: context.email ?? null,
    role: context.role,
    permissions: context.permissions,
  })
)
