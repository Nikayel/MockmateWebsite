import { describe, expect, it } from "vitest"
import { buildHintFeedbackId } from "../useInterviewMetrics"

// The hook wires React state + fetch side effects; the pure, testable unit is
// the per-hint feedback key builder (node env, no React renderer).
describe("buildHintFeedbackId", () => {
  it("builds a hint key from scenario id + index", () => {
    expect(buildHintFeedbackId("two-sum", 0)).toBe("hint-two-sum-0")
    expect(buildHintFeedbackId("rate-limiter", 3)).toBe("hint-rate-limiter-3")
  })

  it("preserves the existing undefined-scenario stringification (load-bearing API key)", () => {
    // Mirrors the original `hint-${selectedScenario?.id}-${hintIndex}` behavior:
    // a missing scenario id stringifies to "undefined" and is used as the row key.
    expect(buildHintFeedbackId(undefined, 2)).toBe("hint-undefined-2")
  })
})
