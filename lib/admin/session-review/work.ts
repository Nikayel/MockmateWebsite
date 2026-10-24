import { count, record, text, timestamp } from "./fields"

export interface SessionWork {
  language: string | null
  code: string | null
  codeSource: "final" | "checkpoint" | null
  files: Array<{ path: string; content: string }>
  truncated: boolean
  testsPassed: number | null
  testsTotal: number | null
  testSource: "final" | "checkpoint" | null
  paused: boolean | null
  elapsedSeconds: number | null
  savedAt: string | null
  timeComplexity: string | null
  spaceComplexity: string | null
}

const MAX_CODE_CHARS = 100_000
const MAX_FILES = 20
const MAX_FILE_CHARS = 20_000

/** Named allowlist: never return raw checkpoints, private notes, or hidden test bodies. */
export function sessionWork(source: Record<string, unknown>): SessionWork {
  const state = record(source.session_state)
  const finalCode = text(source.final_code)
  const code = finalCode ?? text(state.code)
  const workspace = Array.isArray(state.workspace_context) ? state.workspace_context : []
  const editable = workspace
    .map(record)
    .filter(
      (file) => file.role === "editable" && text(file.path) && typeof file.content === "string"
    )
  const results = Array.isArray(source.test_results) ? source.test_results : null
  const summary = record(state.test_summary)
  const checkpointResults = Array.isArray(state.test_results) ? state.test_results : null
  const hasFinalTests = count(source.tests_total) !== null || results !== null
  const total = hasFinalTests
    ? (count(source.tests_total) ?? results?.length ?? null)
    : (count(summary.total) ?? checkpointResults?.length ?? null)
  const passed = hasFinalTests
    ? (count(source.tests_passed) ??
      (results ? results.filter((test) => record(test).passed === true).length : null))
    : (count(summary.passed) ??
      (checkpointResults
        ? checkpointResults.filter((test) => record(test).passed === true).length
        : null))
  return {
    language: text(source.language) ?? text(state.language),
    code: code === null ? null : code.slice(0, MAX_CODE_CHARS),
    codeSource: finalCode !== null ? "final" : code !== null ? "checkpoint" : null,
    files: editable.slice(0, MAX_FILES).map((file) => ({
      path: String(file.path).slice(0, 512),
      content: String(file.content).slice(0, MAX_FILE_CHARS),
    })),
    truncated:
      (code?.length ?? 0) > MAX_CODE_CHARS ||
      editable.length > MAX_FILES ||
      editable.some((file) => String(file.content).length > MAX_FILE_CHARS),
    testsPassed: passed !== null && total !== null ? Math.min(passed, total) : passed,
    testsTotal: total,
    testSource: hasFinalTests ? "final" : total !== null ? "checkpoint" : null,
    paused: typeof state.paused === "boolean" ? state.paused : null,
    elapsedSeconds: count(state.elapsed_time),
    savedAt: timestamp(state.saved_at),
    timeComplexity: text(source.time_complexity),
    spaceComplexity: text(source.space_complexity),
  }
}
