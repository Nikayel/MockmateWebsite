/**
 * Admin API Middleware
 *
 * Reusable middleware for admin API routes.
 * Handles authentication, authorization, and common patterns.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getAdminRole,
  ROLE_PERMISSIONS,
  verifyToken,
  type AdminRole,
  type Permission,
} from "./rbac"

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

  // Verify token
  const tokenResult = await verifyToken(token)
  if (!tokenResult.valid || !tokenResult.userId) {
    return {
      authorized: false,
      error: tokenResult.error || "Invalid token",
      status: 401,
    }
  }

  // Check admin role
  const role = await getAdminRole(tokenResult.userId)
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

  const hasAccess = await hasPermission(authResult.context!.userId, permission)
  if (!hasAccess) {
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
export function parseAdminQueryParams(request: NextRequest): {
  timeRange: "7d" | "30d" | "90d" | "all"
  startDate: Date | null
  endDate: Date
  page: number
  limit: number
} {
  const { searchParams } = new URL(request.url)

  const timeRange = (searchParams.get("timeRange") || "7d") as "7d" | "30d" | "90d" | "all"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))

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

/**
 * Get date range for a time period
 */
export function getDateRange(timeRange: string): { startDate: Date | null; endDate: Date } {
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
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      startDate = null
  }

  return { startDate, endDate: now }
}
