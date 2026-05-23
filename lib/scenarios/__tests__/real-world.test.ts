import { describe, expect, it } from "vitest"

import realWorldScenarios, {
  realWorldBugFixScenarios,
  realWorldSystemDesignScenarios,
} from "../../scenarios-realworld"
import { scenarios } from "../../scenarios"

describe("real-world scenario modules", () => {
  it("keeps the legacy export order and IDs", () => {
    expect(realWorldBugFixScenarios.map((scenario) => scenario.id)).toEqual([
      "bugfix-python-two-sum",
      "bugfix-rate-limiter",
    ])
    expect(realWorldSystemDesignScenarios.map((scenario) => scenario.id)).toEqual([
      "system-design-newsfeed",
    ])
  })

  it("preserves the default compatibility export", () => {
    expect(realWorldScenarios.realWorldBugFixScenarios).toBe(realWorldBugFixScenarios)
    expect(realWorldScenarios.realWorldSystemDesignScenarios).toBe(realWorldSystemDesignScenarios)
  })

  it("only mounts runnable real-world bugfix scenarios in the public registry", () => {
    expect(
      scenarios.filter((scenario) => scenario.type === "bugfix").map((scenario) => scenario.id)
    ).toEqual(["bugfix-python-two-sum", "bugfix-rate-limiter"])
  })

  it("exports complete scenario records for consumers", () => {
    for (const scenario of [...realWorldBugFixScenarios, ...realWorldSystemDesignScenarios]) {
      expect(scenario.title).toBeTruthy()
      expect(scenario.type).toBeTruthy()
      expect(scenario.difficulty).toBeTruthy()
      expect(scenario.problemStatement).toBeTruthy()

      if (scenario.type === "bugfix") {
        expect(scenario.hints.length).toBeGreaterThan(0)
        expect(Object.keys(scenario.buggyCode).length).toBeGreaterThan(0)
        expect(scenario.testCases.length).toBeGreaterThan(0)
        expect(scenario.expectedBehavior).toBeTruthy()
        expect(scenario.bugDescription).toBeTruthy()
      } else {
        expect(scenario.constraints.length).toBeGreaterThan(0)
        expect(scenario.hints.length).toBeGreaterThan(0)
        expect(scenario.keyComponents.length).toBeGreaterThan(0)
        expect(scenario.evaluationCriteria.length).toBeGreaterThan(0)
      }
    }
  })

  it("keeps v1 bugfix mini-codebases small and executable through current scenario shape", () => {
    for (const scenario of realWorldBugFixScenarios) {
      const primaryLanguage = scenario.id === "bugfix-python-two-sum" ? "python" : "javascript"
      const codebaseFiles = scenario.codebaseFiles[primaryLanguage] || []
      const totalFiles = 1 + codebaseFiles.length

      expect(scenario.buggyCode[primaryLanguage]).toBeTruthy()
      expect(totalFiles).toBeGreaterThanOrEqual(3)
      expect(totalFiles).toBeLessThanOrEqual(5)
      expect(codebaseFiles.some((file) => file.fileName.toLowerCase().includes("test"))).toBe(true)
    }

    const easyScenario = realWorldBugFixScenarios.find(
      (scenario) => scenario.id === "bugfix-python-two-sum"
    )
    const rateLimiterScenario = realWorldBugFixScenarios.find(
      (scenario) => scenario.id === "bugfix-rate-limiter"
    )

    expect(easyScenario?.buggyCode.python).toContain("def two_sum")
    expect(rateLimiterScenario?.buggyCode.javascript).toContain("class RateLimiter")
  })
})
