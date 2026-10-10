/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { useNextPractice } from "@/lib/hooks/useNextPractice"

const mocks = vi.hoisted(() => ({
  result: { status: "loading" } as ReturnType<typeof useNextPractice>["result"],
  retry: vi.fn(),
  track: vi.fn(),
}))
vi.mock("@/lib/hooks/useNextPractice", () => ({ useNextPractice: () => mocks }))
vi.mock("@/lib/analytics", () => ({ trackEvent: mocks.track }))
vi.mock("../PracticeSaveControls", () => ({ PracticeSaveControls: () => null }))
import { NextPracticeCard } from "../NextPracticeCard"
beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(cleanup)

describe("next task card", () => {
  it("links to the exact task and language and records only bounded metadata", () => {
    mocks.result = {
      status: "ready",
      recommendation: {
        scenarioId: "next",
        title: "A different task",
        type: "bugfix",
        difficulty: "medium",
        estimatedMinutes: 20,
        href: "/interview?scenario=next&source=next-practice&fromSession=source&language=python",
        reason: "Common debugging skills",
        focus: "Reproduce first",
        focusSource: "bugfix-evidence",
        feedbackNote: "Original private feedback",
      },
    }
    render(<NextPracticeCard sessionId="source" />)
    const link = screen.getByRole("link", { name: /open practice/i })
    expect(link.getAttribute("href")).toBe(mocks.result.recommendation.href)
    expect(screen.getByText(/about 20 minutes/i)).toBeTruthy()
    expect(screen.getByText(/opening uses no sessions/i)).toBeTruthy()
    expect(screen.getByText("Bug Fix")).toBeTruthy()
    const note = screen.getByText("Original private feedback").closest("details")!
    expect(note.open).toBe(false)
    fireEvent.click(screen.getByText("From your feedback"))
    expect(note.open).toBe(true)
    link.addEventListener("click", (event) => event.preventDefault())
    fireEvent.click(link)
    expect(mocks.track).toHaveBeenCalledWith("next_practice_click", {
      source_session_id: "source",
      scenario_id: "next",
      scenario_type: "bugfix",
      focus_source: "bugfix-evidence",
      recommendation_source: "feedback",
    })
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain("private feedback")
  })

  it.each(["signed_out", "not_found"] as const)("hides %s recommendations", (status) => {
    mocks.result = { status }
    const { container } = render(<NextPracticeCard sessionId="source" />)
    expect(container.textContent).toBe("")
  })

  it.each(["not_ready", "error", "unavailable"] as const)("offers recovery for %s", (status) => {
    mocks.result = { status }
    render(<NextPracticeCard sessionId="source" />)
    fireEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(mocks.retry).toHaveBeenCalledTimes(1)
  })

  it.each(["loading", "reauth_required", "no_match"] as const)(
    "renders a truthful %s state",
    (status) => {
      mocks.result = { status }
      render(<NextPracticeCard sessionId="source" />)
      expect(screen.getByRole("region", { name: "Your next practice" })).toBeTruthy()
      expect(screen.queryByRole("link", { name: /open practice/i })).toBeNull()
    }
  )
})
