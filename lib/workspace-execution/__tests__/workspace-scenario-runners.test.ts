import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "vitest"

import { addFunctionalityScenarios } from "@/lib/scenarios/add-functionality"
import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"
import { loadSealedLegacyReferenceFiles } from "@/lib/scenarios/sealed/legacy-registry.server"
import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"
import { isWorkspaceScenario, parseWorkspaceExecutionOutput } from "@/lib/workspace-execution"
import type { WorkspaceScenario } from "@/lib/workspace-execution"

const PYTHON_BIN = process.env.PYTHON || "python3"

describe("workspace scenario runners", () => {
  const scenarios = [...realWorldBugFixScenarios, ...addFunctionalityScenarios]

  // Spawns a python3 subprocess per scenario; under full-suite parallel load the
  // 5s default flakes on process contention (passes in ~3s in isolation).
  it(
    "starter workspaces fail at least one test and reference workspaces pass",
    { timeout: 60_000 },
    async () => {
      for (const scenario of scenarios) {
        expect(isWorkspaceScenario(scenario)).toBe(true)
        if (!isWorkspaceScenario(scenario)) continue

        const starterResults = runWorkspace(scenario, scenario.workspace.files)
        expect(
          starterResults.some((result) => !result.passed),
          `${scenario.id} starter`
        ).toBe(true)

        // The fixed reference solution is sealed server-side (moved out of the client
        // module), so load it from the sealed legacy registry and apply it over the
        // starter workspace before running the suite.
        const sealedReferenceFiles = await loadSealedLegacyReferenceFiles(scenario.id)
        expect(sealedReferenceFiles, `${scenario.id} sealed reference files`).toBeTruthy()

        const referenceFiles = applyReferenceFiles(scenario, sealedReferenceFiles ?? [])
        const referenceResults = runWorkspace(scenario, referenceFiles)
        expect(
          referenceResults.every((result) => result.passed),
          `${scenario.id} reference`
        ).toBe(true)
      }
    }
  )
})

function applyReferenceFiles(
  scenario: WorkspaceScenario,
  sealedReferenceFiles: WorkspaceScenarioFile[]
): WorkspaceScenarioFile[] {
  const referenceFiles = new Map(sealedReferenceFiles.map((file) => [file.path, file.content]))

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
