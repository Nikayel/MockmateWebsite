import type { WorkspaceFileEdit, WorkspaceScenario, WorkspaceScenarioFile } from "./types"
import { isValidWorkspacePath } from "./validators"

const MAX_WORKSPACE_FILE_BYTES = 100_000

export function overlayWorkspaceFiles(
  scenario: WorkspaceScenario,
  edits: WorkspaceFileEdit[]
): WorkspaceScenarioFile[] {
  const editablePaths = new Set(scenario.workspace.editableFilePaths)
  const editMap = new Map<string, string>()

  for (const edit of edits) {
    if (!isValidWorkspacePath(edit.path)) continue
    if (!editablePaths.has(edit.path)) continue
    if (edit.content.length > MAX_WORKSPACE_FILE_BYTES) continue
    editMap.set(edit.path, edit.content)
  }

  return scenario.workspace.files.map((file) => ({
    ...file,
    content: editMap.get(file.path) ?? file.content,
  }))
}

export function getVisibleWorkspaceFiles(scenario: WorkspaceScenario): WorkspaceScenarioFile[] {
  return scenario.workspace.files.filter((file) => !file.hidden)
}

export function getWorkspacePrimaryCode(scenario: WorkspaceScenario): string {
  return (
    scenario.workspace.files.find((file) => file.path === scenario.workspace.primaryFilePath)
      ?.content ?? ""
  )
}
