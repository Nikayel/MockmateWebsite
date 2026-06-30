/**
 * The adapter bridges authored exercises to the client-side executor. These tests pin the two
 * shapes the runner depends on and prove the workspace sample passes the real workspace validator
 * (so a bad multi-file lesson fails here, not silently at runtime).
 */
import { describe, it, expect } from "vitest"
import { getTutorialExerciseScenario } from "../exercise-scenarios"
import {
  isWorkspaceScenario,
  validateWorkspaceScenario,
} from "@/lib/workspace-execution/validators"

describe("getTutorialExerciseScenario", () => {
  it("adapts a single-file exercise to a dsa scenario carrying testCases", () => {
    const scenario = getTutorialExerciseScenario("py-l1-temperature-apply")
    expect(scenario).toBeDefined()
    expect(scenario?.type).toBe("dsa")
    expect(scenario && "testCases" in scenario).toBe(true)
    expect(scenario && isWorkspaceScenario(scenario)).toBe(false)
  })

  it("adapts a workspace exercise and passes the workspace validator", () => {
    const scenario = getTutorialExerciseScenario("py-l3-parse-config-practice")
    expect(scenario).toBeDefined()
    if (!scenario || !isWorkspaceScenario(scenario)) {
      throw new Error("expected a workspace scenario")
    }
    // No validation errors → >=1 visible + >=1 hidden test, primary editable, all paths exist, etc.
    expect(validateWorkspaceScenario(scenario)).toEqual([])
  })

  it("returns undefined for an unknown exercise id", () => {
    expect(getTutorialExerciseScenario("nope")).toBeUndefined()
  })
})
