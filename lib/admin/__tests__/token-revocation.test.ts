import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * The point of this module is that revocation IS checked, but not once per API
 * route in a dashboard fan-out. Both halves are load-bearing: drop the check and
 * a revoked admin keeps working for an hour, drop the cache and every panel on
 * the page pays a round trip to the Auth backend.
 */

const verifyIdToken = vi.fn()

vi.mock("../../firebase-admin", () => ({
  adminAuth: { verifyIdToken: (...args: unknown[]) => verifyIdToken(...args) },
  adminDb: null,
}))

const { verifyIdTokenWithRevocation, resetRevocationCache, REVOCATION_RECHECK_MS } = await import(
  "../token-revocation"
)

beforeEach(() => {
  verifyIdToken.mockReset()
  verifyIdToken.mockResolvedValue({ uid: "admin-1", email: "a@example.com" })
  resetRevocationCache()
  vi.useRealTimers()
})

describe("verifyIdTokenWithRevocation", () => {
  it("checks revocation on a token it has not seen", async () => {
    await verifyIdTokenWithRevocation("token-a")

    expect(verifyIdToken).toHaveBeenCalledWith("token-a", true)
  })

  it("skips the revocation round trip on a repeat within the window", async () => {
    await verifyIdTokenWithRevocation("token-a")
    await verifyIdTokenWithRevocation("token-a")
    await verifyIdTokenWithRevocation("token-a")

    expect(verifyIdToken).toHaveBeenCalledTimes(3)
    expect(verifyIdToken.mock.calls.map((call) => call[1])).toEqual([true, false, false])
  })

  it("checks each distinct token", async () => {
    await verifyIdTokenWithRevocation("token-a")
    await verifyIdTokenWithRevocation("token-b")

    expect(verifyIdToken.mock.calls.map((call) => call[1])).toEqual([true, true])
  })

  it("rechecks once the window has passed", async () => {
    vi.useFakeTimers()
    await verifyIdTokenWithRevocation("token-a")

    vi.advanceTimersByTime(REVOCATION_RECHECK_MS + 1)
    await verifyIdTokenWithRevocation("token-a")

    expect(verifyIdToken.mock.calls.map((call) => call[1])).toEqual([true, true])
  })

  it("propagates a revoked token rather than caching the failure", async () => {
    verifyIdToken.mockRejectedValueOnce(new Error("auth/id-token-revoked"))

    await expect(verifyIdTokenWithRevocation("token-a")).rejects.toThrow("auth/id-token-revoked")

    // The rejected attempt must not count as "recently checked", or a revoked
    // token would be waved through for the rest of the window.
    verifyIdToken.mockResolvedValueOnce({ uid: "admin-1" })
    await verifyIdTokenWithRevocation("token-a")
    expect(verifyIdToken).toHaveBeenLastCalledWith("token-a", true)
  })
})
