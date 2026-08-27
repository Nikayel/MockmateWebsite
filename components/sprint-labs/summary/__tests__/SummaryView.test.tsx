/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { SummaryView } from "../SummaryView"
import type { WorkbookSummaryState } from "../useWorkbookSummaryData"

afterEach(cleanup)

function baseState(overrides: Partial<WorkbookSummaryState> = {}): WorkbookSummaryState {
  return {
    phase: "ready",
    ticketsShipped: 3,
    pointsShipped: 15,
    objectives: [],
    escapedRatePoints: [],
    gradedCount: 2,
    assistedCount: 1,
    unassistedGradedCount: 2,
    reviewOnlyGradedCount: 0,
    gradedEscapedRatePercent: 12,
    scoredAt: "2026-08-26T00:00:00.000Z",
    modelId: "claude-x-y",
    ...overrides,
  }
}

describe("SummaryView", () => {
  it("shows an honest empty state when nothing has been graded, not a zeroed chart", () => {
    render(<SummaryView workbookTitle="Meridian" state={baseState({ phase: "empty" })} />)
    expect(screen.getByText(/No graded attempts yet/)).not.toBeNull()
  })

  it("shows the 'not enough for a curve' line rather than drawing a trend from one point", () => {
    render(
      <SummaryView
        workbookTitle="Meridian"
        state={baseState({
          escapedRatePoints: [{ ticketKey: "MER-303", rate: 0.2, graded: true }],
        })}
      />
    )
    expect(
      screen.getByText("Two graded tickets are enough for a curve. You have 1.")
    ).not.toBeNull()
  })

  it("draws the curve once at least two graded points exist", () => {
    render(
      <SummaryView
        workbookTitle="Meridian"
        state={baseState({
          escapedRatePoints: [
            { ticketKey: "MER-303", rate: 0.4, graded: true },
            { ticketKey: "MER-304", rate: 0.1, graded: true },
          ],
        })}
      />
    )
    expect(screen.getByRole("img", { name: /escaped defect rate/i })).not.toBeNull()
  })

  it("labels the graded vs assisted series distinctly", () => {
    render(<SummaryView workbookTitle="Meridian" state={baseState()} />)
    expect(screen.getByText(/Graded line: unassisted and review only attempts\./)).not.toBeNull()
    expect(screen.getByText(/Dotted line: assisted attempts, feedback only\./)).not.toBeNull()
  })

  it("passes the model id and policy split through to the share artifact card", () => {
    render(<SummaryView workbookTitle="Meridian" state={baseState()} />)
    expect(document.body.textContent).toContain("model claude-x-y")
    expect(document.body.textContent).toContain("2 unassisted")
  })
})
