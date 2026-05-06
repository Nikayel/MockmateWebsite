import { describe, expect, it } from "vitest"

import realWorldScenarios, {
  realWorldBugFixScenarios,
  realWorldSystemDesignScenarios,
} from "../../scenarios-realworld"

describe("real-world scenario modules", () => {
  it("keeps the legacy export order and IDs", () => {
    expect(realWorldBugFixScenarios.map((scenario) => scenario.id)).toEqual([
      "bugfix-payment-processor",
      "bugfix-rate-limiter",
      "bugfix-user-session",
    ])
    expect(realWorldSystemDesignScenarios.map((scenario) => scenario.id)).toEqual([
      "system-design-newsfeed",
    ])
  })

  it("preserves the default compatibility export", () => {
    expect(realWorldScenarios.realWorldBugFixScenarios).toBe(realWorldBugFixScenarios)
    expect(realWorldScenarios.realWorldSystemDesignScenarios).toBe(realWorldSystemDesignScenarios)
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
      } else {
        expect(scenario.constraints.length).toBeGreaterThan(0)
        expect(scenario.hints.length).toBeGreaterThan(0)
        expect(scenario.keyComponents.length).toBeGreaterThan(0)
        expect(scenario.evaluationCriteria.length).toBeGreaterThan(0)
      }
    }
  })
})
