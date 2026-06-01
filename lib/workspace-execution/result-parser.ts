import type { ConsoleLog } from "@/lib/piston"
import type { WorkspaceTestResult } from "./types"

const RESULTS_PREFIX = "__WORKSPACE_TEST_RESULTS__:"
const LOGS_PREFIX = "__LOGS__:"

export function parseWorkspaceExecutionOutput(output: string): {
  results: WorkspaceTestResult[]
  consoleLogs: ConsoleLog[]
} {
  const results: WorkspaceTestResult[] = []
  let consoleLogs: ConsoleLog[] = []

  for (const line of output.trim().split("\n")) {
    if (line.startsWith(LOGS_PREFIX)) {
      try {
        const parsed = JSON.parse(line.slice(LOGS_PREFIX.length))
        if (Array.isArray(parsed)) {
          consoleLogs = parsed.filter(isConsoleLog)
        }
      } catch {
        consoleLogs = []
      }
    }

    if (line.startsWith(RESULTS_PREFIX)) {
      try {
        const parsed = JSON.parse(line.slice(RESULTS_PREFIX.length))
        if (Array.isArray(parsed)) {
          results.push(...parsed.filter(isWorkspaceTestResult))
        }
      } catch {
        results.push({
          suite: "workspace",
          name: "Parse test results",
          passed: false,
          error: "Test runner returned malformed results.",
        })
      }
    }
  }

  return { results, consoleLogs }
}

function isConsoleLog(value: unknown): value is ConsoleLog {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return (
    (record.type === "log" ||
      record.type === "error" ||
      record.type === "warn" ||
      record.type === "info") &&
    typeof record.message === "string" &&
    typeof record.timestamp === "number"
  )
}

function isWorkspaceTestResult(value: unknown): value is WorkspaceTestResult {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return (
    typeof record.suite === "string" &&
    typeof record.name === "string" &&
    typeof record.passed === "boolean" &&
    (record.error === null || typeof record.error === "string")
  )
}
