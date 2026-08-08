/**
 * Admin Management API
 *
 * Endpoints for managing admin users (super_admin only)
 * - GET: List all admins
 * - POST: Grant admin role to a user
 * - DELETE: Revoke admin role from a user
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePermission } from "@/lib/admin/middleware"
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  listAdmins,
  grantAdminRole,
  revokeAdminRole,
} from "@/lib/admin/rbac"
import { adminDb, adminAuth } from "@/lib/firebase-admin"

/**
 * super_admin is deliberately absent: `grantAdminRole()` refuses it, so
 * offering it here would only produce a confusing round trip.
 */
const grantAdminSchema = z.object({
  // Firebase uids are 1-128 characters. This field is typed by hand, so the
  // real check is the account lookup below; the schema only rejects shapes
  // that cannot be a uid at all.
  userId: z.string().trim().min(1).max(128),
  email: z.string().trim().email("Enter the account's email address"),
  role: z.enum(["admin", "analyst", "support"]),
})

const revokeAdminSchema = z.object({
  userId: z.string().trim().min(1).max(128),
})

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ")
}

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
      // The real table, not a copy of it. The settings page rendered a
      // hand-maintained matrix that had already drifted from ROLE_PERMISSIONS,
      // so it told operators that roles could do things the middleware refuses.
      // Serving the source of truth means the two cannot disagree again.
      rolePermissions: ROLE_PERMISSIONS,
      permissions: Object.values(PERMISSIONS),
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
    const parsed = grantAdminSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: formatZodError(parsed.error) },
        { status: 400 }
      )
    }

    const { userId, email, role } = parsed.data

    // The uid is typed by hand from another screen, so it is checked against a
    // real account before a role is written. A mistyped character previously
    // created an admin_roles document for a user that does not exist: it looked
    // like it worked, granted nothing, and left a phantom row that only the
    // intended admin's continued lack of access would ever reveal.
    if (!adminAuth) {
      return NextResponse.json(
        { success: false, error: "Auth not available; cannot verify the user id" },
        { status: 503 }
      )
    }

    let account
    try {
      account = await adminAuth.getUser(userId)
    } catch {
      return NextResponse.json(
        { success: false, error: "No account exists with that user id" },
        { status: 400 }
      )
    }

    // Requiring the email to match the account catches the more dangerous
    // version of the same mistake: a valid uid belonging to somebody else.
    // Comparison is case-insensitive because Firebase preserves the case a user
    // signed up with.
    const accountEmail = account.email ?? ""
    if (accountEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: accountEmail
            ? `That user id belongs to ${accountEmail}, not ${email}. Check the id before granting access.`
            : "That account has no email address on file, so the grant cannot be verified.",
        },
        { status: 400 }
      )
    }

    const result = await grantAdminRole(authResult.context!.userId, userId, accountEmail, role)

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
    const parsed = revokeAdminSchema.safeParse({ userId: searchParams.get("userId") ?? undefined })

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Missing or malformed userId parameter" },
        { status: 400 }
      )
    }

    const result = await revokeAdminRole(authResult.context!.userId, parsed.data.userId)

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
