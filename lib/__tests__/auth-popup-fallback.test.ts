/**
 * @vitest-environment jsdom
 *
 * Tests for the popup -> redirect sign-in fallback.
 *
 * Two bugs live here. First, both sign-in functions ran
 * `window.open("", "_blank", "width=1,height=1")` before signInWithPopup; its
 * only action was a dev console.warn, and on Safari it consumed the user gesture
 * so the real popup was the one that got blocked. Second,
 * signInWithGitHubRedirect / signInWithGoogleRedirect existed with zero call
 * sites, so a user whose browser blocks popups was told "please allow pop-ups"
 * and had no other route in.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const signInWithPopup = vi.fn()
const signInWithRedirect = vi.fn()

class FakeProvider {
  scopes: string[] = []
  addScope(scope: string) {
    this.scopes.push(scope)
  }
}

vi.mock("firebase/auth", () => ({
  signInWithPopup: (...args: unknown[]) => signInWithPopup(...args),
  signInWithRedirect: (...args: unknown[]) => signInWithRedirect(...args),
  getRedirectResult: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GithubAuthProvider: FakeProvider,
  GoogleAuthProvider: FakeProvider,
}))

const fakeAuth = {
  app: {
    options: {
      authDomain: "test.firebaseapp.com",
      projectId: "test",
      apiKey: "key",
      storageBucket: "bucket",
      appId: "app",
    },
  },
}

vi.mock("@/lib/firebase-lazy", () => ({
  getAuthLazy: async () => fakeAuth,
}))

vi.mock("@/lib/analytics", () => ({
  trackLogin: vi.fn(),
  trackSignup: vi.fn(),
}))

const REDIRECT_IN_FLIGHT_KEY = "auth_redirect_in_flight"

function popupError(code: string) {
  const error = new Error(code) as Error & { code: string }
  error.code = code
  return error
}

describe("popup sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("never opens a probe window before the real popup", async () => {
    const openSpy = vi.spyOn(window, "open")
    signInWithPopup.mockResolvedValue({
      user: { uid: "u1", metadata: { creationTime: "a", lastSignInTime: "b" } },
      providerId: "github.com",
    })

    const { signInWithGitHub } = await import("@/lib/auth")
    await signInWithGitHub()

    // The 1x1 probe used to run here and, on Safari, ate the user gesture.
    expect(openSpy).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it("returns the signed-in user on success", async () => {
    signInWithPopup.mockResolvedValue({
      user: { uid: "u1", metadata: { creationTime: "a", lastSignInTime: "a" } },
      providerId: "google.com",
    })

    const { signInWithGoogle } = await import("@/lib/auth")
    const result = await signInWithGoogle()

    expect(result).toEqual({
      status: "signed-in",
      user: { uid: "u1", metadata: { creationTime: "a", lastSignInTime: "a" } },
      providerId: "google.com",
    })
    expect(signInWithRedirect).not.toHaveBeenCalled()
  })
})

describe("redirect fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it.each([
    "auth/popup-blocked",
    "auth/operation-not-supported-in-this-environment",
    "auth/web-storage-unsupported",
  ])("falls back to a redirect when the browser refuses the popup (%s)", async (code) => {
    signInWithPopup.mockRejectedValue(popupError(code))
    signInWithRedirect.mockResolvedValue(undefined)

    const { signInWithGitHub } = await import("@/lib/auth")
    const result = await signInWithGitHub()

    expect(signInWithRedirect).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ status: "redirecting" })
  })

  it("marks the redirect so the return leg still runs profile creation", async () => {
    signInWithPopup.mockRejectedValue(popupError("auth/popup-blocked"))
    signInWithRedirect.mockResolvedValue(undefined)

    const { signInWithGoogle, consumeRedirectSignIn } = await import("@/lib/auth")
    await signInWithGoogle()

    expect(localStorage.getItem(REDIRECT_IN_FLIGHT_KEY)).toBe("1")
    // Consuming it is one-shot, so a later ordinary visit is not misread.
    expect(consumeRedirectSignIn()).toBe(true)
    expect(consumeRedirectSignIn()).toBe(false)
  })

  it.each(["auth/popup-closed-by-user", "auth/cancelled-popup-request"])(
    "does NOT hijack the page when the user cancelled (%s)",
    async (code) => {
      signInWithPopup.mockRejectedValue(popupError(code))

      const { signInWithGitHub } = await import("@/lib/auth")
      await expect(signInWithGitHub()).rejects.toThrow()

      expect(signInWithRedirect).not.toHaveBeenCalled()
      expect(localStorage.getItem(REDIRECT_IN_FLIGHT_KEY)).toBeNull()
    }
  )

  it("does not fall back for an unrelated failure", async () => {
    signInWithPopup.mockRejectedValue(popupError("auth/network-request-failed"))

    const { signInWithGoogle } = await import("@/lib/auth")
    await expect(signInWithGoogle()).rejects.toThrow()

    expect(signInWithRedirect).not.toHaveBeenCalled()
  })

  it("reports the original popup error and clears the marker if the redirect also fails", async () => {
    signInWithPopup.mockRejectedValue(popupError("auth/popup-blocked"))
    signInWithRedirect.mockRejectedValue(new Error("redirect exploded"))

    const { signInWithGitHub } = await import("@/lib/auth")
    await expect(signInWithGitHub()).rejects.toMatchObject({ code: "auth/popup-blocked" })

    // A marker left behind here would make the next ordinary visit to /login
    // think it was a returning redirect.
    expect(localStorage.getItem(REDIRECT_IN_FLIGHT_KEY)).toBeNull()
  })
})
