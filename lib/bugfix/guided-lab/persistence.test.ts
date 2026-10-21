import { describe, expect, it } from "vitest"
import { parseGuidedLabProgress } from "./persistence"
import { initialGuidedLabProgress } from "./gating"
import { bookclubGuidedLab } from "@/lib/scenarios/real-world/bugfix/bookclub/milestones"

describe("saved guided progress", () => {
  it("accepts complete versioned progress", () => {
    const saved = initialGuidedLabProgress(bookclubGuidedLab, "today")
    expect(parseGuidedLabProgress(saved)).toEqual(saved)
  })
  it.each([
    null,
    [],
    { version: "bookclub-guided-v2" },
    { version: "unknown" },
    { milestoneStatus: { phase: "surprise" } },
  ])("rejects malformed storage without crashing", (value) => {
    expect(parseGuidedLabProgress(value)).toBeNull()
  })
})

import { restoreGuidedLabProgress } from "./progress-state"

it("resets semantically inconsistent progress instead of rendering phase zero", () => {
  const saved = initialGuidedLabProgress(bookclubGuidedLab, "today")
  saved.milestoneStatus["m1-investigate"] = "locked"
  expect(
    restoreGuidedLabProgress(bookclubGuidedLab, saved, "now").milestoneStatus["m1-investigate"]
  ).toBe("active")
  saved.milestoneStatus["m3-history"] = "done"
  expect(
    restoreGuidedLabProgress(bookclubGuidedLab, saved, "now").milestoneStatus["m3-history"]
  ).toBe("locked")
})
