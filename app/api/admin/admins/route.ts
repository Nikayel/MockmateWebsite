/**
 * Admin Management API
 *
 * Endpoints for managing admin users (super_admin only)
 * - GET: List all admins
 * - POST: Grant admin role to a user
 * - DELETE: Revoke admin role from a user
 */

import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin/middleware"
import {
  PERMISSIONS,
  listAdmins,
  grantAdminRole,
  revokeAdminRole,
  AdminRole,
} from "@/lib/admin/rbac"
import { adminDb } from "@/lib/firebase-admin"

// GET: List all admins
export async function GET(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.MANAGE_ADMINS)

  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: authResult.error || "Unauthorized" },
      { status: authResult.status || 403 }
    )
  }

  try {
    const admins = await listAdmins()

    // Enrich with email if available
    const enrichedAdmins = await Promise.all(
      admins.map(async (admin) => {
        // Try to get email from profiles if not set
        if (admin.email === "Environment Admin" && adminDb) {
          try {
            const profileDoc = await adminDb.collection("profiles").doc(admin.userId).get()
            if (profileDoc.exists) {
              const profile = profileDoc.data()
              return {
                ...admin,
                email: profile?.email || admin.email,
                grantedAt: admin.grantedAt?.toDate?.()?.toISOString() || null,
                lastAccess: admin.lastAccess?.toDate?.()?.toISOString() || null,
              }
            }
          } catch {
            // Ignore errors
          }
        }
        return {
          ...admin,
          grantedAt: admin.grantedAt?.toDate?.()?.toISOString() || null,
          lastAccess: admin.lastAccess?.toDate?.()?.toISOString() || null,
        }
      })
    )

    return NextResponse.json({
      success: true,
      admins: enrichedAdmins,
    })
  } catch (error) {
    console.error("[Admin API] Error listing admins:", error)
    return NextResponse.json({ success: false, error: "Failed to list admins" }, { status: 500 })
  }
}

// POST: Grant admin role
export async function POST(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.MANAGE_ADMINS)

  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: authResult.error || "Unauthorized" },
      { status: authResult.status || 403 }
    )
  }

  try {
    const body = await request.json()
    const { userId, email, role } = body

    if (!userId || !email || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: userId, email, role" },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: AdminRole[] = ["admin", "analyst", "support"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      )
    }

    const result = await grantAdminRole(authResult.context!.userId, userId, email, role)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Admin role '${role}' granted to ${email}`,
    })
  } catch (error) {
    console.error("[Admin API] Error granting admin role:", error)
    return NextResponse.json(
      { success: false, error: "Failed to grant admin role" },
      { status: 500 }
    )
  }
}

// DELETE: Revoke admin role
export async function DELETE(request: NextRequest) {
  const authResult = await requirePermission(request, PERMISSIONS.MANAGE_ADMINS)

  if (!authResult.authorized) {
    return NextResponse.json(
      { success: false, error: authResult.error || "Unauthorized" },
      { status: authResult.status || 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId parameter" },
        { status: 400 }
      )
    }

    const result = await revokeAdminRole(authResult.context!.userId, userId)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Admin role revoked",
    })
  } catch (error) {
    console.error("[Admin API] Error revoking admin role:", error)
    return NextResponse.json(
      { success: false, error: "Failed to revoke admin role" },
      { status: 500 }
    )
  }
}
