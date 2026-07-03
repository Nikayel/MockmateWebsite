import type { WorkspaceTestResult } from "../types"

/**
 * The SQL workspace runner emits the SAME `__WORKSPACE_TEST_RESULTS__:` marker the Python workspace
 * runner emits (a log line carrying a JSON array of `{ suite, name, passed, error, isHidden }`), so
 * `result-parser.ts`, `formatWorkspaceResult()` and the results UI are reused byte-for-byte.
 *
 * `buildWorkspaceMarker` is the exact string the worker produces — factored here so the marker format
 * is unit-testable without a worker/WASM. `parseWorkspaceMarker` is its inverse for the main thread.
 */
export const WORKSPACE_RESULTS_PREFIX = "__WORKSPACE_TEST_RESULTS__:"

export function buildWorkspaceMarker(results: WorkspaceTestResult[]): string {
  return WORKSPACE_RESULTS_PREFIX + JSON.stringify(results)
}

/** Scan worker log lines for the marker and return its parsed results, or null if none/malformed. */
export function parseWorkspaceMarker(
  logs: Array<{ message: string }>
): WorkspaceTestResult[] | null {
  for (const log of logs) {
    if (!log.message.startsWith(WORKSPACE_RESULTS_PREFIX)) continue
    try {
      const parsed = JSON.parse(log.message.slice(WORKSPACE_RESULTS_PREFIX.length))
      if (Array.isArray(parsed)) return parsed as WorkspaceTestResult[]
    } catch {
      // Fall through: a malformed marker is treated as "no results reported".
    }
  }
  return null
}
