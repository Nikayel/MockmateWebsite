/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { EscapedDefectCurve } from "../EscapedDefectCurve"
import type { EscapedRatePoint } from "../session-attempts"

afterEach(cleanup)

const POINTS: EscapedRatePoint[] = [
  { ticketKey: "MER-301", rate: 0.4, graded: true },
  { ticketKey: "MER-302", rate: 0.2, graded: true },
  { ticketKey: "MER-303", rate: 0.5, graded: false },
]

describe("EscapedDefectCurve", () => {
  it("carries a visually-hidden text-alternative table so the numbers are never picture-only", () => {
    render(<EscapedDefectCurve points={POINTS} />)
    const table = document.querySelector("table.sr-only")
    expect(table).not.toBeNull()
    expect(table?.textContent).toContain("MER-301")
    expect(table?.textContent).toContain("40%")
  })

  it("renders one plotted point per ticket with a rate", () => {
    render(<EscapedDefectCurve points={POINTS} />)
    expect(screen.getAllByText(/^MER-30\d:/)).toHaveLength(3) // <title> text per circle
  })

  it("omits a ticket whose hidden gate never ran (rate null) from both the chart and the table", () => {
    const withGap: EscapedRatePoint[] = [
      ...POINTS,
      { ticketKey: "MER-304", rate: null, graded: true },
    ]
    render(<EscapedDefectCurve points={withGap} />)
    const table = document.querySelector("table.sr-only")
    expect(table?.textContent).not.toContain("MER-304")
  })

  it("has an accessible name on the chart itself", () => {
    render(<EscapedDefectCurve points={POINTS} />)
    expect(screen.getByRole("img", { name: /escaped defect rate/i })).not.toBeNull()
  })
})
