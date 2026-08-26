/**
 * @vitest-environment jsdom
 *
 * The post-trial signup prompt used to open with the guest's score as its
 * hero element — a 100-scorer read "100%", had no further reason to sign up,
 * and left (observed end-to-end in PostHog on 2026-08-25). The prompt's job
 * is now the opposite: the score exists, is saved, and is what signing in
 * reveals. So the component must never render a score or stamp one onto
 * analytics, and a successful in-page (popup) sign-in must hand the firebase
 * user to onSignedIn so the page can migrate the session and start the real
 * feedback stream. The popup-blocked path still goes through /login, which
 * needs the pending_guest_migration marker — so that marker is only cleared
 * on the popup path that handled migration itself.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const trackEvent = vi.fn()
vi.mock("@/lib/analytics", () => ({
  trackEvent: (name: string, params?: Record<string, unknown>) => trackEvent(name, params),
}))

const signInWithGoogle = vi.fn()
const signInWithGitHub = vi.fn()
vi.mock("@/lib/auth", () => ({
  signInWithGoogle: () => signInWithGoogle(),
  signInWithGitHub: () => signInWithGitHub(),
}))

const createOrUpdateProfile = vi.fn(() => Promise.resolve())
vi.mock("@/lib/firestore-helpers", () => ({
  createOrUpdateProfile: (...args: unknown[]) => createOrUpdateProfile(...args),
}))

vi.mock("@/lib/attribution", () => ({ getAttribution: () => null }))

vi.mock("@/lib/guest-session", () => ({
  getGuestId: () => "guest-12345678-1234-1234-1234-123456789abc",
  markFreeTrialUsed: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { SignupPrompt } from "../SignupPrompt"

const popupUser = {
  uid: "user-new",
  email: "new@user.dev",
  displayName: "New User",
  photoURL: null,
  metadata: { creationTime: "t1", lastSignInTime: "t1" },
  getIdToken: vi.fn(async () => "token-new"),
}

function renderPrompt(onSignedIn = vi.fn()) {
  render(<SignupPrompt sessionId="sess-1" scenarioTitle="Two Sum" onSignedIn={onSignedIn} />)
  return onSignedIn
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("SignupPrompt with the score withheld", () => {
  it("renders no score and reports the impression without one", () => {
    renderPrompt()

    expect(screen.queryByText(/%/)).toBeNull()
    const shown = trackEvent.mock.calls.find(([name]) => name === "signup_prompt_shown")
    expect(shown).toBeTruthy()
    expect(shown?.[1]).not.toHaveProperty("score")
    expect(shown?.[1]).toMatchObject({ sessionId: "sess-1" })
  })

  it("hands a popup sign-in to onSignedIn and clears the redirect-flow markers", async () => {
    signInWithGoogle.mockResolvedValueOnce({ status: "signed-in", user: popupUser })
    const onSignedIn = renderPrompt()

    fireEvent.click(screen.getByRole("button", { name: /google/i }))

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1))
    expect(onSignedIn).toHaveBeenCalledWith(popupUser)
    expect(createOrUpdateProfile).toHaveBeenCalled()
    // This path migrates in-page; a stale marker would make the next /login
    // visit re-run migration and hijack its redirect.
    expect(localStorage.getItem("pending_guest_migration")).toBeNull()
    expect(localStorage.getItem("auth_redirect")).toBeNull()

    const click = trackEvent.mock.calls.find(([name]) => name === "signup_prompt_click")
    expect(click?.[1]).not.toHaveProperty("score")
  })

  it("announces the auth attempt at the click, before the popup can resolve", async () => {
    // Firebase commits the new user via onAuthStateChanged before the popup
    // promise resolves, so any cover keyed on popup success renders one frame
    // of the signed-in view with a wrong 0% first. The page can only cover
    // that frame if it hears about the attempt at the click itself.
    const order: string[] = []
    const onAuthAttempt = vi.fn(() => {
      order.push("attempt")
    })
    signInWithGoogle.mockImplementationOnce(async () => {
      order.push("popup")
      return { status: "signed-in", user: popupUser }
    })
    createOrUpdateProfile.mockImplementationOnce(async () => {
      order.push("profile")
    })
    const onSignedIn = vi.fn(async () => {
      order.push("signedIn")
    })
    render(
      <SignupPrompt
        sessionId="sess-1"
        scenarioTitle="Two Sum"
        onSignedIn={onSignedIn}
        onAuthAttempt={onAuthAttempt}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /google/i }))

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1))
    expect(order).toEqual(["attempt", "popup", "profile", "signedIn"])
  })

  it("aborts the cover when the popup attempt fails", async () => {
    const onAuthAttempt = vi.fn()
    const onAuthAborted = vi.fn()
    signInWithGoogle.mockRejectedValueOnce(new Error("Sign-in canceled"))
    render(
      <SignupPrompt
        sessionId="sess-1"
        scenarioTitle="Two Sum"
        onSignedIn={vi.fn()}
        onAuthAttempt={onAuthAttempt}
        onAuthAborted={onAuthAborted}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /google/i }))

    await waitFor(() => expect(onAuthAborted).toHaveBeenCalledTimes(1))
    expect(onAuthAttempt).toHaveBeenCalledTimes(1)
  })

  it("leaves the /login migration flow intact when the popup is blocked", async () => {
    signInWithGitHub.mockResolvedValueOnce({ status: "redirecting" })
    const onSignedIn = renderPrompt()

    fireEvent.click(screen.getByRole("button", { name: /github/i }))

    await waitFor(() => expect(localStorage.getItem("pending_guest_migration")).not.toBeNull())
    expect(onSignedIn).not.toHaveBeenCalled()
  })
})
