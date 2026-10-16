import { describe, expect, it } from "vitest"
import { bugfixScenarios } from "../real-world/bugfix/all"
import { addFunctionalityScenarios } from "../add-functionality"

const scenarios = [...bugfixScenarios, ...addFunctionalityScenarios]

describe("debugging-track assignments", () => {
  it("covers the complete published debugging track", () => {
    expect(scenarios).toHaveLength(28)
  })

  for (const scenario of scenarios) {
    it(`${scenario.id} keeps the complete assignment in a visible read-only task document`, () => {
      expect(scenario.task?.trim().length).toBeGreaterThan(0)
      expect(scenario.task?.length).toBeLessThanOrEqual(180)
      const task = scenario.workspace?.files.find((file) => file.path === "task.md")
      expect(task, scenario.id).toBeDefined()
      expect(task?.role).toBe("docs")
      expect(task?.hidden).not.toBe(true)
      expect(scenario.workspace?.editableFilePaths).not.toContain("task.md")
      expect(task?.content).toContain(scenario.problemStatement.trim())
      if (scenario.type === "add-functionality") {
        for (const requirement of [...scenario.featureRequirements, ...scenario.acceptanceCriteria])
          expect(task?.content).toContain(requirement)
      } else if (!scenario.pack) {
        for (const criterion of scenario.successCriteria ?? [])
          expect(task?.content).toContain(criterion)
      } else {
        expect(task?.content).toContain(scenario.pack.runCmd)
        expect(task?.content).toContain(scenario.pack.expectedOutput.trim())
      }
    })
  }
})
