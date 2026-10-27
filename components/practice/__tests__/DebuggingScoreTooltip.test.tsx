/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ScoreDisplay } from "../ScoreDisplay"
import { parseFeedback } from "@/lib/feedback/parsers"

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderScores(problemType = "bugfix") {
  render(
    <ScoreDisplay
      sections={parseFeedback("Your session feedback.")}
      overallScore={70}
      testsPassed={2}
      testsTotal={3}
      elapsedTime={300}
      problemType={problemType}
      scores={{ understanding: 60, problemSolving: 70, codeQuality: 80, communication: 65 }}
    />
  )
}

describe("debugging score explanations", () => {
  it("opens when the user hovers over a score card", async () => {
    renderScores()
    const card = screen.getByRole("group", { name: "Investigation score details" })
    fireEvent.pointerMove(card, { pointerType: "mouse" })
    expect((await screen.findByRole("tooltip")).textContent).toContain("File navigation")
  })
  it.each([
    ["Investigation", ["Reproduction", "File navigation", "Evidence gathering"]],
    ["Root Cause", ["Hypothesis", "Root-cause understanding", "Regression prevention"]],
    ["Fix Quality", ["Patch scope", "Verification", "Edit control"]],
    ["Communication", ["Communication clarity", "AI collaboration"]],
  ])("explains %s on keyboard focus and dismisses with Escape", async (label, dimensions) => {
    renderScores()
    const card = screen.getByRole("group", { name: `${label} score details` })
    act(() => card.focus())
    const tooltip = await screen.findByRole("tooltip")
    for (const dimension of dimensions) {
      expect(within(tooltip).getByText(new RegExp(`^${dimension} ·`))).toBeTruthy()
    }
    expect(tooltip.textContent).toContain("This card averages its subcategories")
    if (label === "Communication") {
      expect(tooltip.textContent).toContain("neutral 50/100")
    }
    fireEvent.keyDown(card, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull())
  })

  it("shows the actual combined overall weights", () => {
    renderScores()
    for (const weight of [30, 28, 32, 10]) {
      expect(screen.getByLabelText(`${weight}% combined overall weight`)).toBeTruthy()
    }
  })

  it.each(["dsa", "system-design"])("keeps debugging criteria off %s cards", (type) => {
    renderScores(type)
    expect(screen.queryByRole("group", { name: /score details/ })).toBeNull()
    expect(screen.queryByText("Reproduction")).toBeNull()
  })
})
