import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
const h = vi.hoisted(() => ({ auth: vi.fn(), metrics: vi.fn() }))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: h.auth }))
vi.mock("@/lib/user-metrics/service", () => ({ getUserMetricsResponse: h.metrics }))
import { GET } from "./route"
const request = (days = "7") =>
  ({ nextUrl: new URL(`https://test/api/user/metrics?days=${days}`) }) as NextRequest
beforeEach(() => {
  vi.clearAllMocks()
  h.auth.mockResolvedValue({ authenticated: true, userId: "owner" })
  h.metrics.mockResolvedValue({ overview: { averageScore: 81 } })
})
describe("user metrics endpoint", () => {
  it("authenticates before reading any metric data", async () => {
    h.auth.mockResolvedValue({ authenticated: false })
    expect((await GET(request())).status).toBe(401)
    expect(h.metrics).not.toHaveBeenCalled()
  })
  it.each(["0", "91", "-1", "7.5", "7garbage", "NaN", ""])(
    "rejects invalid days %s",
    async (days) => {
      expect((await GET(request(days))).status).toBe(400)
      expect(h.metrics).not.toHaveBeenCalled()
    }
  )
  it("uses the authenticated identity and prevents shared response caching", async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(h.metrics).toHaveBeenCalledWith("owner", 7)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
  })
  it("reports data failures instead of returning empty beginner statistics", async () => {
    h.metrics.mockRejectedValue(new Error("private database detail"))
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect(JSON.stringify(response)).not.toContain("private database detail")
  })
})
