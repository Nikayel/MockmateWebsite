import { describe, expect, it } from "vitest"
import { scenarios } from "@/lib/scenarios"
import { getGuidedLabScenario } from "./scenarios"

// Catalog growth must not silently omit a lab from the server's narrow lookup.
describe("guided lab feedback lookup", () => {
  it("covers every guided lab with the same config and editable-file contract", () => {
    const labs = scenarios.filter((scenario) => scenario.type === "bugfix" && scenario.guidedLab)
    expect(labs.length).toBeGreaterThan(0)
    for (const lab of labs) {
      if (lab.type !== "bugfix") throw new Error("Expected a guided bugfix lab")
      const loaded = getGuidedLabScenario(lab.id)
      expect(loaded?.guidedLab).toEqual(lab.guidedLab)
      expect(loaded?.workspace?.editableFilePaths).toEqual(lab.workspace?.editableFilePaths)
    }
  })

  it("leaves ordinary practice rounds on the existing feedback path", () => {
    for (const scenario of scenarios) {
      if (scenario.type !== "bugfix" || !scenario.guidedLab) {
        expect(getGuidedLabScenario(scenario.id)).toBeUndefined()
      }
    }
    expect(getGuidedLabScenario("unknown")).toBeUndefined()
  })
})
