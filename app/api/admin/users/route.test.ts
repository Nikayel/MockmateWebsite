import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
import type { AdminUserListItem } from "@/lib/admin/user-list-query"

const h = vi.hoisted(() => ({
  loadUserDirectory: vi.fn(),
}))

vi.mock("@/lib/firebase-admin", () => ({ adminDb: {}, adminAuth: {} }))
vi.mock("@/lib/admin/middleware", () => ({
  withPermission: (_permission: string, handler: (request: NextRequest) => Promise<unknown>) =>
    handler,
  requirePermission: vi.fn(),
  successResponse: (data: Record<string, unknown>) => ({
    status: 200,
    data: { success: true, ...data },
  }),
  unauthorizedResponse: vi.fn(),
  errorResponse: (error: string, status: number) => ({ status, data: { success: false, error } }),
}))
vi.mock("@/lib/admin/rbac", () => ({
  PERMISSIONS: { VIEW_USERS: "view_users", MANAGE_USERS: "manage_users" },
}))
vi.mock("@/lib/admin/audit", () => ({ logAdminAction: vi.fn() }))
vi.mock("@/lib/admin/user-directory", () => ({
  loadUserDirectory: h.loadUserDirectory,
  invalidateUserDirectory: vi.fn(),
}))
vi.mock("@/lib/rate-limiting", () => ({ adminDeletionRateLimit: vi.fn() }))
vi.mock("stripe", () => ({ default: class Stripe {} }))
vi.mock("@pinecone-database/pinecone", () => ({ Pinecone: class Pinecone {} }))

import { GET } from "./route"

function user(id: string, createdAt: string, tier = "free"): AdminUserListItem {
  return {
    id,
    email: `${id}@example.com`,
    full_name: id,
    auth_provider: "google",
    subscription_tier: tier,
    subscription_status: "none",
    created_at: createdAt,
    updated_at: "",
    onboarding_completed: false,
    stripe_customer_id: null,
    is_protected: false,
  }
}

const request = (query: string) =>
  ({ url: `https://app.test/api/admin/users?${query}` }) as NextRequest

beforeEach(() => {
  h.loadUserDirectory.mockReset()
  h.loadUserDirectory.mockResolvedValue({
    users: [
      user("old-free", "2026-08-01T10:00:00.000Z"),
      user("new-pro", "2026-09-10T10:00:00.000Z", "pro"),
      user("newer-pro", "2026-09-11T10:00:00.000Z", "pro"),
    ],
    capped: false,
  })
})

describe("GET /api/admin/users", () => {
  it("filters and sorts before slicing the requested page", async () => {
    const response = (await GET(request("tier=pro&sortOrder=asc&page=2&limit=1"))) as unknown as {
      status: number
      data: {
        users: AdminUserListItem[]
        pagination: { page: number; limit: number; total: number; totalPages: number }
      }
    }

    expect(response.status).toBe(200)
    expect(response.data.users.map((entry) => entry.id)).toEqual(["newer-pro"])
    expect(response.data.pagination).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 })
  })

  it("rejects an invalid signup range before loading the directory", async () => {
    const response = (await GET(
      request("signedUpFrom=2026-09-12&signedUpTo=2026-09-10")
    )) as unknown as { status: number; data: { error: string } }

    expect(response.status).toBe(400)
    expect(response.data.error).toContain("before")
    expect(h.loadUserDirectory).not.toHaveBeenCalled()
  })

  it("moves an out-of-range request to the last available page", async () => {
    const response = (await GET(request("page=99&limit=2"))) as unknown as {
      data: { users: AdminUserListItem[]; pagination: { page: number; totalPages: number } }
    }

    expect(response.data.pagination).toMatchObject({ page: 2, totalPages: 2 })
    expect(response.data.users.map((entry) => entry.id)).toEqual(["old-free"])
  })

  it("bypasses the short directory cache for an explicit refresh", async () => {
    await GET(request("refresh=1"))

    expect(h.loadUserDirectory).toHaveBeenCalledWith(expect.any(Array), true)
  })
})
