/**
 * @vitest-environment jsdom
 */
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { GateResult } from "@/lib/sprint-labs/types"
import { SubmitView } from "../SubmitView"
import type { SubmitScreenState } from "../useSubmitScreenController"

afterEach(cleanup)

function baseState(overrides: Partial<SubmitScreenState> = {}): SubmitScreenState {
  return {
    phase: "confirm-first",
    gateResults: null,
    escapedDefects: [],
    aiPolicy: null,
    submissionsRemaining: null,
    reviewComments: null,
    errorMessage: null,
    cooldownSecondsRemaining: 0,
    start: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  }
}

const RESULTS: GateResult[] = [
  {
    gate: "visible",
    cases: [{ testId: "v", humanName: "10/10 visible tests passed", passed: true }],
  },
  { gate: "hidden", cases: [] },
  { gate: "regression", cases: [] },
  { gate: "adversary", cases: [] },
]

describe("SubmitView", () => {
  it("shows the non-dismissible finalize notice before a first submission, gated behind an explicit action", () => {
    const state = baseState({ phase: "confirm-first" })
    render(<SubmitView workbookId="meridian" ticketKey="MER-305" state={state} />)
    expect(screen.getByText(/This finalizes your score for MER-305\./)).not.toBeNull()
    expect(
      screen.getByText(/Escaped defect names and the reference diff unlock after it\./)
    ).not.toBeNull()
    const button = screen.getByRole("button", { name: "Submit MER-305" })
    button.click()
    expect(state.start).toHaveBeenCalledTimes(1)
  })

  it("shows the practice-run framing when a prior result isn't available in this session", () => {
    const state = baseState({ phase: "confirm-practice" })
    render(<SubmitView workbookId="meridian" ticketKey="MER-305" state={state} />)
    expect(screen.getByText(/not available in this browser session/)).not.toBeNull()
    expect(screen.getByRole("button", { name: "Run practice attempt" })).not.toBeNull()
  })

  it("shows the budget-exceeded panel with no retry-timer copy (the cap never resets)", () => {
    render(
      <SubmitView
        workbookId="meridian"
        ticketKey="MER-305"
        state={baseState({ phase: "budget-exceeded" })}
      />
    )
    expect(screen.getByText(/No submissions left on MER-305\./)).not.toBeNull()
  })

  it("shows a live, disabled-while-ticking cooldown countdown", () => {
    render(
      <SubmitView
        workbookId="meridian"
        ticketKey="MER-305"
        state={baseState({ phase: "cooldown", cooldownSecondsRemaining: 102 })}
      />
    )
    expect(screen.getByText("Next submission in 1:42.")).not.toBeNull()
    const button = screen.getByRole("button", { name: "Submit MER-305" }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it("shows the error panel with a retry action", () => {
    const state = baseState({ phase: "error", errorMessage: "Couldn't grade this submission." })
    render(<SubmitView workbookId="meridian" ticketKey="MER-305" state={state} />)
    expect(screen.getByText("Couldn't grade this submission.")).not.toBeNull()
    screen.getByRole("button", { name: "Retry" }).click()
    expect(state.retry).toHaveBeenCalledTimes(1)
  })

  it("labels an assisted attempt as feedback-only and routes the CTA to the retro once settled", () => {
    vi.useFakeTimers()
    render(
      <SubmitView
        workbookId="meridian"
        ticketKey="MER-305"
        state={baseState({
          phase: "active",
          gateResults: RESULTS,
          escapedDefects: [],
          aiPolicy: "assisted",
          submissionsRemaining: 4,
        })}
      />
    )
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByText(/Assisted attempt\. This result is feedback/)).not.toBeNull()
    const cta = screen.getByRole("link", { name: "See the retro" })
    expect(cta.getAttribute("href")).toBe("/sprint-labs/meridian/run/ticket/MER-305/retro")
    vi.useRealTimers()
  })

  it("routes to the review round instead of the retro when review comments are present", () => {
    vi.useFakeTimers()
    render(
      <SubmitView
        workbookId="meridian"
        ticketKey="MER-305"
        state={baseState({
          phase: "active",
          gateResults: RESULTS,
          escapedDefects: [],
          submissionsRemaining: 4,
          reviewComments: [{ id: "c1", body: "text" }],
        })}
      />
    )
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    const cta = screen.getByRole("link", { name: "See the review" })
    expect(cta.getAttribute("href")).toBe("/sprint-labs/meridian/run/ticket/MER-305/review")
    vi.useRealTimers()
  })
})
