/**
 * The moment a guest signs in from the post-trial prompt, their session has to
 * change owners BEFORE feedback streaming starts: /api/feedback/persist
 * refuses to write to a session the caller does not own, so streaming against
 * a still-guest-owned session would generate paid AI output it can never save.
 * upgradeGuestSession is that ordering, made explicit and throwable.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { upgradeGuestSession } from "../guest-upgrade"

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

describe("upgradeGuestSession", () => {
  it("posts the guest session to the migrate API with the new owner's token", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ migrated: 1, sessions: ["sess-1"] }),
    })

    await upgradeGuestSession({
      guestId: "guest-12345678-1234-1234-1234-123456789abc",
      sessionId: "sess-1",
      idToken: "token-abc",
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/guest-session/migrate")
    expect(init.method).toBe("POST")
    expect(init.headers.Authorization).toBe("Bearer token-abc")
    expect(JSON.parse(init.body)).toEqual({
      guestId: "guest-12345678-1234-1234-1234-123456789abc",
      sessionId: "sess-1",
    })
  })

  it("throws when the migrate API refuses, so the caller never streams against an unowned session", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Session not found or already migrated" }),
    })

    await expect(
      upgradeGuestSession({
        guestId: "guest-12345678-1234-1234-1234-123456789abc",
        sessionId: "sess-1",
        idToken: "token-abc",
      })
    ).rejects.toThrow("Session not found or already migrated")
  })

  it("throws when the API reports success but migrated nothing", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ migrated: 0, sessions: [] }),
    })

    await expect(
      upgradeGuestSession({
        guestId: "guest-12345678-1234-1234-1234-123456789abc",
        sessionId: "sess-1",
        idToken: "token-abc",
      })
    ).rejects.toThrow(/migrated/i)
  })
})
