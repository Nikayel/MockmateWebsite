import type {
  Scenario,
  WorkspaceScenarioConfig,
  WorkspaceScenarioFile,
  WorkspaceScenarioLanguage,
} from "@/lib/scenarios/types"

export type { WorkspaceScenarioConfig, WorkspaceScenarioFile, WorkspaceScenarioLanguage }

export interface WorkspaceFileEdit {
  path: string
  content: string
}

export interface PistonWorkspaceFile {
  name: string
  content: string
}

export interface WorkspaceTestResult {
  suite: string
  name: string
  passed: boolean
  error: string | null
}

export interface WorkspaceExecutionResult {
  success: boolean
  results: WorkspaceTestResult[]
  consoleLogs: Array<{
    type: "log" | "error" | "warn" | "info"
    message: string
    timestamp: number
  }>
  summary: {
    total: number
    passed: number
    failed: number
    passRate: number
    serviceErrors: number
    effectiveTotal: number
  }
  error: string | null
}

export type WorkspaceScenario = Scenario & {
  executionMode: "workspace"
  workspace: WorkspaceScenarioConfig
}
