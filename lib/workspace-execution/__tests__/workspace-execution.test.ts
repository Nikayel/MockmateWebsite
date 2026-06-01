import { describe, expect, it } from "vitest"

import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"
import {
  buildPistonWorkspaceFiles,
  isWorkspaceScenario,
  overlayWorkspaceFiles,
  parseWorkspaceExecutionOutput,
  validateWorkspaceScenario,
} from "@/lib/workspace-execution"

describe("workspace execution helpers", () => {
  const scenario = realWorldBugFixScenarios.find(
    (candidate) => candidate.id === "bugfix-search-race"
  )

  it("validates workspace scenario structure", () => {
    expect(scenario).toBeTruthy()
    expect(isWorkspaceScenario(scenario!)).toBe(true)
    if (!scenario || !isWorkspaceScenario(scenario)) return

    expect(validateWorkspaceScenario(scenario)).toEqual([])
  })

  it("overlays only editable workspace files", () => {
    if (!scenario || !isWorkspaceScenario(scenario)) return

    const files = overlayWorkspaceFiles(scenario, [
      { path: "src/search-controller.js", content: "module.exports = {}" },
      { path: "src/state.js", content: "should not replace readonly" },
    ])

    expect(files.find((file) => file.path === "src/search-controller.js")?.content).toBe(
      "module.exports = {}"
    )
    expect(files.find((file) => file.path === "src/state.js")?.content).not.toBe(
      "should not replace readonly"
    )
  })

  it("builds Piston files with the runner first", () => {
    if (!scenario || !isWorkspaceScenario(scenario)) return

    const files = buildPistonWorkspaceFiles(scenario, [])
    expect(files[0].name).toBe(scenario.workspace.testRunnerPath)
    expect(files.some((file) => file.name === scenario.workspace.primaryFilePath)).toBe(true)
  })

  it("parses workspace runner output", () => {
    const output =
      '__LOGS__:[{"type":"log","message":"hello","timestamp":1}]\n__WORKSPACE_TEST_RESULTS__:[{"suite":"s","name":"n","passed":true,"error":null}]'

    expect(parseWorkspaceExecutionOutput(output)).toEqual({
      consoleLogs: [{ type: "log", message: "hello", timestamp: 1 }],
      results: [{ suite: "s", name: "n", passed: true, error: null }],
    })
  })
})
