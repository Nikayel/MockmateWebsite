/**
 * @vitest-environment jsdom
 *
 * The login-side guest migration, extracted from app/login/page.tsx where
 * three bugs lived tangled together: confirmGuestSessionMigration() cleared
 * the local session data one line BEFORE the code that read it (so the
 * promised /sessions landing was dead code), every failure was swallowed
 * silently, and the finally block destroyed the retry marker even on network
 * blips — turning a one-off 500 into a permanently lost trial.
 *
 * The contract: success clears everything and reports the session id from the
 * SERVER response (not from storage that may already be cleared); a 404 or
 * migrated:0 means the session is gone forever, so the marker goes too; a
 * transient failure (network, 5xx) keeps the marker so the next sign-in
 * retries.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { hasPendingGuestMigration, migrateGuestSessionsOnLogin } from "../guest-migration"

const GUEST_ID = "guest-12345678-1234-1234-1234-123456789abc"
const PENDING_KEY = "pending_guest_migration"

const fetchMock = vi.fn()

function seedGuestState() {
  localStorage.setItem(PENDING_KEY, JSON.stringify({ guestId: GUEST_ID, sessionId: "sess-1" }))
  localStorage.setItem("mockmate_guest_id", GUEST_ID)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.stubGlobal("fetch", fetchMock)
})

describe("migrateGuestSessionsOnLogin", () => {
  it("reports the migrated session from the server response and clears guest state", async () => {
    seedGuestState()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ migrated: 1, sessionIds: ["sess-1"] }),
    })

    const result = await migrateGuestSessionsOnLogin({ idToken: "token-1" })

    expect(result).toEqual({ status: "migrated", sessionId: "sess-1" })
    expect(localStorage.getItem(PENDING_KEY)).toBeNull()
    // confirmGuestSessionMigration retires the guest identity.
    expect(localStorage.getItem("mockmate_guest_id")).toBeNull()
  })

  it("treats a 404 as gone and stops retrying", async () => {
    seedGuestState()
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) })

    const result = await migrateGuestSessionsOnLogin({ idToken: "token-1" })

    expect(result).toEqual({ status: "gone" })
    expect(localStorage.getItem(PENDING_KEY)).toBeNull()
  })

  it("keeps the retry marker through a server error", async () => {
    seedGuestState()
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })

    const result = await migrateGuestSessionsOnLogin({ idToken: "token-1" })

    expect(result).toEqual({ status: "transient" })
    expect(localStorage.getItem(PENDING_KEY)).not.toBeNull()
  })

  it("keeps the retry marker when the network fails outright", async () => {
    seedGuestState()
    fetchMock.mockRejectedValueOnce(new Error("offline"))

    const result = await migrateGuestSessionsOnLogin({ idToken: "token-1" })

    expect(result).toEqual({ status: "transient" })
    expect(localStorage.getItem(PENDING_KEY)).not.toBeNull()
  })

  it("does nothing when there is no guest identity at all", async () => {
    const result = await migrateGuestSessionsOnLogin({ idToken: "token-1" })

    expect(result).toEqual({ status: "none" })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("hasPendingGuestMigration", () => {
  it("mirrors the marker", () => {
    expect(hasPendingGuestMigration()).toBe(false)
    localStorage.setItem(PENDING_KEY, JSON.stringify({ guestId: GUEST_ID }))
    expect(hasPendingGuestMigration()).toBe(true)
  })
})
