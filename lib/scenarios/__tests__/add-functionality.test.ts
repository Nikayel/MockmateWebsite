import { describe, expect, it } from "vitest"

import { addFunctionalityScenarios } from "../add-functionality"
import { scenarios } from "../../scenarios"
import { isWorkspaceScenario, validateWorkspaceScenario } from "../../workspace-execution"

describe("add functionality scenarios", () => {
  const publicFeatureIds = [
    "add-feature-support-ticket-search",
    "add-feature-digest-scheduler",
    "palantir-911-dispatch-build",
    "palantir-ontology-org-build",
  ]

  it("publishes the curated workspace feature scenarios", () => {
    expect(addFunctionalityScenarios.map((scenario) => scenario.id)).toEqual(publicFeatureIds)
    expect(
      scenarios
        .filter((scenario) => scenario.type === "add-functionality")
        .map((scenario) => scenario.id)
    ).toEqual(publicFeatureIds)
  })

  it("keeps feature scenarios multi-file, Python, and test-backed", () => {
    for (const scenario of addFunctionalityScenarios) {
      expect(isWorkspaceScenario(scenario)).toBe(true)
      if (!isWorkspaceScenario(scenario)) continue

      expect(scenario.workspace.language).toBe("python")
      expect(validateWorkspaceScenario(scenario)).toEqual([])
      expect(scenario.workspace.editableFilePaths.length).toBeGreaterThanOrEqual(2)
      expect(scenario.workspace.visibleTestPaths.length).toBeGreaterThanOrEqual(1)
      expect(scenario.workspace.hiddenTestPaths.length).toBeGreaterThanOrEqual(1)
      expect(scenario.acceptanceCriteria.length).toBeGreaterThanOrEqual(3)
    }
  })
})
