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
  render(
    <SignupPrompt
      sessionId="sess-1"
      scenarioId="scenario-1"
      scenarioTitle="Two Sum"
      onSignedIn={onSignedIn}
    />
  )
  return onSignedIn
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("SignupPrompt dialog semantics", () => {
  // The first version was a hand-rolled overlay: no role, no focus trap, no
  // Escape — a screen reader was never told a modal opened, and keyboard
  // focus stayed on the lock button underneath. The Radix Dialog the ui kit
  // already ships provides all of it.
  it("is a real dialog and Escape dismisses it", async () => {
    const onDismiss = vi.fn()
    render(
      <SignupPrompt
        sessionId="sess-1"
        scenarioId="scenario-1"
        scenarioTitle="Two Sum"
        onSignedIn={vi.fn()}
        onDismiss={onDismiss}
      />
    )

    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeTruthy()

    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1))
  })
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
        scenarioId="scenario-1"
        scenarioTitle="Two Sum"
        onSignedIn={onSignedIn}
        onAuthAttempt={onAuthAttempt}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /google/i }))

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1))
    expect(order).toEqual(["attempt", "popup", "profile", "signedIn"])
  })

  it("does NOT abort the cover when the failure came after a successful sign-in", async () => {
    // The page's onSignedIn sets guestConversion to "failed" and rethrows on
    // a migrate failure. Calling onAuthAborted here would overwrite "failed"
    // with "idle" in the same task — un-mounting the modal and stranding the
    // signed-in convert on the empty feedback shell with no retry surface.
    // onAuthAborted means "the attempt ended WITHOUT a user"; a migrate
    // failure after auth is the opposite.
    signInWithGoogle.mockResolvedValueOnce({ status: "signed-in", user: popupUser })
    const onAuthAborted = vi.fn()
    const onSignedIn = vi.fn(async () => {
      throw new Error("migrate failed")
    })
    render(
      <SignupPrompt
        sessionId="sess-1"
        scenarioId="scenario-1"
        scenarioTitle="Two Sum"
        onSignedIn={onSignedIn}
        onAuthAborted={onAuthAborted}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /google/i }))

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1))
    expect(onAuthAborted).not.toHaveBeenCalled()
    // The /login retry lane survives too: the markers are only cleared once
    // the whole handoff succeeded.
    expect(localStorage.getItem("pending_guest_migration")).not.toBeNull()
  })

  it("aborts the cover when the popup attempt fails", async () => {
    const onAuthAttempt = vi.fn()
    const onAuthAborted = vi.fn()
    signInWithGoogle.mockRejectedValueOnce(new Error("Sign-in canceled"))
    render(
      <SignupPrompt
        sessionId="sess-1"
        scenarioId="scenario-1"
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

  it("clears the stale auth_redirect when the popup is closed, but keeps the migration marker", async () => {
    // A closed popup must not leave auth_redirect pointing at this trial's
    // results: the guest's next /login visit could get hijacked toward a
    // session they never finished. pending_guest_migration survives so a
    // later /login visit still migrates the guest identity.
    signInWithGoogle.mockRejectedValueOnce(new Error("Sign-in canceled"))
    renderPrompt()

    fireEvent.click(screen.getByRole("button", { name: /google/i }))

    await waitFor(() => expect(localStorage.getItem("auth_redirect")).toBeNull())
    expect(localStorage.getItem("pending_guest_migration")).not.toBeNull()
  })

  it("also clears auth_redirect on a resolved outcome that is neither signed-in nor redirecting", async () => {
    // Defensive branch: signInWithGoogle/GitHub only ever resolve "signed-in"
    // or "redirecting" today, but this component still guards a stray third
    // outcome, and it must not leave the stale marker behind either.
    signInWithGoogle.mockResolvedValueOnce({ status: "cancelled" } as never)
    renderPrompt()

    fireEvent.click(screen.getByRole("button", { name: /google/i }))

    await waitFor(() => expect(localStorage.getItem("auth_redirect")).toBeNull())
    expect(localStorage.getItem("pending_guest_migration")).not.toBeNull()
  })

  it("leaves the /login migration flow intact when the popup is blocked", async () => {
    signInWithGitHub.mockResolvedValueOnce({ status: "redirecting" })
    const onSignedIn = renderPrompt()

    fireEvent.click(screen.getByRole("button", { name: /github/i }))

    await waitFor(() => expect(localStorage.getItem("pending_guest_migration")).not.toBeNull())
    expect(JSON.parse(localStorage.getItem("pending_guest_migration") || "{}")).toEqual({
      guestId: "guest-1",
      sessionId: "sess-1",
      scenarioId: "scenario-1",
    })
    expect(localStorage.getItem("auth_redirect")).toBe(
      "interview?session=sess-1&scenario=scenario-1&postInterview=true&startDebrief=true"
    )
    expect(onSignedIn).not.toHaveBeenCalled()
  })
})
