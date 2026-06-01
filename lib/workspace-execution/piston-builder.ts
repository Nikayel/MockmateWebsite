import type { PistonWorkspaceFile, WorkspaceFileEdit, WorkspaceScenario } from "./types"
import { overlayWorkspaceFiles } from "./files"

export function buildPistonWorkspaceFiles(
  scenario: WorkspaceScenario,
  edits: WorkspaceFileEdit[]
): PistonWorkspaceFile[] {
  const files = overlayWorkspaceFiles(scenario, edits)
  const runner = files.find((file) => file.path === scenario.workspace.testRunnerPath)

  if (!runner) {
    throw new Error(`Workspace runner not found: ${scenario.workspace.testRunnerPath}`)
  }

  return [
    { name: runner.path, content: runner.content },
    ...files
      .filter((file) => file.path !== runner.path)
      .map((file) => ({ name: file.path, content: file.content })),
  ]
}
