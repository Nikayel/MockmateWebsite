/**
 * @vitest-environment jsdom
 *
 * The popup-blocked fallback: signInWithRedirect returns the browser to the
 * INITIATING page as a cold load — which for the post-trial SignupPrompt is
 * /interview, not /login. Every marker consumer used to live in /login, so
 * the returning convert got no profile (checkout 404s forever), no
 * migration, and the reopen effect restarted a blank interview bound to a
 * session their new account cannot own — burning the AI call into a persist
 * 403. This hook is the /interview return leg: it finishes the sign-in
 * (profile, analytics, migration) and lands the convert on their results,
 * while its pending flag holds the reopen effect back so nothing races it.
 */

import { renderHook, act } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({
  inFlight: false,
  consumed: [] as boolean[],
}))
vi.mock("@/lib/auth", () => ({
  hasRedirectSignInInFlight: () => auth.inFlight,
  consumeRedirectSignIn: vi.fn(() => {
    auth.consumed.push(true)
    const was = auth.inFlight
    auth.inFlight = false
    return was
  }),
}))

const createOrUpdateProfile = vi.fn(async () => {})
vi.mock("@/lib/firestore-helpers", () => ({
  createOrUpdateProfile: (...args: unknown[]) => createOrUpdateProfile(...args),
}))
vi.mock("@/lib/attribution", () => ({ getAttribution: () => null }))

const trackSignup = vi.fn()
const trackLogin = vi.fn()
vi.mock("@/lib/analytics", () => ({
  trackSignup: (...args: unknown[]) => trackSignup(...args),
  trackLogin: (...args: unknown[]) => trackLogin(...args),
}))
vi.mock("@/lib/metrics/funnel-client", () => ({ reportFunnelEvent: vi.fn() }))

const migrateGuestSessionsOnLogin = vi.fn()
const hasPendingGuestMigration = vi.fn(() => true)
vi.mock("@/lib/guest-migration", () => ({
  migrateGuestSessionsOnLogin: (...args: unknown[]) => migrateGuestSessionsOnLogin(...args),
  hasPendingGuestMigration: () => hasPendingGuestMigration(),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

import { useRedirectSignInReturn } from "../useRedirectSignInReturn"

const newUser = {
  uid: "user-new",
  email: "new@user.dev",
  displayName: "New",
  photoURL: null,
  metadata: { creationTime: "t1", lastSignInTime: "t1" },
  providerData: [{ providerId: "google.com" }],
  getIdToken: vi.fn(async () => "token-1"),
}

function buildOpts(overrides: Record<string, unknown> = {}) {
  return {
    firebaseUser: newUser,
    initialized: true,
    router: { push: vi.fn(), replace: vi.fn() },
    ...overrides,
  }
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.inFlight = false
  auth.consumed = []
  hasPendingGuestMigration.mockReturnValue(true)
})

describe("useRedirectSignInReturn", () => {
  it("finishes the sign-in and lands the convert on their migrated session", async () => {
    auth.inFlight = true
    migrateGuestSessionsOnLogin.mockResolvedValueOnce({ status: "migrated", sessionId: "sess-9" })
    const opts = buildOpts()

    const { result } = renderHook(() => useRedirectSignInReturn(opts as never))
    expect(result.current.redirectReturnPending).toBe(true)
    await flush()

    expect(createOrUpdateProfile).toHaveBeenCalledWith(
      "user-new",
      "new@user.dev",
      "New",
      null,
      null
    )
    expect(trackSignup).toHaveBeenCalledWith("google", "user-new")
    expect(migrateGuestSessionsOnLogin).toHaveBeenCalledWith({ idToken: "token-1" })
    expect(opts.router.replace).toHaveBeenCalledWith("/sessions/sess-9")
    // Pending stays up through the navigation so the reopen effect never runs.
    expect(result.current.redirectReturnPending).toBe(true)
  })

  it("drops the guest params and releases the page when nothing migrated", async () => {
    auth.inFlight = true
    migrateGuestSessionsOnLogin.mockResolvedValueOnce({ status: "gone" })
    const opts = buildOpts()

    const { result } = renderHook(() => useRedirectSignInReturn(opts as never))
    await flush()

    // Staying signed-in on /interview with foreign ?session params would let
    // the reopen effect bind a live interview to an unowned session.
    expect(opts.router.replace).toHaveBeenCalledWith("/interview")
    expect(result.current.redirectReturnPending).toBe(false)
  })

  it("is a no-op when this load is not a redirect return", async () => {
    auth.inFlight = false
    const opts = buildOpts()

    const { result } = renderHook(() => useRedirectSignInReturn(opts as never))
    await flush()

    expect(result.current.redirectReturnPending).toBe(false)
    expect(createOrUpdateProfile).not.toHaveBeenCalled()
    expect(migrateGuestSessionsOnLogin).not.toHaveBeenCalled()
  })

  it("clears the marker and releases when the redirect came back without a user", async () => {
    auth.inFlight = true
    const opts = buildOpts({ firebaseUser: null })

    const { result } = renderHook(() => useRedirectSignInReturn(opts as never))
    await flush()

    expect(auth.consumed).toHaveLength(1)
    expect(result.current.redirectReturnPending).toBe(false)
    expect(createOrUpdateProfile).not.toHaveBeenCalled()
  })
})
