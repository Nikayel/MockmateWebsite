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
  isHidden?: boolean
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

export interface DsaTestResult {
  description: string
  passed: boolean
  input: any
  expected: any
  actual: any
  error: string | null
}

export interface DsaExecutionResult {
  success: boolean
  results: DsaTestResult[]
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

/**
 * Terminal view of one stdout-oracle pack run.
 *
 * Packs are verified by byte-exact stdout comparison, so the candidate-facing
 * surface is the program's real output — not a pass/fail row. Deliberately
 * carries NO expected output and NO diff: the oracle is already public in
 * `task.md` and the visible `tests/expected_output.txt`, and locating which
 * section is wrong is the skill the pack model assesses. The console reports
 * the verdict and names the oracle; the candidate does the diffing.
 */
export interface PackRunView {
  /** Command echoed at the `$` prompt, e.g. "python3 src/main.py fixtures/input.txt". */
  runCmd: string
  /** False when the program crashed or timed out before producing capturable stdout. */
  ran: boolean
  /** Exact captured stdout, verbatim (empty string on a crash). */
  stdout: string
  /** Candidate-visible oracle file the verdict refers to. */
  oraclePath: string
  /** True only on a byte-for-byte match against the public oracle. */
  match: boolean
  /** Crash/timeout message when `ran` is false, else null. */
  crashError: string | null
}

export interface PackExecutionResult extends DsaExecutionResult {
  kind: "pack"
  packRun: PackRunView
}
