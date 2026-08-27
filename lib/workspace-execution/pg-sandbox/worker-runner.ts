import type { WorkspaceExecutionResult } from "../types"
import type { PgWorkerRequest, PgWorkerRunResult } from "./types"

export type { PgWorkerRequest, PgWorkerRunResult }

interface PendingPgRun {
  resolve: (value: PgWorkerRunResult) => void
  timeoutId: ReturnType<typeof setTimeout>
  execTimeoutMs: number
  logs: WorkspaceExecutionResult["consoleLogs"]
}

// PGlite's self-hosted assets (public/wasm/pglite/) are ~17MB (a real Postgres build), far larger
// than sql.js's ~1MB — the boot budget is generous so a slow connection's cold start is never
// misreported as a hung engine. Once warm, a single suite run (several sequential SQL round trips:
// migrations, seed, learner SQL, N assertions, optionally a second idempotency pass) gets a longer
// execution budget than a single query would, mirroring ts-workspace's same reasoning for its own
// 15s override of a single-query-era default.
const DEFAULT_BOOT_TIMEOUT_MS = 45000
const DEFAULT_EXEC_TIMEOUT_MS = 15000

const BOOT_TIMEOUT_MESSAGE =
  "Couldn't start the Postgres engine. Check your connection and try again."
const EXEC_TIMEOUT_MESSAGE =
  "The SQL suite timed out. Check for an accidental infinite loop or lock wait."

let pgWorker: Worker | null = null
let pendingRun: PendingPgRun | null = null
// The single worker does one job at a time, so runs queue behind each other (see runPgInWorker).
// Concurrent callers WAIT their turn instead of failing with "already running".
let runQueue: Promise<unknown> = Promise.resolve()

function resetPgWorker(): void {
  if (pgWorker) {
    pgWorker.terminate()
  }
  pgWorker = null
  pendingRun = null
}

function getPgWorker(): Worker {
  if (!pgWorker) {
    // Module worker: PGlite's browser build is ESM-only (see pg-sandbox-worker.js's own header)
    // and `importScripts` cannot load an ES module, so this worker must be constructed with
    // `type: "module"` — the one deliberate deviation from the sql.js worker's classic-worker
    // convention, documented at both call sites (here and in the worker file itself).
    pgWorker = new Worker("/workers/pg-sandbox-worker.js", { type: "module" })

    pgWorker.onmessage = (event: MessageEvent) => {
      if (!pendingRun) return

      const data = event.data as {
        type?: "status" | "exec-start" | "result"
        success?: boolean
        logs?: WorkspaceExecutionResult["consoleLogs"]
        error?: string
        message?: string
        timestamp?: number
      }

      // The engine finished booting and is about to run the suite. Swap the generous boot timeout
      // for the tighter execution timeout so a runaway suite is still caught reasonably quickly.
      if (data.type === "exec-start") {
        clearTimeout(pendingRun.timeoutId)
        pendingRun.timeoutId = setTimeout(() => {
          // Resolve BEFORE tearing down: resetPgWorker() nulls pendingRun and resolveActive()
          // no-ops on a null pendingRun. Reversing the order would leave the promise pending forever.
          resolveActive({ success: false, logs: [], error: EXEC_TIMEOUT_MESSAGE })
          resetPgWorker()
        }, pendingRun.execTimeoutMs)
        return
      }

      if (data.type === "status") {
        pendingRun.logs.push({
          type: "info",
          message: data.message || "Preparing Postgres engine...",
          timestamp: data.timestamp || Date.now(),
        })
        return
      }

      clearTimeout(pendingRun.timeoutId)
      const statusLogs = pendingRun.logs
      const payload: PgWorkerRunResult = {
        success: data.success === true,
        logs: [...statusLogs, ...(data.logs || [])],
        error: data.error,
      }
      resolveActive(payload)
    }

    pgWorker.onerror = (error) => {
      if (!pendingRun) return

      clearTimeout(pendingRun.timeoutId)
      const statusLogs = pendingRun.logs
      // Resolve BEFORE resetPgWorker() (which nulls pendingRun); otherwise resolveActive() would
      // short-circuit and the promise would never settle.
      resolveActive({
        success: false,
        logs: statusLogs,
        error: error.message || "Unknown Postgres worker error",
      })
      resetPgWorker()
    }
  }

  return pgWorker
}

function resolveActive(value: PgWorkerRunResult): void {
  if (!pendingRun) return
  const resolve = pendingRun.resolve
  pendingRun = null
  resolve(value)
}

export function runPgInWorker(
  workerData: PgWorkerRequest,
  execTimeoutMs = DEFAULT_EXEC_TIMEOUT_MS,
  bootTimeoutMs = DEFAULT_BOOT_TIMEOUT_MS
): Promise<PgWorkerRunResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      success: false,
      logs: [],
      error: "Execution environment is not browser",
    })
  }

  const task = runQueue.then(() => startPgRun(workerData, execTimeoutMs, bootTimeoutMs))
  // Keep the chain alive regardless of any individual run's outcome (startPgRun never rejects).
  runQueue = task.then(
    () => undefined,
    () => undefined
  )
  return task
}

function startPgRun(
  workerData: PgWorkerRequest,
  execTimeoutMs: number,
  bootTimeoutMs: number
): Promise<PgWorkerRunResult> {
  return new Promise<PgWorkerRunResult>((resolve) => {
    let worker: Worker
    try {
      worker = getPgWorker()
    } catch (error) {
      resolve({
        success: false,
        logs: [],
        error: error instanceof Error ? error.message : "Failed to spawn Postgres Web Worker",
      })
      return
    }

    // Start on the boot timeout. It is replaced by the execution timeout as soon as the worker
    // reports it is about to run the suite (`exec-start`).
    const timeoutId = setTimeout(() => {
      resolveActive({ success: false, logs: [], error: BOOT_TIMEOUT_MESSAGE })
      resetPgWorker()
    }, bootTimeoutMs)

    pendingRun = { resolve, timeoutId, execTimeoutMs, logs: [] }
    worker.postMessage(workerData)
  })
}
