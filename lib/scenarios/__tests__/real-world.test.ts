import { describe, expect, it } from "vitest"
import { existsSync } from "node:fs"
import { join } from "node:path"

import { realWorldBugFixScenarios, realWorldSystemDesignScenarios } from "../../scenarios-realworld"
import { scenarios } from "../../scenarios"
import { bugfixPackScenarios } from "../real-world/bugfix/packs"
import { validateBugfixScenarioQuality } from "../bugfix-quality"
import {
  hydrateSealedLegacyBugfix,
  loadSealedLegacyBugfix,
  sealedLegacyScenarioIds,
} from "../sealed/legacy-registry.server"
import { addFunctionalityScenarios } from "../add-functionality"
import { loadSealedPack, sealedPackIds } from "../sealed/registry.server"
import { validateWorkspaceScenario, isWorkspaceScenario } from "../../workspace-execution"

describe("real-world scenario modules", () => {
  const publicBugfixIds = [
    "bugfix-search-race",
    "bugfix-billing-webhook-idempotency",
    "bugfix-api-rate-limiter-workspace",
    "bugfix-rate-limiter-error-handling",
    "bugfix-rate-limiter-error-handling-python",
    "bugfix-comment-thread-merge",
    "bugfix-event-aggregation-retries",
    "bugfix-feature-pipeline-nan-workspace",
    "bugfix-temperature-alert-regression",
    "bugfix-onboarding",
    "bugfix-bookclub-reading-streak-workspace",
    "bugfix-foundry-usage-rollup",
    "bugfix-maze-navigation",
    "bugfix-http-client-library",
  ]

  it("requires a matching sealed answer for every assert-based debugging question, without orphaned entries", () => {
    expect(sealedLegacyScenarioIds().sort()).toEqual(
      [...realWorldBugFixScenarios, ...addFunctionalityScenarios].map(({ id }) => id).sort()
    )
  })

  it("keeps generated pack answers aligned with the public pack catalog", async () => {
    expect(sealedPackIds().sort()).toEqual(bugfixPackScenarios.map(({ id }) => id).sort())
    for (const { id } of bugfixPackScenarios) expect((await loadSealedPack(id))?.packId).toBe(id)
  })

  it.each(["missing-question", "__proto__", "constructor", "toString"])(
    "does not load an unknown or inherited question ID: %s",
    async (id) => {
      expect(await loadSealedLegacyBugfix(id)).toBeNull()
      expect(await loadSealedPack(id)).toBeNull()
    }
  )

  it("keeps the legacy export order and IDs", () => {
    expect(realWorldBugFixScenarios.map((scenario) => scenario.id)).toEqual(publicBugfixIds)
    expect(realWorldSystemDesignScenarios.map((scenario) => scenario.id)).toEqual([
      "system-design-newsfeed",
    ])
  })

  it("mounts the legacy bugfix bank plus the stdout-oracle packs in the public registry", () => {
    // The packs are now reachable from the scenario browser (spread into the eager list in
    // lib/scenarios.ts), so the public bugfix registry is the legacy bank followed by the packs.
    const packIds = bugfixPackScenarios.map((scenario) => scenario.id)
    expect(
      scenarios.filter((scenario) => scenario.type === "bugfix").map((scenario) => scenario.id)
    ).toEqual([...publicBugfixIds, ...packIds])
  })

  it("exports complete scenario records for consumers", async () => {
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
        // The root cause (bugDescription) is sealed server-side and no longer ships
        // on the client module; assert it exists in the sealed legacy registry.
        const sealed = await loadSealedLegacyBugfix(scenario.id)
        expect(sealed?.bugDescription).toBeTruthy()
      } else {
        expect(scenario.constraints.length).toBeGreaterThan(0)
        expect(scenario.hints.length).toBeGreaterThan(0)
        expect(scenario.keyComponents.length).toBeGreaterThan(0)
        expect(scenario.evaluationCriteria.length).toBeGreaterThan(0)
      }
    }
  })

  it("publishes only sophisticated workspace bugfix scenarios", async () => {
    for (const scenario of realWorldBugFixScenarios) {
      const languages = Object.keys(scenario.buggyCode)

      expect(languages).toHaveLength(1)
      expect(isWorkspaceScenario(scenario)).toBe(true)
      if (!isWorkspaceScenario(scenario)) continue

      // The reference solution, bug description, and specific rubric are sealed
      // server-side; re-merge them before the release audit (mirrors the admin route).
      const hydrated = await hydrateSealedLegacyBugfix(scenario)
      expect(isWorkspaceScenario(hydrated)).toBe(true)
      if (!isWorkspaceScenario(hydrated)) continue

      expect(validateWorkspaceScenario(hydrated)).toEqual([])
      expect(hydrated.workspace.files.some((file) => file.role === "docs")).toBe(true)
      expect(hydrated.workspace.editableFilePaths.length).toBeGreaterThanOrEqual(1)
      expect(hydrated.workspace.visibleTestPaths.length).toBeGreaterThanOrEqual(1)
      expect(hydrated.workspace.hiddenTestPaths.length).toBeGreaterThanOrEqual(1)
      expect(validateBugfixScenarioQuality(hydrated)).toEqual([])

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
