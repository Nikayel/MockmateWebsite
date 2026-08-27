/**
 * Types for the TypeScript workspace runner (browser worker path + Node harness). Reuses the
 * shared `WorkspaceExecutionResult`/`WorkspaceTestResult` shapes from ../types — this module does
 * not fork them, only adds what's specific to the TS path (per-file transpile timing).
 */
import type { WorkspaceExecutionResult } from "../types"

export interface TsWorkspaceFile {
  path: string
  content: string
}

/**
 * Input to `runTsWorkspace` (node-harness.ts) and, in message-shape, to the worker's TS branch.
 * No `entrypoint`/`testRunnerPath`: the TS path auto-requires every path in `testPaths` then
 * `hiddenTestPaths` itself (via the vitest shim), so content authors write ordinary `.test.ts`
 * files instead of hand-rolling a runner script.
 */
export interface TsWorkspaceInput {
  files: TsWorkspaceFile[]
  /** Learner edits, applied over matching paths in `files` before transpiling. */
  editableOverlay?: TsWorkspaceFile[]
  testPaths: string[]
  hiddenTestPaths: string[]
}

export interface TsWorkspaceRunResult extends WorkspaceExecutionResult {
  /** Per-file transpile time in milliseconds, keyed by the file's original (.ts/.tsx) path. */
  transpileTimingsMs: Record<string, number>
}
