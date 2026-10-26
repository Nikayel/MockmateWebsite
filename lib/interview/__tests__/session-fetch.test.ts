/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { sessionFetch } from "../session-fetch"

const request = vi.fn()
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SESSION_DEPLOYMENT_ID", "dpl_page_A")
  vi.stubGlobal("fetch", request.mockReset().mockResolvedValue(new Response("ok")))
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("session deployment routing", () => {
  it("pins a request while preserving auth, method, payload and cancellation", async () => {
    const signal = new AbortController().signal
    const headers = new Headers({
      Authorization: "Bearer fixture",
      "Content-Type": "application/json",
    })
    await sessionFetch("/api/chat", {
      method: "POST",
      headers,
      body: '{"message":"hello"}',
      signal,
    })
    const [path, init] = request.mock.calls[0]
    expect(path).toBe("/api/chat")
    expect(init).toMatchObject({ method: "POST", body: '{"message":"hello"}', signal })
    expect(init.headers.get("authorization")).toBe("Bearer fixture")
    expect(init.headers.get("x-deployment-id")).toBe("dpl_page_A")
    expect(headers.has("x-deployment-id")).toBe(false)
    expect(document.cookie).not.toContain("__vdpl")
  })
  it.each(["https://external.example/api", "//external.example/api", "/\\external.example/api"])(
    "does not expose routing metadata to %s",
    async (path) => {
      await sessionFetch(path)
      expect(request).toHaveBeenCalledWith(path, undefined)
    }
  )
  it("works unchanged when platform protection is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SESSION_DEPLOYMENT_ID", "")
    const init = { method: "PUT", body: "saved" }
    await sessionFetch("/api/guest-session", init)
    expect(request).toHaveBeenCalledWith("/api/guest-session", init)
  })
  it("never automatically replays a failed mutation", async () => {
    request.mockRejectedValueOnce(new Error("connection lost"))
    await expect(sessionFetch("/api/feedback/persist", { method: "POST" })).rejects.toThrow(
      "connection lost"
    )
    expect(request).toHaveBeenCalledTimes(1)
  })
})
