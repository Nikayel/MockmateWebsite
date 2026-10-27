import { describe, expect, it } from "vitest"
import { analyzeCodeEfficiency } from "../code-analysis"

describe("heuristic code analysis", () => {
  it("does not treat passing correctness tests as proof of optimal complexity", () => {
    const code = "for (const a of values) { for (const b of values) { total += a * b; } }"
    const result = analyzeCodeEfficiency(code, { time: "O(n)" }, { testPassRate: 100 })
    expect(result.estimatedTimeComplexity).toBe("O(n²)")
    expect(result.analysisSource).toBe("heuristic")
    expect(result.confidence).toBe("low")
  })

  it("does not award efficiency from regexes or penalize the number of source lines", () => {
    const short = analyzeCodeEfficiency("return values")
    const long = analyzeCodeEfficiency("if (value) { total += value }\n".repeat(50))
    expect(short.efficiencyScore).toBe(50)
    expect(long.efficiencyScore).toBe(short.efficiencyScore)
  })
})
