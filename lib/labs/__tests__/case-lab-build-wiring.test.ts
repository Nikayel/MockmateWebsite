/**
 * Integration: every lab's Build milestone resolves to a real multi-file
 * codebase scenario (workspace), never a DSA task, and ships a reference
 * solution so the run-tests path is verifiable.
 */

import { describe, it, expect } from "vitest"
import { listCaseLabs } from "../case-labs"
import { getScenarioById } from "@/lib/scenarios"

describe("case lab build wiring", () => {
  it.each(listCaseLabs())("$id build scenario is a codebase drop", (lab) => {
    const scenario = getScenarioById(lab.buildScenarioId)
    expect(scenario, `missing scenario ${lab.buildScenarioId}`).toBeDefined()
    expect(scenario?.type).not.toBe("dsa")
    expect(scenario?.type).toBe(lab.buildScenarioType)
    expect(scenario?.executionMode).toBe("workspace")

    const workspace = scenario?.workspace
    expect(workspace, "build scenario must have a workspace").toBeDefined()
    expect(workspace?.editableFilePaths.length).toBeGreaterThan(0)
    expect(workspace?.files.length).toBeGreaterThan(1) // multi-file
    expect(workspace?.referenceFiles?.length).toBeGreaterThan(0)
  })
})
