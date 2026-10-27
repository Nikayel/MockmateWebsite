/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import PracticeFeedback from "../PracticeFeedback"
import { TooltipProvider } from "@/components/ui/tooltip"

vi.mock("@/lib/hooks/useFeedbackViewAnalytics", () => ({ useFeedbackViewAnalytics: () => {} }))
vi.mock("@/components/practice", async () => ({
  ScoreDisplay: (await import("@/components/practice/ScoreDisplay")).ScoreDisplay,
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
})
