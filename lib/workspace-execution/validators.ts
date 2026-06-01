import type { Scenario } from "@/lib/scenarios/types"
import type { WorkspaceFileEdit, WorkspaceScenario } from "./types"

const SUPPORTED_WORKSPACE_LANGUAGES = new Set(["javascript", "typescript", "python"])

export function isWorkspaceScenario(scenario: Scenario): scenario is WorkspaceScenario {
  return scenario.executionMode === "workspace" && Boolean(scenario.workspace)
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

  for (const file of workspace.files) {
    if (!isValidWorkspacePath(file.path)) {
      errors.push(`Invalid workspace file path: ${file.path}`)
    }
  }

  for (const path of [
    workspace.primaryFilePath,
    workspace.testRunnerPath,
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
