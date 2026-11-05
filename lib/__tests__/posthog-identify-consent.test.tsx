/**
 * @vitest-environment jsdom
 *
 * Regression tests for the login identify consent gate.
 *
 * The bug: lib/auth-context called `posthog.identify(uid, { email })` on every
 * Firebase login. A visitor without analytics consent runs cookieless (see
 * lib/posthog-consent), cookieless events are personless, and ingestion drops a
 * personless `$identify` with `invalid_event_when_process_person_profile_is_false`.
 * Those signed-in users never linked to their Firebase person.
 *
 * The contract now: identify only with consent. A visitor who consents after
 * signing in is identified by ConsentAnalytics on the opt-in; that half is
 * pinned in components/__tests__/session-replay-ordering.test.tsx.
 */

import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const hasAnalyticsConsent = vi.fn<() => boolean>()
const identify = vi.fn()
let posthogLoaded = true
let authCallback: ((user: unknown) => void) | null = null

vi.mock("@/components/CookieConsent", () => ({
  hasAnalyticsConsent: () => hasAnalyticsConsent(),
}))

vi.mock("posthog-js", () => ({
  default: {
    get __loaded() {
      return posthogLoaded
    },
    identify: (...args: unknown[]) => identify(...args),
    reset: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}))

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, onUser: (user: unknown) => void) => {
    authCallback = onUser
    return () => {}
  },
}))

vi.mock("@/lib/firebase-lazy", () => ({
  getAuthLazy: async () => ({}),
}))

vi.mock("@/lib/auth", () => ({
  convertFirebaseUser: (user: { uid: string }) => ({ id: user.uid }),
}))

const FIREBASE_USER = {
  uid: "uid-1",
  email: "a@example.com",
  getIdTokenResult: async () => ({ expirationTime: new Date(Date.now() + 3_600_000).toString() }),
  getIdToken: async () => "token",
}

async function signIn() {
  const { AuthProvider } = await import("@/lib/auth-context")
  render(
    <AuthProvider>
      <div />
    </AuthProvider>
  )
  await waitFor(() => expect(authCallback).not.toBeNull())
  act(() => authCallback?.(FIREBASE_USER))
}

describe("PostHog identify on login", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    posthogLoaded = true
    authCallback = null
  })

  it("does NOT identify a visitor without consent, since a cookieless identify is dropped", async () => {
    hasAnalyticsConsent.mockReturnValue(false)

    await signIn()

    expect(identify).not.toHaveBeenCalled()
  })

  it("identifies a consented visitor to the Firebase uid with their email", async () => {
    hasAnalyticsConsent.mockReturnValue(true)

    await signIn()

    expect(identify).toHaveBeenCalledWith("uid-1", { email: "a@example.com" })
  })

  it("does nothing on a deploy where PostHog never initialized", async () => {
    hasAnalyticsConsent.mockReturnValue(true)
    posthogLoaded = false

    await signIn()

    expect(identify).not.toHaveBeenCalled()
  })
})
