import { describe, it, expect, vi } from "vitest"
import { authedFetch, authedJsonFetch, type TokenProvider } from "../authed-fetch"

/**
 * The behaviour that justifies this module is the 401 retry: an expired cached
 * token is the ordinary failure, and the 56 hand-rolled call sites it replaces
 * turn that into a generic error or a silently empty screen.
 */

function jsonResponse(status: number, body: unknown, statusText = ""): Response {
  return new Response(body === undefined ? "" : JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  })
}

/** Token provider that returns a different token once forceRefresh is requested. */
function fakeTokens(): TokenProvider & { calls: boolean[] } {
  const calls: boolean[] = []
  const provider = (async (forceRefresh: boolean) => {
    calls.push(forceRefresh)
    return forceRefresh ? "fresh-token" : "stale-token"
  }) as TokenProvider & { calls: boolean[] }
  provider.calls = calls
  return provider
}

describe("authedFetch", () => {
  it("attaches the bearer token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: 1 }))

    await authedFetch("/api/thing", { tokenProvider: fakeTokens(), fetchImpl })

    const headers = fetchImpl.mock.calls[0][1].headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer stale-token")
  })

  it("returns parsed data on success without refreshing the token", async () => {
    const tokenProvider = fakeTokens()
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { value: 42 }))

    const result = await authedFetch<{ value: number }>("/api/thing", {
      tokenProvider,
      fetchImpl,
    })

    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ value: 42 })
    expect(result.needsReauth).toBe(false)
    expect(tokenProvider.calls).toEqual([false])
  })

  it("retries once with a refreshed token after a 401 and succeeds", async () => {
    const tokenProvider = fakeTokens()
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(200, { value: "recovered" }))

    const result = await authedFetch<{ value: string }>("/api/thing", {
      tokenProvider,
      fetchImpl,
    })

    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ value: "recovered" })
    expect(result.needsReauth).toBe(false)
    // First attempt used the cache, second forced a refresh.
    expect(tokenProvider.calls).toEqual([false, true])
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe("Bearer fresh-token")
  })

  it("reports needsReauth when the retry also fails", async () => {
    const tokenProvider = fakeTokens()
    // A fresh Response per call: a body can only be read once, and in production
    // each fetch yields its own response.
    const fetchImpl = vi.fn(async () => jsonResponse(401, { error: "Unauthorized" }))

    const result = await authedFetch("/api/thing", { tokenProvider, fetchImpl })

    expect(result.ok).toBe(false)
    expect(result.needsReauth).toBe(true)
    expect(result.error).toBe("Unauthorized")
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("retries a 403 the same way, since a stale token can present as forbidden", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(403, { error: "Insufficient permissions" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))

    const result = await authedFetch("/api/thing", { tokenProvider: fakeTokens(), fetchImpl })

    expect(result.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("never retries more than once", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(401, { error: "nope" }))

    await authedFetch("/api/thing", { tokenProvider: fakeTokens(), fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it("does not retry a non-auth failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" }))

    const result = await authedFetch("/api/thing", { tokenProvider: fakeTokens(), fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(result.needsReauth).toBe(false)
    expect(result.status).toBe(500)
    expect(result.error).toBe("boom")
  })

  it("reads all three error-body shapes the routes emit", async () => {
    const shapes: Array<[unknown, string]> = [
      [{ error: "plain" }, "plain"],
      [{ success: false, error: "envelope" }, "envelope"],
      [{ error: "Bad Request", message: "detailed reason" }, "detailed reason"],
    ]

    for (const [body, expected] of shapes) {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(400, body))
      const result = await authedFetch("/api/thing", { tokenProvider: fakeTokens(), fetchImpl })
      expect(result.error).toBe(expected)
    }
  })

  it("falls back to the status when the body carries no message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(500, undefined, "Server Error"))

    const result = await authedFetch("/api/thing", { tokenProvider: fakeTokens(), fetchImpl })

    expect(result.error).toBe("HTTP 500: Server Error")
  })

  it("treats a transport failure as an error but not as a reauth prompt", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("Failed to fetch"))

    const result = await authedFetch("/api/thing", { tokenProvider: fakeTokens(), fetchImpl })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(0)
    // Being offline is not a reason to sign the user out.
    expect(result.needsReauth).toBe(false)
    expect(result.error).toBe("Failed to fetch")
  })

  it("reports a signed-out user without calling fetch", async () => {
    const fetchImpl = vi.fn()

    const result = await authedFetch("/api/thing", {
      tokenProvider: async () => null,
      fetchImpl,
    })

    expect(result.ok).toBe(false)
    expect(result.needsReauth).toBe(true)
    expect(result.error).toBe("Not signed in")
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("does not throw when the token provider throws", async () => {
    const result = await authedFetch("/api/thing", {
      tokenProvider: async () => {
        throw new Error("token backend down")
      },
      fetchImpl: vi.fn(),
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe("token backend down")
  })

  it("survives a non-JSON body, such as a proxy HTML error page", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response("<html>502</html>", { status: 502, statusText: "Bad Gateway" })
      )

    const result = await authedFetch("/api/thing", { tokenProvider: fakeTokens(), fetchImpl })

    expect(result.ok).toBe(false)
    expect(result.error).toBe("HTTP 502: Bad Gateway")
  })

  it("handles an empty 204 body", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))

    const result = await authedFetch("/api/thing", { tokenProvider: fakeTokens(), fetchImpl })

    expect(result.ok).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it("lets the caller override a header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))

    await authedFetch("/api/thing", {
      tokenProvider: fakeTokens(),
      fetchImpl,
      headers: { "X-Trace": "abc" },
    })

    const headers = fetchImpl.mock.calls[0][1].headers as Record<string, string>
    expect(headers["X-Trace"]).toBe("abc")
    expect(headers.Authorization).toBe("Bearer stale-token")
  })
})

describe("authedJsonFetch", () => {
  it("serializes the body and sets the JSON content type", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))

    await authedJsonFetch(
      "/api/thing",
      "POST",
      { a: 1 },
      {
        tokenProvider: fakeTokens(),
        fetchImpl,
      }
    )

    const init = fetchImpl.mock.calls[0][1]
    expect(init.method).toBe("POST")
    expect(init.body).toBe(JSON.stringify({ a: 1 }))
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
  })

  it("omits the body when there is none", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, {}))

    await authedJsonFetch("/api/thing", "DELETE", undefined, {
      tokenProvider: fakeTokens(),
      fetchImpl,
    })

    expect(fetchImpl.mock.calls[0][1].body).toBeUndefined()
  })

  it("inherits the 401 retry", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(200, { saved: true }))

    const result = await authedJsonFetch<{ saved: boolean }>(
      "/api/thing",
      "PUT",
      { x: 1 },
      {
        tokenProvider: fakeTokens(),
        fetchImpl,
      }
    )

    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ saved: true })
  })
})
