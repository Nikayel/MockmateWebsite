import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"

export const SUPPORTED_LANGUAGES = ["javascript", "typescript", "python"] as const
export const EDITOR_LANGUAGES = [
  ...SUPPORTED_LANGUAGES,
  "java",
  "cpp",
  "csharp",
  "go",
  "rust",
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]
export type EditorLanguage = (typeof EDITOR_LANGUAGES)[number]

export type WorkspaceContextFile = {
  path: string
  content: string
  description?: string
  role?: WorkspaceScenarioFile["role"]
  language?: WorkspaceScenarioFile["language"]
  hidden?: boolean
}
