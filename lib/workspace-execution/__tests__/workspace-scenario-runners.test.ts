import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "vitest"

import { addFunctionalityScenarios } from "@/lib/scenarios/add-functionality"
import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"
import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"
import { isWorkspaceScenario, parseWorkspaceExecutionOutput } from "@/lib/workspace-execution"
import type { WorkspaceScenario } from "@/lib/workspace-execution"

const PYTHON_BIN = process.env.PYTHON || "python3"

describe("workspace scenario runners", () => {
  const scenarios = [...realWorldBugFixScenarios, ...addFunctionalityScenarios]

  it("starter workspaces fail at least one test and reference workspaces pass", () => {
    for (const scenario of scenarios) {
      expect(isWorkspaceScenario(scenario)).toBe(true)
      if (!isWorkspaceScenario(scenario)) continue

      const starterResults = runWorkspace(scenario, scenario.workspace.files)
      expect(
        starterResults.some((result) => !result.passed),
        `${scenario.id} starter`
      ).toBe(true)

      const referenceFiles = applyReferenceFiles(scenario)
      const referenceResults = runWorkspace(scenario, referenceFiles)
      expect(
        referenceResults.every((result) => result.passed),
        `${scenario.id} reference`
      ).toBe(true)
    }
  })
})

function applyReferenceFiles(scenario: WorkspaceScenario): WorkspaceScenarioFile[] {
  const referenceFiles = new Map(
    (scenario.workspace.referenceFiles || []).map((file) => [file.path, file.content])
  )

  return scenario.workspace.files.map((file) => ({
    ...file,
    content: referenceFiles.get(file.path) ?? file.content,
  }))
}

function runWorkspace(
  scenario: WorkspaceScenario,
  files: WorkspaceScenarioFile[]
): Array<{ suite: string; name: string; passed: boolean; error: string | null }> {
  const root = mkdtempSync(join(tmpdir(), `codesparring-${scenario.id}-`))

  try {
    for (const file of files) {
      const filePath = join(root, file.path)
      mkdirSync(dirname(filePath), { recursive: true })
      writeFileSync(filePath, file.content)
    }

    const runnerPath = join(root, scenario.workspace.testRunnerPath)
    const command = scenario.workspace.language === "python" ? PYTHON_BIN : "node"
    const output = execFileSync(command, [runnerPath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    const parsed = parseWorkspaceExecutionOutput(output)
    return parsed.results
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}
