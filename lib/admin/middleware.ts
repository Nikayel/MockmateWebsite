/**
 * Admin API Middleware
 *
 * Reusable middleware for admin API routes.
 * Handles authentication, authorization, and common patterns.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  AdminRoleUnavailableError,
  getAdminRole,
  ROLE_PERMISSIONS,
  verifyToken,
  type AdminRole,
  type Permission,
} from "./rbac"
import { clampInt } from "./query-params"

export interface AdminContext {
  userId: string
  email?: string
  role: AdminRole
  permissions: Permission[]
}

export interface AuthResult {
  authorized: boolean
  context?: AdminContext
  error?: string
  status?: number
}

/**
 * Verify admin access for an API route
 * Returns admin context if authorized, error response if not
 */
export async function verifyAdminAccess(request: NextRequest): Promise<AuthResult> {
  // Extract bearer token
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      authorized: false,
      error: "Missing authorization header",
      status: 401,
    }
  }

  const token = authHeader.replace("Bearer ", "")

  // Verify token. checkRevoked is on for the admin surface: without it, an admin
  // whose access was revoked keeps working until their ID token expires, about
  // an hour. The check is rate-limited per token so a dashboard page load costs
  // one Auth round trip rather than one per panel.
  const tokenResult = await verifyToken(token, { checkRevoked: true })
  if (!tokenResult.valid || !tokenResult.userId) {
    return {
      authorized: false,
      error: tokenResult.error || "Invalid token",
      status: 401,
    }
  }

  // Check admin role. A lookup that could not complete is reported as a fault, not
  // as a refusal: answering 403 during a Firestore blip tells a real super_admin
  // they are not an admin, and leaves them nothing to retry.
  let role: AdminRole | null
  try {
    role = await getAdminRole(tokenResult.userId)
  } catch (error) {
    if (error instanceof AdminRoleUnavailableError) {
      return {
        authorized: false,
        error: "Could not verify admin access. This is a fault, not a refusal.",
        status: 503,
      }
    }
    throw error
  }

  if (!role) {
    return {
      authorized: false,
      error: "Access denied - not an admin",
      status: 403,
    }
  }

  // Derive permissions from the role we already fetched. Calling getUserPermissions()
  // here would re-read the same admin_roles document for a value that is a pure lookup.
  const permissions = ROLE_PERMISSIONS[role]

  return {
    authorized: true,
    context: {
      userId: tokenResult.userId,
      email: tokenResult.email,
      role,
      permissions,
    },
  }
}

/**
 * Require specific permission for an API route
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<AuthResult> {
  const authResult = await verifyAdminAccess(request)

  if (!authResult.authorized) {
    return authResult
  }

  // verifyAdminAccess already resolved this admin's full permission set, so the check
  // is a local membership test rather than a third read of the same admin_roles doc.
  if (!authResult.context!.permissions.includes(permission)) {
    return {
      authorized: false,
      error: `Access denied - missing permission: ${permission}`,
      status: 403,
    }
  }

  return authResult
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(error: string, status: number = 403): NextResponse {
  return NextResponse.json({ success: false, error }, { status })
}

/**
 * Create error response
 */
export function errorResponse(error: string, status: number = 500): NextResponse {
  return NextResponse.json({ success: false, error }, { status })
}

/**
 * Create success response
 */
export function successResponse<T>(data: T): NextResponse {
  return NextResponse.json({
    success: true,
    ...data,
  })
}

/**
 * Wrap an admin API handler with auth middleware
 */
export function withAdminAuth<T>(
  handler: (request: NextRequest, context: AdminContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await verifyAdminAccess(request)

    if (!authResult.authorized) {
      return unauthorizedResponse(authResult.error!, authResult.status)
    }

    return handler(request, authResult.context!)
  }
}

/**
 * Wrap an admin API handler with permission check
 */
export function withPermission<T>(
  permission: Permission,
  handler: (request: NextRequest, context: AdminContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requirePermission(request, permission)

    if (!authResult.authorized) {
      return unauthorizedResponse(authResult.error!, authResult.status)
    }

    return handler(request, authResult.context!)
  }
}

/**
 * Parse common query parameters for admin APIs
 */
const ADMIN_TIME_RANGES = ["7d", "30d", "90d", "all"] as const
export type AdminTimeRange = (typeof ADMIN_TIME_RANGES)[number]

export function parseAdminQueryParams(request: NextRequest): {
  timeRange: AdminTimeRange
  startDate: Date | null
  endDate: Date
  page: number
  limit: number
} {
  const { searchParams } = new URL(request.url)

  // Validated rather than cast. A blind `as` let any string through, and since the
  // switch below falls through to `startDate = null`, an unrecognised value selected
  // the unbounded all-time scan. `?timeRange=lol` was the most expensive query in the
  // admin, and it also poisoned the response cache under its own key.
  const requested = searchParams.get("timeRange")
  const timeRange: AdminTimeRange = ADMIN_TIME_RANGES.includes(requested as AdminTimeRange)
    ? (requested as AdminTimeRange)
    : "7d"

  const page = clampInt(searchParams.get("page"), { min: 1, max: 10_000, fallback: 1 })
  const limit = clampInt(searchParams.get("limit"), { min: 1, max: 100, fallback: 50 })

  const now = new Date()
  let startDate: Date | null = null

  switch (timeRange) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = null
  }

  return {
    timeRange,
    startDate,
    endDate: now,
    page,
    limit,
  }
}

// getDateRange lived here as a third copy of the window arithmetic above, with a
// "1y" case the other two did not have and zero callers anywhere in the repo. The
// two remaining copies disagreeing was the kind of thing that produced a funnel
// whose stages covered different windows, so the unused one is gone rather than
// left as a tempting import.
