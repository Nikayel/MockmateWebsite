import { beforeEach, describe, expect, it, vi } from "vitest"

const h = vi.hoisted(() => ({
  listUsers: vi.fn(),
  profileGet: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldPath: { documentId: () => "__name__" },
}))
vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: { listUsers: h.listUsers },
  adminDb: {
    collection: () => ({
      where: (_field: string, _operator: string, ids: string[]) => ({
        get: () => h.profileGet(ids),
      }),
    }),
  },
}))
vi.mock("@/lib/admin/cache", () => ({
  adminCache: { get: h.cacheGet, set: h.cacheSet, delete: vi.fn() },
  CACHE_TTL: { USERS: 10_000 },
}))

import { loadUserDirectory } from "../user-directory"

beforeEach(() => {
  h.listUsers.mockReset()
  h.profileGet.mockReset()
  h.cacheGet.mockReset()
  h.cacheSet.mockReset()
  h.cacheGet.mockReturnValue(null)
  h.profileGet.mockImplementation(async (ids: string[]) => ({
    docs: ids.map((id) => ({
      id,
      data: () => ({ subscription_tier: id === "user-0" ? "pro" : "free" }),
    })),
  }))
})

describe("loadUserDirectory", () => {
  it("batches profile lookups and normalizes Auth plus profile fields", async () => {
    h.listUsers.mockResolvedValue({
      users: Array.from({ length: 31 }, (_, index) => ({
        uid: `user-${index}`,
        email: `user-${index}@example.com`,
        displayName: index === 0 ? "First User" : null,
        providerData: [{ providerId: "google.com" }],
        metadata: {
          creationTime: `2026-09-${String((index % 9) + 1).padStart(2, "0")}T10:00:00.000Z`,
        },
      })),
      pageToken: undefined,
    })

    const result = await loadUserDirectory(["user-0@example.com"])

    expect(h.profileGet).toHaveBeenCalledTimes(2)
    expect(result.users).toHaveLength(31)
    expect(result.users[0]).toMatchObject({
      id: "user-0",
      full_name: "First User",
      auth_provider: "google",
      subscription_tier: "pro",
      is_protected: true,
    })
    expect(h.cacheSet).toHaveBeenCalledWith("admin:users:directory", result, 10_000)
  })

  it("returns a cached directory without calling Firebase Auth", async () => {
    const cached = { users: [], capped: false }
    h.cacheGet.mockReturnValue(cached)

    await expect(loadUserDirectory([])).resolves.toBe(cached)
    expect(h.listUsers).not.toHaveBeenCalled()
  })
})
