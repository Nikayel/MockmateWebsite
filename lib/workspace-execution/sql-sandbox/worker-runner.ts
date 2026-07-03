import type { DsaExecutionResult } from "../types"

export interface SqlWorkerRunResult {
  success: boolean
  /** single-file mode: the learner SELECT's { columns, rows }. */
  result?: unknown
  logs: DsaExecutionResult["consoleLogs"]
  error?: string
}

export interface SqlWorkerData {
  mode: "single-file" | "workspace" | "warm"
  seedSql?: string
  code?: string
  assertions?: Array<{ suite: string; name: string; sql: string; isHidden?: boolean }>
  checkIdempotency?: boolean
}

interface PendingSqlRun {
  resolve: (value: SqlWorkerRunResult) => void
  timeoutId: ReturnType<typeof setTimeout>
  execTimeoutMs: number
  logs: DsaExecutionResult["consoleLogs"]
}

// Compiling the SQLite WASM module on a first run is a ~1 MB same-origin fetch + compile. Keep the
// boot budget well above the execution budget so a slow COLD START is never misreported as a runaway
// query. (sql.js is far cheaper than Pyodide, but the discipline mirrors the Python runner exactly.)
const DEFAULT_BOOT_TIMEOUT_MS = 30000
// Once the engine is warm, seed + query should finish quickly; a longer run is a runaway query.
const DEFAULT_EXEC_TIMEOUT_MS = 5000

const BOOT_TIMEOUT_MESSAGE = "Couldn't start the SQL engine. Check your connection and try again."
const EXEC_TIMEOUT_MESSAGE = "Query timed out. Check for an accidental cross join or a huge result."

let sqlWorker: Worker | null = null
let pendingRun: PendingSqlRun | null = null

function resetSqlWorker(): void {
  if (sqlWorker) {
    sqlWorker.terminate()
  }
  sqlWorker = null
  pendingRun = null
}

function getSqlWorker(): Worker {
  if (!sqlWorker) {
    sqlWorker = new Worker("/workers/sql-sandbox-worker.js")

    sqlWorker.onmessage = (event: MessageEvent) => {
      if (!pendingRun) return

      const data = event.data as {
        type?: "status" | "exec-start" | "result"
        success?: boolean
        result?: unknown
        logs?: DsaExecutionResult["consoleLogs"]
        error?: string
        message?: string
        timestamp?: number
      }

      // The engine finished booting and is about to run the query. Swap the generous boot timeout
      // for the tight execution timeout so a runaway query is still caught quickly.
      if (data.type === "exec-start") {
        clearTimeout(pendingRun.timeoutId)
        pendingRun.timeoutId = setTimeout(() => {
          // Resolve BEFORE tearing down: resetSqlWorker() nulls pendingRun and resolveActive()
          // no-ops on a null pendingRun. Reversing the order would leave the promise pending forever.
          resolveActive({ success: false, logs: [], error: EXEC_TIMEOUT_MESSAGE })
          resetSqlWorker()
        }, pendingRun.execTimeoutMs)
        return
      }

      if (data.type === "status") {
        pendingRun.logs.push({
          type: "info",
          message: data.message || "Preparing SQL engine...",
          timestamp: data.timestamp || Date.now(),
        })
        return
      }

      clearTimeout(pendingRun.timeoutId)
      const statusLogs = pendingRun.logs
      const payload: SqlWorkerRunResult = {
        success: data.success === true,
        result: data.result,
        logs: [...statusLogs, ...(data.logs || [])],
        error: data.error,
      }
      resolveActive(payload)
    }

    sqlWorker.onerror = (error) => {
      if (!pendingRun) return

      clearTimeout(pendingRun.timeoutId)
      const statusLogs = pendingRun.logs
      // Resolve BEFORE resetSqlWorker() (which nulls pendingRun); otherwise resolveActive() would
      // short-circuit and the promise would never settle.
      resolveActive({
        success: false,
        logs: statusLogs,
        error: error.message || "Unknown SQL worker error",
      })
      resetSqlWorker()
    }
  }

  return sqlWorker
}

// Resolve the in-flight run exactly once and clear it.
function resolveActive(value: SqlWorkerRunResult): void {
  if (!pendingRun) return
  const resolve = pendingRun.resolve
  pendingRun = null
  resolve(value)
}

export function runSqlInWorker(
  workerData: SqlWorkerData,
  execTimeoutMs = DEFAULT_EXEC_TIMEOUT_MS,
  bootTimeoutMs = DEFAULT_BOOT_TIMEOUT_MS
): Promise<SqlWorkerRunResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ success: false, logs: [], error: "Execution environment is not browser" })
      return
    }

    if (pendingRun) {
      resolve({ success: false, logs: [], error: "A SQL query is already running" })
      return
    }

    let worker: Worker
    try {
      worker = getSqlWorker()
    } catch (error) {
      resolve({
        success: false,
        logs: [],
        error: error instanceof Error ? error.message : "Failed to spawn SQL Web Worker",
      })
      return
    }

    // Start on the boot timeout. It is replaced by the execution timeout as soon as the worker
    // reports it is about to run the query (`exec-start`).
    const timeoutId = setTimeout(() => {
      // Resolve BEFORE resetSqlWorker() nulls pendingRun, or the promise hangs.
      resolveActive({ success: false, logs: [], error: BOOT_TIMEOUT_MESSAGE })
      resetSqlWorker()
    }, bootTimeoutMs)

    pendingRun = { resolve, timeoutId, execTimeoutMs, logs: [] }
    worker.postMessage(workerData)
  })
}
