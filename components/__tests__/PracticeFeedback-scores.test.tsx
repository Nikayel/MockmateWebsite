/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import PracticeFeedback from "../PracticeFeedback"
import { TooltipProvider } from "@/components/ui/tooltip"

vi.mock("@/lib/hooks/useFeedbackViewAnalytics", () => ({ useFeedbackViewAnalytics: () => {} }))
vi.mock("@/components/practice/FeedbackSections", () => ({
  FeedbackSections: () => null,
}))
afterEach(cleanup)

describe("feedback score scale", () => {
  it.each([0, 5, 10, 11, 100])(
    "preserves a backend score of %s / 100 through the real score card",
    (score) => {
      render(
        <TooltipProvider>
          <PracticeFeedback
            feedback="Your root cause explanation was missing."
            performanceScore={score}
            testsPassed={0}
            testsTotal={1}
            scoreBreakdown={{
              understandingScore: score,
              problemSolvingScore: score,
              codeQualityScore: score,
              communicationScore: score,
            }}
            problemType="bugfix"
          />
        </TooltipProvider>
      )
      expect(screen.getByRole("status").textContent).toContain(`Score: ${score}/100`)
      expect(screen.queryByText("Bug Found")).toBeNull()
      expect(screen.getAllByText("Root Cause")).toHaveLength(1) // Category label, no inferred success badge.
    }
  )

  it("scales explicit /10 text once at the parser boundary", () => {
    render(
      <TooltipProvider>
        <PracticeFeedback
          feedback={"Understanding: 1/10\nCommunication: 1/10"}
          performanceScore={10}
          testsPassed={1}
          testsTotal={1}
        />
      </TooltipProvider>
    )
    expect(screen.getByRole("status").textContent).toContain("Score: 10/100")
    expect(screen.getAllByText("10%").length).toBeGreaterThanOrEqual(2)
  })

  it("shows one result with separate test evidence, then expands only the score details", () => {
    const summary = "All 4 tests passed, but explain the scheduling approach and its complexity."
    render(
      <TooltipProvider>
        <PracticeFeedback
          feedback={summary}
          structuredFeedback={{ tldr: summary }}
          performanceScore={50}
          technicalScore={80}
          testsPassed={4}
          testsTotal={4}
          elapsedTime={95}
          problemTitle="Add Notification Digest Scheduling"
          difficulty="hard"
          sessionDate="October 1, 2026"
        />
      </TooltipProvider>
    )
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("heading", { name: "Add Notification Digest Scheduling" })).toBeTruthy()
    expect(screen.getAllByText(summary)).toHaveLength(1)
    expect(screen.getAllByLabelText("50 out of 100")).toHaveLength(1)
    expect(screen.getByText("Grade D")).toBeTruthy()
    expect(screen.getByText("4/4 passed")).toBeTruthy()
    expect(screen.getByText("2 min")).toBeTruthy()
    const disclosure = screen.getByText("Score breakdown", { selector: "summary" })
    expect(disclosure.parentElement?.hasAttribute("open")).toBe(false)
    fireEvent.click(disclosure)
    expect(disclosure.parentElement?.hasAttribute("open")).toBe(true)
    expect(within(disclosure.parentElement!).queryByText(summary)).toBeNull()
    expect(screen.getByText("Technical score: 80/100")).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Overall" })).toBeNull()
  })

  it("does not present synthetic test counts as system-design correctness", () => {
    render(
      <PracticeFeedback
        feedback="Discuss the capacity assumptions."
        performanceScore={60}
        testsPassed={1}
        testsTotal={1}
        problemType="system-design"
      />
    )
    expect(screen.queryByText("1/1 passed")).toBeNull()
    expect(screen.queryByText("Tests", { exact: true })).toBeNull()
  })
})
