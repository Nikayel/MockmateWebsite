/**
 * @vitest-environment jsdom
 *
 * PostHog caught a real guest dead-clicking the "Two Sum" ROW in this modal:
 * the row highlights on hover and carries a Play icon, so it reads as
 * clickable, but only the small ghost Start button (opacity-0 until group
 * hover) did anything — and on touch devices there is no hover, so the only
 * affordance was permanently invisible. The row must start the problem
 * itself, and the button must be visible without a pointer that can hover.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RoadmapModal } from "../RoadmapModal"
import { PATTERN_ROADMAP } from "@/lib/types/dsa-patterns"

const nodeId = PATTERN_ROADMAP[0].id
const scenario = {
  id: "dsa-two-sum",
  title: "Two Sum",
  difficulty: "easy",
  estimatedTime: 20,
  type: "dsa",
} as never

function renderModal(overrides: Record<string, unknown> = {}) {
  const onStartInterview = vi.fn()
  const onClose = vi.fn()
  render(
    <RoadmapModal
      expandedNode={nodeId}
      nodeStats={
        { [nodeId]: { scenarios: [scenario], completed: 0, total: 1, percentage: 0 } } as never
      }
      completedProblems={[]}
      onClose={onClose}
      onStartInterview={onStartInterview}
      getPatternPrerequisites={() => []}
      {...overrides}
    />
  )
  return { onStartInterview, onClose }
}

describe("RoadmapModal problem rows", () => {
  it("starts the problem when the row itself is clicked", () => {
    const { onStartInterview, onClose } = renderModal()

    fireEvent.click(screen.getByText("Two Sum"))

    expect(onStartInterview).toHaveBeenCalledTimes(1)
    expect(onStartInterview.mock.calls[0][0]).toMatchObject({ id: "dsa-two-sum" })
    expect(onClose).toHaveBeenCalled()
  })

  it("keeps the Start button visible without hover, for touch devices", () => {
    renderModal()

    const startButton = screen.getByRole("button", { name: /^start$/i })
    // Hidden-until-hover is a desktop-only enhancement; the base state must
    // be visible or touch users have no affordance at all.
    expect(startButton.className).toContain("opacity-100")
    expect(startButton.className).not.toMatch(/(?:^|\s)opacity-0(?:\s|$)/)
  })

  it("does not double-start when the button inside the row is clicked", () => {
    const { onStartInterview } = renderModal()

    fireEvent.click(screen.getByRole("button", { name: /^start$/i }))

    expect(onStartInterview).toHaveBeenCalledTimes(1)
  })
})
