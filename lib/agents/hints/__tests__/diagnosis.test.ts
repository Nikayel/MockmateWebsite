import { describe, it, expect } from "vitest"
import { buildDeterministicDiagnosis, diagnoseHintNeed } from "../diagnosis"
import type { HintGenerationRequest } from "../types"

const base: HintGenerationRequest = {
  userId: "u1",
  problemId: "p1",
  problemTitle: "Two Sum",
  problemText: "Find two numbers that add to target.",
  difficulty: "easy",
  userCode: "def solve():\n    pass",
  language: "python",
}

describe("buildDeterministicDiagnosis", () => {
  it("routes failing tests to debugging with test-failure context", () => {
    const d = buildDeterministicDiagnosis(
      { ...base, testResults: { passed: 1, total: 3, failingTests: ["case a", "case b"] } },
      "moderate",
      2
    )
    expect(d.primaryNeed).toBe("debugging")
    expect(d.shouldUseTestFailures).toBe(true)
    expect(d.shouldUseRag).toBe(false)
    expect(d.confidence).toBeGreaterThanOrEqual(0.9)
  })

  it("routes an empty editor to conceptual with pattern knowledge", () => {
    const d = buildDeterministicDiagnosis({ ...base, userCode: "   " }, "none", 1)
    expect(d.primaryNeed).toBe("conceptual")
    expect(d.shouldUsePatternKnowledge).toBe(true)
  })

  it("routes passing tests with a complexity target to optimization", () => {
    const d = buildDeterministicDiagnosis(
      {
        ...base,
        trigger: "test_passed",
        optimalComplexity: { time: "O(n)", space: "O(1)" },
        testResults: { passed: 3, total: 3, failingTests: [] },
      },
      "none",
      1
    )
    expect(d.primaryNeed).toBe("optimization")
  })

  it("defaults working-but-stuck code to approach, confidence scaled by struggle", () => {
    const mild = buildDeterministicDiagnosis({ ...base, trigger: "manual" }, "mild", 1)
    const high = buildDeterministicDiagnosis({ ...base, trigger: "manual" }, "high", 3)
    expect(mild.primaryNeed).toBe("approach")
    expect(high.confidence).toBeGreaterThan(mild.confidence)
    expect(high.recommendedLevel).toBe(3)
  })

  it("carries the metrics-derived reveal level through unchanged", () => {
    const d = buildDeterministicDiagnosis(base, "moderate", 4)
    expect(d.recommendedLevel).toBe(4)
  })

  it("diagnoseHintNeed (graph entry point) is the same mapping", async () => {
    const viaNode = await diagnoseHintNeed({
      request: base,
      struggleLevel: "mild",
      recommendedRevealLevel: 2,
    })
    expect(viaNode).toEqual(buildDeterministicDiagnosis(base, "mild", 2))
  })
})
