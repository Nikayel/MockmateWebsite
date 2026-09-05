/**
 * @vitest-environment jsdom
 *
 * What a guest sees in the feedback slot after submitting their trial session.
 *
 * Before this component existed, guests were handed the signed-in
 * InterviewFeedbackView with every data source empty. PostHog recorded the
 * consequence on 2026-08-25: a guest who had just gone 7/7 on Two Sum clicked
 * the fallback caption "Review feedback for details" (a dead click), then
 * "Close", then bounced off /login and left. The locked panel replaces that
 * empty shell: it must SAY the score exists and is waiting behind sign-in,
 * and it must never leak the score itself or render the caption that
 * pretended to be a button.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { GuestFeedbackLock } from "../GuestFeedbackLock"

describe("GuestFeedbackLock", () => {
  it("tells the guest their debrief continues behind a free account", () => {
    render(<GuestFeedbackLock onSignIn={() => {}} scenarioTitle="Two Sum" />)

    expect(screen.getByRole("heading", { name: /continue with your interviewer/i })).toBeTruthy()
    // "Create a free account", not "sign in": the guest has no account yet,
    // and every other surface uses the create-account verb.
    expect(screen.getByText(/create a free account/i)).toBeTruthy()
    // The button sells the bundle, not the number the guest can already
    // compute from their own test results.
    expect(screen.getByRole("button", { name: /create account & continue/i })).toBeTruthy()
    // Specific and true beats vague: the server keeps a completed trial for
    // Incomplete guest sessions retain their seven-day recovery window.
    expect(screen.getByText(/saved for 7 days/i)).toBeTruthy()
  })

  it("fires onSignIn when the guest asks for their results", () => {
    const onSignIn = vi.fn()
    render(<GuestFeedbackLock onSignIn={onSignIn} scenarioTitle="Two Sum" />)

    fireEvent.click(screen.getByRole("button", { name: /create account & continue/i }))

    expect(onSignIn).toHaveBeenCalledTimes(1)
  })

  it("never renders a score value or the dead-click caption", () => {
    const { container } = render(<GuestFeedbackLock onSignIn={() => {}} scenarioTitle="Two Sum" />)

    expect(container.textContent).not.toMatch(/\d+\s*%/)
    expect(screen.queryByText(/review feedback for details/i)).toBeNull()
  })

  it("offers a retry when the account link failed after sign-in", () => {
    // A guest whose sign-in succeeded but whose migration call failed is
    // signed in with nothing to show. The panel must say the session is safe
    // and hand them a retry, never the default "create an account" pitch
    // (they already have one).
    const onSignIn = vi.fn()
    const { container } = render(
      <GuestFeedbackLock onSignIn={onSignIn} scenarioTitle="Two Sum" retry />
    )

    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy()
    expect(screen.queryByText(/create a free account/i)).toBeNull()
    expect(container.textContent).not.toMatch(/\d+\s*%/)

    fireEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(onSignIn).toHaveBeenCalledTimes(1)
  })
})
