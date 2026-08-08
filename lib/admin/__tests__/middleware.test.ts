import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

/**
 * The admin auth path used to resolve the same admin_roles document three times
 * for a single permission-gated request: once in verifyAdminAccess for the role,
 * once more in getUserPermissions, and a third time in hasPermission. Each of
 * those also fired a lastAccess write, so one admin page view cost a multiple of
 * the Firestore traffic it needed.
 *
 * The role is the only thing that has to come from the database. Permissions are
 * a pure ROLE_PERMISSIONS lookup off that role, so these tests pin the read count
 * at one while proving the authorization decision itself did not change.
 */

const getAdminRole = vi.fn()
const verifyToken = vi.fn()

vi.mock("../../firebase-admin", () => ({ adminDb: null, adminAuth: null }))

vi.mock("../rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../rbac")>()
  return {
    ...actual,
    getAdminRole: (...args: unknown[]) => getAdminRole(...args),
    verifyToken: (...args: unknown[]) => verifyToken(...args),
  }
})

const { verifyAdminAccess, requirePermission } = await import("../middleware")
const { PERMISSIONS, AdminRoleUnavailableError } = await import("../rbac")

function requestWithToken(token = "valid-token"): NextRequest {
  return {
    headers: { get: (name: string) => (name === "authorization" ? `Bearer ${token}` : null) },
  } as unknown as NextRequest
}

beforeEach(() => {
  getAdminRole.mockReset()
  verifyToken.mockReset()
  verifyToken.mockResolvedValue({ valid: true, userId: "admin-1", email: "a@example.com" })
})

describe("verifyAdminAccess", () => {
  it("resolves the admin role with a single lookup", async () => {
    getAdminRole.mockResolvedValue("admin")

    const result = await verifyAdminAccess(requestWithToken())

    expect(result.authorized).toBe(true)
    expect(getAdminRole).toHaveBeenCalledTimes(1)
  })

  it("returns the full permission set for the role", async () => {
    getAdminRole.mockResolvedValue("analyst")

    const result = await verifyAdminAccess(requestWithToken())

    expect(result.context?.permissions).toContain(PERMISSIONS.VIEW_ANALYTICS)
    expect(result.context?.permissions).not.toContain(PERMISSIONS.MANAGE_ADMINS)
  })

  it("rejects a caller who is not an admin without reading permissions", async () => {
    getAdminRole.mockResolvedValue(null)

    const result = await verifyAdminAccess(requestWithToken())

    expect(result.authorized).toBe(false)
    expect(result.status).toBe(403)
  })

  it("reports a failed role lookup as a fault, not as a refusal", async () => {
    // A Firestore blip used to surface as 403 "not an admin", which told a real
    // super_admin they had no access and gave the shell nothing to retry.
    getAdminRole.mockRejectedValue(new AdminRoleUnavailableError("firestore down"))

    const result = await verifyAdminAccess(requestWithToken())

    expect(result.authorized).toBe(false)
    expect(result.status).toBe(503)
    expect(result.error).not.toContain("not an admin")
  })

  it("does not swallow an unexpected error as a fault", async () => {
    getAdminRole.mockRejectedValue(new TypeError("programming error"))

    await expect(verifyAdminAccess(requestWithToken())).rejects.toThrow(TypeError)
  })

  it("rejects a missing bearer token before touching the database", async () => {
    const result = await verifyAdminAccess({
      headers: { get: () => null },
    } as unknown as NextRequest)

    expect(result.status).toBe(401)
    expect(getAdminRole).not.toHaveBeenCalled()
  })
})

describe("requirePermission", () => {
  it("still resolves the admin role only once", async () => {
    getAdminRole.mockResolvedValue("admin")

    const result = await requirePermission(requestWithToken(), PERMISSIONS.VIEW_REVENUE)

    expect(result.authorized).toBe(true)
    expect(getAdminRole).toHaveBeenCalledTimes(1)
  })

  it("denies a role that lacks the permission", async () => {
    // analyst is read-only: it may view revenue but never manage admins.
    getAdminRole.mockResolvedValue("analyst")

    const result = await requirePermission(requestWithToken(), PERMISSIONS.MANAGE_ADMINS)

    expect(result.authorized).toBe(false)
    expect(result.status).toBe(403)
    expect(result.error).toContain(PERMISSIONS.MANAGE_ADMINS)
  })

  it("grants super_admin every permission", async () => {
    getAdminRole.mockResolvedValue("super_admin")

    for (const permission of Object.values(PERMISSIONS)) {
      const result = await requirePermission(requestWithToken(), permission)
      expect(result.authorized).toBe(true)
    }
  })

  it("denies support the budget permissions it must not hold", async () => {
    getAdminRole.mockResolvedValue("support")

    const result = await requirePermission(requestWithToken(), PERMISSIONS.MANAGE_BUDGETS)

    expect(result.authorized).toBe(false)
  })
})
