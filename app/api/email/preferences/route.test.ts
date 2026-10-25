import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
const h = vi.hoisted(() => ({ auth: vi.fn(), patch: vi.fn(), read: vi.fn(), sync: vi.fn() }))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: h.auth }))
vi.mock("@/lib/email/consent/preferences", () => ({ patchEmailPreferences: h.patch }))
vi.mock("@/lib/email/consent/read", () => ({ readEmailPreferences: h.read }))
vi.mock("@/lib/email/consent/sync", () => ({ syncEmailSuppression: h.sync }))
import { GET, PATCH } from "./route"
const request = (body: unknown) => ({ json: async () => body }) as NextRequest
beforeEach(() => {
  vi.clearAllMocks()
  h.auth.mockResolvedValue({ authenticated: true, userId: "owner" })
  h.patch.mockResolvedValue({ preferences: {}, marketingSyncPending: true })
  h.sync.mockResolvedValue(false)
})
describe("email preference boundary", () => {
  it("authenticates before reading or writing preferences", async () => {
    h.auth.mockResolvedValue({ authenticated: false })
    expect((await GET(request(null))).status).toBe(401)
    expect((await PATCH(request(null))).status).toBe(401)
    expect(h.read).not.toHaveBeenCalled()
    expect(h.patch).not.toHaveBeenCalled()
  })
  it.each([
    { key: "marketing_emails", value: "false" },
    { key: "role", value: true },
    { key: "marketing_emails", value: false, userId: "victim" },
  ])("rejects malformed or identity-bearing changes %j", async (body) => {
    expect((await PATCH(request(body))).status).toBe(400)
    expect(h.patch).not.toHaveBeenCalled()
  })
  it("saves only the chosen field for the authenticated owner and reports pending sync", async () => {
    const response = await PATCH(request({ key: "marketing_emails", value: false }))
    expect(h.patch).toHaveBeenCalledWith("owner", { marketing_emails: false }, "account")
    expect(response.status).toBe(200)
    expect(
      (response as unknown as { data: { marketingSyncPending: boolean } }).data.marketingSyncPending
    ).toBe(true)
  })
})
