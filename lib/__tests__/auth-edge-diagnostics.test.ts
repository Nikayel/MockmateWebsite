/**
 * Edge token verification must stay opaque to the caller and loud in the logs.
 *
 * Every failure path returns the same `"Token verification failed"`, which is correct: telling a
 * caller which of "forged", "expired" or "revoked" applies hands an attacker free information. The
 * defect was that the failures were opaque to us too. A `catch {}` around the fetch meant an
 * Identity Toolkit outage, a DNS failure, or a rotated API key produced mass 401s across every Edge
 * route that were byte-identical to a wave of forged tokens.
 *
 * Both halves of that are pinned here, because fixing one by breaking the other is the easy
 * mistake: a log line that leaks into the response body, or a "cleanup" that drops the log again.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const logs = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
}))

vi.mock("../logger", () => ({
  logger: { error: logs.error, warn: logs.warn, info: vi.fn(), debug: vi.fn() },
}))

vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "test-api-key")

const { verifyAuthEdge } = await import("../auth-edge")

function requestWithToken(token = "a.valid-looking.token"): Request {
  return { headers: { get: (name: string) => (name === "Authorization" ? `Bearer ${token}` : null) } } as Request
}

/** Stub `fetch` with a fixed response, or make it reject to simulate a transport failure. */
function stubFetch(result: { status: number; body?: unknown } | Error) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (result instanceof Error) throw result
      return {
        ok: result.status >= 200 && result.status < 300,
        status: result.status,
        json: async () => result.body ?? {},
      }
    })
  )
}

describe("verifyAuthEdge diagnostics", () => {
  beforeEach(() => {
    logs.error.mockClear()
    logs.warn.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("logs an error when the request never reaches Firebase", async () => {
    stubFetch(new Error("getaddrinfo ENOTFOUND identitytoolkit.googleapis.com"))

    const result = await verifyAuthEdge(requestWithToken())

    expect(result.authenticated).toBe(false)
    expect(logs.error).toHaveBeenCalledTimes(1)
    expect(logs.error.mock.calls[0][0]).toMatch(/could not reach Firebase/i)
  })

  it("logs an error when Firebase is failing or throttling us", async () => {
    for (const status of [500, 503, 429]) {
      logs.error.mockClear()
      stubFetch({ status })

      await verifyAuthEdge(requestWithToken())

      expect(logs.error, `status ${status}`).toHaveBeenCalledTimes(1)
    }
  })

  it("stays silent on a 400, which is just a bad token", async () => {
    // Every expired session in normal traffic lands here. Logging it would bury the outage signal
    // this file exists to surface.
    stubFetch({ status: 400 })

    const result = await verifyAuthEdge(requestWithToken())

    expect(result.authenticated).toBe(false)
    expect(logs.error).not.toHaveBeenCalled()
    expect(logs.warn).not.toHaveBeenCalled()
  })

  it("warns when a 200 carries no account", async () => {
    stubFetch({ status: 200, body: { users: [] } })

    const result = await verifyAuthEdge(requestWithToken())

    expect(result.authenticated).toBe(false)
    expect(logs.warn).toHaveBeenCalledTimes(1)
  })

  it("returns the same opaque error whatever went wrong", async () => {
    const errors: Array<string | undefined> = []

    stubFetch(new Error("network down"))
    errors.push((await verifyAuthEdge(requestWithToken())).error)

    stubFetch({ status: 503 })
    errors.push((await verifyAuthEdge(requestWithToken())).error)

    stubFetch({ status: 400 })
    errors.push((await verifyAuthEdge(requestWithToken())).error)

    stubFetch({ status: 200, body: { users: [] } })
    errors.push((await verifyAuthEdge(requestWithToken())).error)

    expect(new Set(errors)).toEqual(new Set(["Token verification failed"]))
  })

  it("authenticates and logs nothing on a valid token", async () => {
    stubFetch({ status: 200, body: { users: [{ localId: "user-123" }] } })

    const result = await verifyAuthEdge(requestWithToken())

    expect(result).toEqual({ authenticated: true, userId: "user-123" })
    expect(logs.error).not.toHaveBeenCalled()
    expect(logs.warn).not.toHaveBeenCalled()
  })
})
