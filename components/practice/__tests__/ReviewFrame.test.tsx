/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ReviewFrame } from "../ReviewFrame"
import { ReviewSummary, ReviewClose } from "../ReviewSummary"

describe("ReviewFrame", () => {
  it("keeps summary and actions outside the keyboard-scrollable report", () => {
    const onClose = vi.fn()
    render(
      <ReviewFrame
        title="Interview feedback"
        summary={
          <ReviewSummary
            score={73}
            grade="C"
            testsPassed={8}
            testsTotal={12}
            elapsedTime={960}
            problemTitle="Cache cleanup"
          />
        }
        actions={<ReviewClose onClose={onClose} />}
      >
        <p>Detailed report</p>
      </ReviewFrame>
    )
    const content = screen.getByRole("region", { name: "Interview feedback content" })
    expect(content.tabIndex).toBe(0)
    expect(content.contains(screen.getByText("Detailed report"))).toBe(true)
    expect(content.contains(screen.getByRole("heading", { name: "Interview feedback" }))).toBe(
      false
    )
    expect(content.contains(screen.getByRole("button", { name: "Done" }))).toBe(false)
    expect(screen.getByText("8/12 tests · 16 min")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("leaves saved-session reports in normal document flow", () => {
    render(
      <ReviewFrame title="Saved feedback" contained={false}>
        <p>Report</p>
      </ReviewFrame>
    )
    const content = screen.getByRole("region", { name: "Saved feedback content" })
    expect(content.getAttribute("tabindex")).toBeNull()
    expect(content.className).not.toContain("overflow-y-auto")
  })
})
