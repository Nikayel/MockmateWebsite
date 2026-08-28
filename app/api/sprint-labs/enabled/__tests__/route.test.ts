/**
 * Route-level tests for GET /api/sprint-labs/enabled. Mocks only the one module
 * the route imports (`getFlagAsync`), matching the established sprint-labs
 * route-test style. The route's whole job is to forward the resolved flag as a
 * boolean with no auth, so that is exactly what these assert.
 *
 * Body is read off `.data`, not `.json()`: `vitest.setup.ts` mocks `next/server`
 * so `NextResponse.json(data, init)` returns `{ data, status, headers }`. Every
 * sprint-labs route test reads responses this way.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getFlagAsync: vi.fn(),
}))

vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))

import { GET } from "../route"

type FlagResponse = { data: { enabled: boolean }; status: number }

describe("GET /api/sprint-labs/enabled", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns { enabled: true } when the flag resolves on", async () => {
    mocks.getFlagAsync.mockResolvedValue(true)
    const response = (await GET()) as unknown as FlagResponse
    expect(response.status).toBe(200)
    expect(response.data).toEqual({ enabled: true })
  })

  it("returns { enabled: false } when the flag resolves off (the default)", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const response = (await GET()) as unknown as FlagResponse
    expect(response.status).toBe(200)
    expect(response.data).toEqual({ enabled: false })
  })

  it("resolves the flag globally, without a userId (nav is one row for the product)", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    await GET()
    expect(mocks.getFlagAsync).toHaveBeenCalledWith("SPRINT_LABS_ENABLED")
    expect(mocks.getFlagAsync).toHaveBeenCalledTimes(1)
  })
})
