import { describe, expect, it } from "vitest"
import { existsSync } from "node:fs"
import { join } from "node:path"

import realWorldScenarios, {
  realWorldBugFixScenarios,
  realWorldSystemDesignScenarios,
} from "../../scenarios-realworld"
import { scenarios } from "../../scenarios"
import { validateBugfixScenarioQuality } from "../bugfix-quality"
import { validateWorkspaceScenario, isWorkspaceScenario } from "../../workspace-execution"

describe("real-world scenario modules", () => {
  const publicBugfixIds = [
    "bugfix-search-race",
    "bugfix-billing-webhook-idempotency",
    "bugfix-api-rate-limiter-workspace",
    "bugfix-comment-thread-merge",
    "bugfix-event-aggregation-retries",
    "bugfix-feature-pipeline-nan-workspace",
  ]

  it("keeps the legacy export order and IDs", () => {
    expect(realWorldBugFixScenarios.map((scenario) => scenario.id)).toEqual(publicBugfixIds)
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
    ).toEqual(publicBugfixIds)
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

  it("publishes only sophisticated workspace bugfix scenarios", () => {
    for (const scenario of realWorldBugFixScenarios) {
      const languages = Object.keys(scenario.buggyCode)

      expect(languages).toHaveLength(1)
      expect(isWorkspaceScenario(scenario)).toBe(true)
      if (!isWorkspaceScenario(scenario)) continue

      expect(validateWorkspaceScenario(scenario)).toEqual([])
      expect(scenario.workspace.files.some((file) => file.role === "docs")).toBe(true)
      expect(scenario.workspace.editableFilePaths.length).toBeGreaterThanOrEqual(1)
      expect(scenario.workspace.visibleTestPaths.length).toBeGreaterThanOrEqual(1)
      expect(scenario.workspace.hiddenTestPaths.length).toBeGreaterThanOrEqual(1)
      expect(validateBugfixScenarioQuality(scenario)).toEqual([])

      for (const testCase of scenario.testCases) {
        expect(testCase.input).toBeTruthy()
        expect(typeof testCase.input).toBe("object")
        expect(testCase.expected).not.toBeUndefined()
        expect(() => JSON.stringify(testCase.input)).not.toThrow()
        expect(() => JSON.stringify(testCase.expected)).not.toThrow()
      }
    }
  })

  it("does not keep the deleted legacy System A bugfix bank in the repo", () => {
    expect(existsSync(join(process.cwd(), "lib/scenarios/bugfix"))).toBe(false)
  })
})
