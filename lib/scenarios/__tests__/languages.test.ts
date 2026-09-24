import { describe, expect, it } from "vitest"
import {
  filterScenarios,
  getScenarioLanguages,
  scenarios,
  type AddFunctionalityScenario,
  type BugFixScenario,
} from "@/lib/scenarios"

describe("debugging scenario languages", () => {
  it("gives every catalog debugging scenario at least one language tag", () => {
    const missing = scenarios
      .filter((scenario) => scenario.type === "bugfix" || scenario.type === "add-functionality")
      .filter((scenario) => getScenarioLanguages(scenario).length === 0)
      .map((scenario) => scenario.id)

    expect(missing).toEqual([])
  })

  it("uses the executable workspace language and legacy code variants", () => {
    const scenario = {
      type: "bugfix",
      workspace: { language: "typescript" },
      buggyCode: { javascript: "", python: "" },
    } as BugFixScenario

    expect(getScenarioLanguages(scenario)).toEqual(["javascript", "typescript", "python"])
  })

  it("reads add-functionality language variants", () => {
    const scenario = {
      type: "add-functionality",
      existingCode: { python: "" },
    } as AddFunctionalityScenario

    expect(getScenarioLanguages(scenario)).toEqual(["python"])
  })

  it("filters debugging scenarios by any selected language", () => {
    const pythonScenarios = filterScenarios({
      type: ["bugfix", "add-functionality"],
      languages: ["python"],
    })

    expect(pythonScenarios.length).toBeGreaterThan(0)
    expect(
      pythonScenarios.every((scenario) => getScenarioLanguages(scenario).includes("python"))
    ).toBe(true)

    const javascriptOrPython = filterScenarios({
      type: ["bugfix", "add-functionality"],
      languages: ["javascript", "python"],
    })

    expect(javascriptOrPython.length).toBeGreaterThanOrEqual(pythonScenarios.length)
    expect(javascriptOrPython.length).toBeLessThanOrEqual(
      scenarios.filter(
        (scenario) => scenario.type === "bugfix" || scenario.type === "add-functionality"
      ).length
    )
  })
})
