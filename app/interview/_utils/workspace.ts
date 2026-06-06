import type { Scenario } from "@/lib/scenarios"
import type { WorkspaceScenarioConfig, WorkspaceScenarioFile } from "@/lib/scenarios/types"
import type { WorkspaceContextFile } from "../_types"

export type ScenarioWithWorkspace = Scenario & {
  executionMode: "workspace"
  workspace: WorkspaceScenarioConfig
}

export const toWorkspaceContextFiles = (
  codebaseFiles: Array<{ fileName: string; content: string; description?: string }>
): WorkspaceContextFile[] =>
  codebaseFiles.map((file) => ({
    path: file.fileName,
    content: file.content,
    description: file.description,
    role: getWorkspaceFileRole(file.fileName),
  }))

export const isWorkspaceScenario = (
  scenario: Scenario | null | undefined
): scenario is ScenarioWithWorkspace => {
  return scenario?.executionMode === "workspace" && Boolean(scenario.workspace)
}

export const toWorkspaceScenarioFiles = (scenario: Scenario): WorkspaceContextFile[] => {
  if (!isWorkspaceScenario(scenario)) return []

  return scenario.workspace.files
    .filter((file) => !file.hidden)
    .map((file) => ({
      path: file.path,
      content: file.content,
      description: file.description,
      role: file.role,
      language: file.language,
      hidden: file.hidden,
    }))
}

export const getWorkspaceFileRole = (path: string): WorkspaceScenarioFile["role"] => {
  const normalizedPath = path.toLowerCase()
  if (normalizedPath.includes("test") || normalizedPath.includes("spec")) {
    return "test"
  }
  if (normalizedPath.endsWith(".md") || normalizedPath.includes("readme")) {
    return "docs"
  }
  return "readonly"
}

export const getPrimaryWorkspaceFile = (
  scenario: Scenario,
  files: WorkspaceContextFile[]
): WorkspaceContextFile | undefined => {
  if (!isWorkspaceScenario(scenario)) return undefined
  return files.find((file) => file.path === scenario.workspace.primaryFilePath)
}
