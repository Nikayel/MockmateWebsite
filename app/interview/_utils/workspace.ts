import { BookOpen, FileCode, FlaskConical, Lock, type LucideIcon } from "lucide-react"
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
    originalContent: file.content,
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
      originalContent: file.content,
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

/**
 * Visual styling for a workspace file role, shared by the editor's active-file
 * header and the file-tree sidebar so the icon/color/label stay in sync.
 */
export interface WorkspaceFileRoleStyle {
  Icon: LucideIcon
  label: string
  description: string
  iconColorActive: string
  iconColorIdle: string
  activeBorderClass: string
  badgeClass: string
}

export const getWorkspaceFileRoleStyle = (
  role?: WorkspaceScenarioFile["role"]
): WorkspaceFileRoleStyle => {
  switch (role) {
    case "test":
      return {
        Icon: FlaskConical,
        label: "Test",
        description: "Test file",
        iconColorActive: "text-emerald-300",
        iconColorIdle: "text-emerald-400/70",
        activeBorderClass: "border-b-emerald-400",
        badgeClass: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
      }
    case "readonly":
      return {
        Icon: Lock,
        label: "Read-only",
        description: "Read-only file",
        iconColorActive: "text-amber-300",
        iconColorIdle: "text-amber-400/70",
        activeBorderClass: "border-b-amber-400",
        badgeClass: "border-amber-400/25 bg-amber-400/10 text-amber-200",
      }
    case "docs":
      return {
        Icon: BookOpen,
        label: "Docs",
        description: "Documentation file",
        iconColorActive: "text-foreground",
        iconColorIdle: "text-muted-foreground",
        activeBorderClass: "border-b-gray-400",
        badgeClass: "border-border/30 bg-muted/10 text-muted-foreground",
      }
    case "editable":
    default:
      return {
        Icon: FileCode,
        label: "Edit",
        description: "Editable file",
        iconColorActive: "text-cyan-300",
        iconColorIdle: "text-cyan-400/70",
        activeBorderClass: "border-b-cyan-400",
        badgeClass: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
      }
  }
}

/** True when an editable file has unsaved changes vs its original content. */
export const hasWorkspaceFileEdits = (file: WorkspaceContextFile): boolean =>
  file.role === "editable" &&
  file.originalContent !== undefined &&
  file.content !== file.originalContent

export const getPrimaryWorkspaceFile = (
  scenario: Scenario,
  files: WorkspaceContextFile[]
): WorkspaceContextFile | undefined => {
  if (!isWorkspaceScenario(scenario)) return undefined
  return files.find((file) => file.path === scenario.workspace.primaryFilePath)
}
