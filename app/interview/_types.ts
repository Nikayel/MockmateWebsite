import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"

export { SUPPORTED_LANGUAGES, EDITOR_LANGUAGES } from "@/lib/interview/languages"
export type { SupportedLanguage, EditorLanguage } from "@/lib/interview/languages"

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
  id?: string
  type: "user" | "ai"
  message: string
  /** A validated interviewer reply that is still being revealed to the candidate. */
  isStreaming?: boolean
  timestamp?: number
  phase?: "post_interview"
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
