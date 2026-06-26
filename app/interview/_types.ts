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
  originalContent?: string
  description?: string
  role?: WorkspaceScenarioFile["role"]
  language?: WorkspaceScenarioFile["language"]
  hidden?: boolean
}

export type ChatMessage = {
  type: "user" | "ai"
  message: string
  timestamp?: number
}

export type TestResult = {
  description: string
  passed: boolean
  input: unknown
  expected: unknown
  actual: unknown
  error: string | null
}

export type TestSummary = {
  total: number
  passed: number
  failed: number
  passRate: number
}

export type EfficiencyMetrics = {
  linesOfCode: number
  complexity: string
  estimatedTimeComplexity: string
  estimatedSpaceComplexity: string
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
  efficiencyScore: number
}

export type ConsoleLogEntry = {
  type: string
  message: string
  timestamp: number
}
