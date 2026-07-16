import type { BugFixScenario, BugfixPackRuntime, Scenario } from "@/lib/scenarios/types"
import type { WorkspaceFileEdit, WorkspaceScenario } from "./types"

const SUPPORTED_WORKSPACE_LANGUAGES = new Set(["javascript", "typescript", "python", "sql"])

export function isWorkspaceScenario(scenario: Scenario): scenario is WorkspaceScenario {
  return scenario.executionMode === "workspace" && Boolean(scenario.workspace)
}

export type PackScenario = WorkspaceScenario & { pack: BugfixPackRuntime }

/**
 * A stdout-oracle pack, which must NOT go through the assert-based workspace
 * runner: a pack's `testRunnerPath` is oracle config, not an executable runner.
 * Packs run their `runCmd` and are graded by byte-exact stdout comparison.
 */
export function isPackScenario(scenario: Scenario): scenario is PackScenario {
  return (
    isWorkspaceScenario(scenario) &&
    Boolean((scenario as BugFixScenario).pack) &&
    scenario.workspace.language === "python"
  )
}

export function isValidWorkspacePath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("\0")) return false
  return !path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
}

export function validateWorkspaceScenario(scenario: WorkspaceScenario): string[] {
  const errors: string[] = []
  const { workspace } = scenario
  const paths = new Set(workspace.files.map((file) => file.path))

  if (!SUPPORTED_WORKSPACE_LANGUAGES.has(workspace.language)) {
    errors.push(`Unsupported workspace language: ${workspace.language}`)
  }

  // Making testRunnerPath optional for packs must not let a non-pack scenario
  // ship without one: it would validate clean, then die at runtime with
  // "Workspace runner not found: undefined".
  if (!isPackScenario(scenario) && !workspace.testRunnerPath) {
    errors.push("Non-pack workspace scenario must declare a testRunnerPath")
  }

  for (const file of workspace.files) {
    if (!isValidWorkspacePath(file.path)) {
      errors.push(`Invalid workspace file path: ${file.path}`)
    }
  }

  for (const path of [
    workspace.primaryFilePath,
    // Packs legitimately have no test runner; only validate one when declared.
    ...(workspace.testRunnerPath ? [workspace.testRunnerPath] : []),
    ...workspace.editableFilePaths,
    ...workspace.visibleTestPaths,
    ...workspace.hiddenTestPaths,
  ]) {
    if (!paths.has(path)) {
      errors.push(`Workspace references missing file: ${path}`)
    }
  }

  if (!workspace.editableFilePaths.includes(workspace.primaryFilePath)) {
    errors.push(`Primary file must be editable: ${workspace.primaryFilePath}`)
  }

  if (workspace.visibleTestPaths.length === 0) {
    errors.push("Workspace scenario must include at least one visible test file")
  }

  if (workspace.hiddenTestPaths.length === 0) {
    errors.push("Workspace scenario must include at least one hidden test file")
  }

  return errors
}

export function normalizeWorkspaceEdits(value: unknown): WorkspaceFileEdit[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const record = item as Record<string, unknown>
    if (typeof record.path !== "string" || typeof record.content !== "string") return []
    return [{ path: record.path, content: record.content }]
  })
}
