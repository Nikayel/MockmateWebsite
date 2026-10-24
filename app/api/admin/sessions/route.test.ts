import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
import { ROLE_PERMISSIONS, type AdminRole } from "@/lib/admin/rbac"

const h = vi.hoisted(() => ({
  role: "admin" as string | null,
  valid: true,
  load: vi.fn(),
  audit: vi.fn(),
}))
vi.mock("@/lib/admin/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin/rbac")>()),
  verifyToken: vi.fn(async () => ({ valid: h.valid, userId: h.valid ? "operator" : undefined })),
  getAdminRole: vi.fn(async () => h.role),
}))
vi.mock("@/lib/admin/session-review/load", () => ({ loadSessionInspection: h.load }))
vi.mock("@/lib/admin/audit", () => ({ logAdminAction: h.audit }))
import { GET } from "./route"

async function request(query: string, authenticated = true) {
  return (await GET({
    url: `https://app.test/api/admin/sessions?${query}`,
    headers: new Headers(authenticated ? { authorization: "Bearer valid" } : {}),
  } as NextRequest)) as unknown as { status: number; data: Record<string, unknown> }
}

beforeEach(() => {
  h.role = "admin"
  h.valid = true
  h.load
    .mockReset()
    .mockResolvedValue({
      session: { sessionId: "sess1", userId: "learner" },
      conversations: [],
      work: {},
    })
  h.audit.mockReset()
})

describe("admin session inspection authorization and errors", () => {
  it.each(["super_admin", "admin", "support"] as AdminRole[])(
    "allows %s to inspect an individual session and audits only metadata",
    async (role) => {
      h.role = role
      expect(ROLE_PERMISSIONS[role]).toContain("view_user_details")
      const response = await request("sessionId=sess1")
      expect(response.status).toBe(200)
      expect(h.load).toHaveBeenCalledWith("sess1")
      expect(h.audit).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "operator" }),
        "view_session_detail",
        { targetUserId: "learner", transcriptSource: [] },
        expect.objectContaining({ target: { type: "interview_sessions", id: "sess1" } })
      )
    }
  )
  it("rejects analysts before any transcript read", async () => {
    h.role = "analyst"
    expect((await request("sessionId=sess1")).status).toBe(403)
    expect(h.load).not.toHaveBeenCalled()
  })
  it("retains analyst list access while support cannot scan sessions", async () => {
    h.role = "analyst"
    expect((await request("status=invalid")).status).toBe(400)
    h.role = "support"
    expect((await request("status=invalid")).status).toBe(403)
  })
  it("rejects unauthenticated and revoked callers before reading", async () => {
    expect((await request("sessionId=sess1", false)).status).toBe(401)
    h.valid = false
    expect((await request("sessionId=sess1")).status).toBe(401)
    expect(h.load).not.toHaveBeenCalled()
  })
  it.each(["", "../secret", "a/b", "x".repeat(129)])(
    "rejects invalid document ids (%s)",
    async (id) => {
      expect((await request(`sessionId=${encodeURIComponent(id)}`)).status).toBe(400)
      expect(h.load).not.toHaveBeenCalled()
    }
  )
  it("distinguishes deleted sessions and backend outages from an empty conversation", async () => {
    h.load.mockResolvedValueOnce(null)
    expect((await request("sessionId=sess1")).status).toBe(404)
    h.load.mockRejectedValueOnce(new Error("Firestore internal details"))
    const response = await request("sessionId=sess1")
    expect(response.status).toBe(500)
    expect(JSON.stringify(response.data)).not.toContain("Firestore internal")
  })
})
