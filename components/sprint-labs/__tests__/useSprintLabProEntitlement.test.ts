/**
 * @vitest-environment jsdom
 *
 * useSprintLabProEntitlement — the three-outcome entitlement check for the sprint >= 2 wall
 * (UX-SPEC.md §12.6), mirroring `app/practice/page.tsx`'s pattern.
 */
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.hoisted(() => ({ value: { user: null as unknown } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))

const mockGetToken = vi.hoisted(() => vi.fn())
vi.mock("@/lib/firebase-lazy", () => ({ getCurrentUserToken: mockGetToken }))

import { useSprintLabProEntitlement } from "../useSprintLabProEntitlement"

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("useSprintLabProEntitlement", () => {
  it("stays unresolved and never fetches while disabled", () => {
    mockAuth.value = { user: { uid: "u1" } }
    const { result } = renderHook(() => useSprintLabProEntitlement(false))
    expect(result.current.isPro).toBeNull()
    expect(result.current.entitlementFailed).toBe(false)
    expect(mockGetToken).not.toHaveBeenCalled()
  })

  it("resolves isPro from a paid subscription_tier", async () => {
    mockAuth.value = { user: { uid: "u1" } }
    mockGetToken.mockResolvedValue("token123")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ subscription_tier: "pro" }) })
    )
    const { result } = renderHook(() => useSprintLabProEntitlement(true))
    await waitFor(() => expect(result.current.isPro).toBe(true))
    expect(result.current.entitlementFailed).toBe(false)
  })

  it("resolves isPro false for a free tier, distinct from a failed check", async () => {
    mockAuth.value = { user: { uid: "u1" } }
    mockGetToken.mockResolvedValue("token123")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ subscription_tier: "free" }) })
    )
    const { result } = renderHook(() => useSprintLabProEntitlement(true))
    await waitFor(() => expect(result.current.isPro).toBe(false))
    expect(result.current.entitlementFailed).toBe(false)
  })

  it("fails closed on ACCESS but flags entitlementFailed when the check itself errors", async () => {
    mockAuth.value = { user: { uid: "u1" } }
    mockGetToken.mockResolvedValue("token123")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
    const { result } = renderHook(() => useSprintLabProEntitlement(true))
    await waitFor(() => expect(result.current.entitlementFailed).toBe(true))
    expect(result.current.isPro).toBe(false)
  })

  it("retry() re-runs the check", async () => {
    mockAuth.value = { user: { uid: "u1" } }
    mockGetToken.mockResolvedValue("token123")
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ subscription_tier: "pro" }) })
    vi.stubGlobal("fetch", fetchMock)

    const { result } = renderHook(() => useSprintLabProEntitlement(true))
    await waitFor(() => expect(result.current.entitlementFailed).toBe(true))

    act(() => {
      result.current.retry()
    })
    await waitFor(() => expect(result.current.isPro).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
