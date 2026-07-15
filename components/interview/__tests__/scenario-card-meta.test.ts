import { describe, it, expect } from "vitest"
import { getScenarioCardContext } from "../scenario-card-meta"
import type { Scenario } from "@/lib/scenarios"

const base = {
  id: "x",
  title: "Sample",
  difficulty: "easy" as const,
  companies: [],
  description: "Base description",
  tags: [],
  estimatedTime: 20,
}

describe("getScenarioCardContext", () => {
  it("surfaces a bugfix symptom and real-codebase scope", () => {
    const scenario = {
      ...base,
      type: "bugfix",
      problemStatement: "",
      observedSymptoms: ["Checkout returns 500 on empty cart"],
      bugfixKind: "real-codebase",
      buggyCode: {},
      codebaseFiles: { typescript: [{ fileName: "a.ts", content: "", description: "" }] },
      expectedBehavior: "",
      bugDescription: "",
      hints: [],
      testCases: [],
    } as unknown as Scenario

    const ctx = getScenarioCardContext(scenario)
    expect(ctx.typeLabel).toBe("Bug Fix")
    expect(ctx.contextLine).toBe("Checkout returns 500 on empty cart")
    expect(ctx.signal).toBe("Real codebase · 1 file")
  })

  it("falls back to user report for bugfix", () => {
    const scenario = {
      ...base,
      type: "bugfix",
      problemStatement: "",
      userReport: "It crashes sometimes",
      buggyCode: {},
      codebaseFiles: {},
      expectedBehavior: "",
      bugDescription: "Null deref",
      hints: [],
      testCases: [],
    } as unknown as Scenario

    expect(getScenarioCardContext(scenario).contextLine).toBe("It crashes sometimes")
  })

  it("never surfaces bugDescription on the card, even with no symptoms or report", () => {
    const scenario = {
      ...base,
      type: "bugfix",
      problemStatement: "",
      buggyCode: {},
      codebaseFiles: {},
      expectedBehavior: "",
      bugDescription: "Null deref in checkout",
      hints: [],
      testCases: [],
    } as unknown as Scenario

    expect(getScenarioCardContext(scenario).contextLine).toBe("Base description")
  })

  it("labels micro-debugging bugfixes as a focused bug", () => {
    const scenario = {
      ...base,
      type: "bugfix",
      problemStatement: "",
      bugfixKind: "micro-debugging",
      buggyCode: {},
      codebaseFiles: {},
      expectedBehavior: "",
      bugDescription: "off-by-one",
      hints: [],
      testCases: [],
    } as unknown as Scenario

    expect(getScenarioCardContext(scenario).signal).toBe("Focused bug")
  })

  it("shows the DSA pattern and complexity target", () => {
    const scenario = {
      ...base,
      type: "dsa",
      pattern: "arrays-hashing",
      problemStatement: "",
      examples: [],
      constraints: [],
      hints: [],
      starterCode: {},
      optimalComplexity: { time: "O(n)", space: "O(n)" },
      testCases: [],
    } as unknown as Scenario

    const ctx = getScenarioCardContext(scenario)
    expect(ctx.typeLabel).toBe("DSA")
    expect(ctx.contextLine).toBe("Arrays Hashing pattern")
    expect(ctx.signal).toBe("O(n) target")
  })
})
