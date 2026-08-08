import { describe, it, expect } from "vitest"
import { buildMetricWindow, describeWindow } from "../metric-window"

describe("describeWindow", () => {
  it("names every selectable range", () => {
    expect(describeWindow("7d")).toBe("last 7 days")
    expect(describeWindow("30d")).toBe("last 30 days")
    expect(describeWindow("90d")).toBe("last 90 days")
    expect(describeWindow("all")).toBe("all time")
  })

  it("falls back to all time rather than echoing an unknown range at the reader", () => {
    expect(describeWindow("")).toBe("all time")
    expect(describeWindow("6h")).toBe("all time")
  })
})

describe("buildMetricWindow", () => {
  const end = new Date("2026-08-08T00:00:00.000Z")

  it("carries the label and both bounds so a block can never render unscoped", () => {
    const start = new Date("2026-07-09T00:00:00.000Z")
    expect(buildMetricWindow("30d", start, end)).toEqual({
      timeRange: "30d",
      label: "last 30 days",
      startDate: "2026-07-09T00:00:00.000Z",
      endDate: "2026-08-08T00:00:00.000Z",
    })
  })

  it("reports a null start for the all-time range instead of inventing a floor", () => {
    const window = buildMetricWindow("all", null, end)
    expect(window.startDate).toBeNull()
    expect(window.label).toBe("all time")
  })
})
