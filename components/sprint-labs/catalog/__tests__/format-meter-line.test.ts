import { describe, expect, it } from "vitest"
import { formatWorkbookMeterLine } from "../format-meter-line"

describe("formatWorkbookMeterLine", () => {
  it("pluralizes sprint and ticket counts correctly", () => {
    expect(
      formatWorkbookMeterLine({
        sprintCount: 10,
        ticketCount: 50,
        estimatedHours: 58,
        level: "Mid to senior",
      })
    ).toBe("10 sprints - 50 tickets - ~58 h - Mid to senior")
  })

  it("uses the singular noun for a count of one", () => {
    expect(
      formatWorkbookMeterLine({
        sprintCount: 1,
        ticketCount: 1,
        estimatedHours: 2,
        level: "Junior / Mid",
      })
    ).toBe("1 sprint - 1 ticket - ~2 h - Junior / Mid")
  })

  it("keeps a fractional hour estimate to one decimal place", () => {
    expect(
      formatWorkbookMeterLine({
        sprintCount: 1,
        ticketCount: 2,
        estimatedHours: 2.5,
        level: "Junior / Mid",
      })
    ).toBe("1 sprint - 2 tickets - ~2.5 h - Junior / Mid")
  })
})
