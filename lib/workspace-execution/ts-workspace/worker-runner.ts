/**
 * Browser-side persistent-worker runner for TS workspaces, with a TWO-PHASE timeout: transpiling
 * ~60 files can blow the flat 5s budget the plain JS workspace runner uses (see worker-runner.ts
 * in js-sandbox/), so this gives transpile and execution their OWN budgets, switching from one to
 * the other when public/workers/js-sandbox-worker.js posts `{type: "transpile-start"}` /
 * `{type: "exec-start"}` — mirroring python-sandbox/worker-runner.ts's boot/exec phase swap
 * exactly (status message -> phase message -> tightened timeout).
 *
 * Deliberately a SEPARATE runner from js-sandbox/worker-runner.ts's `runInWorker`, not a shared
 * one: a plain JS workspace never emits phase messages at all (see js-sandbox-worker.js's
 * unchanged entrypoint-mode branch), so extending the flat-5s runner in place would either do
 * nothing useful for JS or need a parallel code path anyway. Both spawn workers from the SAME
 * `/workers/js-sandbox-worker.js` script; they never share a live Worker instance.
 *
 * Persistent (not fresh-per-run) so the in-worker content-hash transpile cache actually pays off
 * across repeated runs — see ts-transpiler-loader.js's header.
 */

export interface TsWorkerFile {
  path: string
  content: string
}

export interface TsWorkerData {
  files: TsWorkerFile[]
  testPaths: string[]
  hiddenTestPaths: string[]
}

export interface TsWorkerRunResult {
  success: boolean
  logs: Array<{ type: "log" | "error" | "warn" | "info"; message: string; timestamp: number }>
  error?: string
  transpileTimingsMs?: Record<string, number>
}

interface WorkerPhaseMessage {
  type?: "transpile-start" | "exec-start"
  success?: boolean
  result?: { transpileTimingsMs?: Record<string, number> }
  logs?: TsWorkerRunResult["logs"]
  error?: string
  timestamp?: number
}

interface PendingTsRun {
  resolve: (value: TsWorkerRunResult) => void
  timeoutId: ReturnType<typeof setTimeout>
  execTimeoutMs: number
  logs: TsWorkerRunResult["logs"]
}

// ~60 files, cold (first run in a fresh worker: importScripts of the ~9MB vendored compiler PLUS
// transpiling every file with no cache hits) needs real headroom above the execution budget a
// learner's actual test run gets. Measured per-file cost is in the task report; this is a
// generous ceiling, not the expected common case (a warm worker with most files cache-hit
// finishes far sooner).
const DEFAULT_TRANSPILE_TIMEOUT_MS = 20000
// Conservative fallback ONLY: the real production call site (workspace-runner.ts's
// TS_WORKSPACE_EXEC_TIMEOUT_MS) overrides this to 15s, because tests run sequentially (their
// durations SUM against this budget, not just the slowest one — see buildExecTimeoutMessage
// below). Left at 5s here so a caller that does not explicitly override it gets the same
// conservative budget the flat single-file runners use, not a silently-widened one.
const DEFAULT_EXEC_TIMEOUT_MS = 5000

const TRANSPILE_TIMEOUT_MESSAGE =
  "TypeScript transpilation timed out. The workspace may be too large or contain a compiler edge case."

/**
 * Cause-accurate exec-timeout message: tests now run SEQUENTIALLY (see vitest-shim.js's I2 fix),
 * so the budget bounds the SUM of every test's duration, not the slowest one — a suite of
 * individually-fast async tests can legitimately need more wall-clock time than a single-test
 * budget would suggest. Derived from the ACTUAL `execTimeoutMs` in effect for this run (not a
 * fixed string) so it stays accurate for whatever caller-supplied override was used, not just the
 * ts-workspace runner's current 15s choice.
 */
export function buildExecTimeoutMessage(execTimeoutMs: number): string {
  return (
    "Test run exceeded the " +
    Math.round(execTimeoutMs / 1000) +
    "s budget. Tests run sequentially; check for slow awaits or infinite loops."
  )
}

let tsWorker: Worker | null = null
let pendingRun: PendingTsRun | null = null
// One worker, one job at a time (matches python-sandbox/worker-runner.ts): concurrent callers
// queue behind each other rather than racing a shared pendingRun.
let runQueue: Promise<unknown> = Promise.resolve()

function resetTsWorker(): void {
  if (tsWorker) {
    tsWorker.terminate()
  }
  tsWorker = null
  pendingRun = null
}

function getTsWorker(): Worker {
  if (!tsWorker) {
    tsWorker = new Worker("/workers/js-sandbox-worker.js")

    tsWorker.onmessage = (event: MessageEvent) => {
      if (!pendingRun) return
      const data = event.data as WorkerPhaseMessage

      if (data.type === "transpile-start") {
        pendingRun.logs.push({
          type: "info",
          message: "Transpiling TypeScript...",
          timestamp: data.timestamp || Date.now(),
        })
        return
      }

      if (data.type === "exec-start") {
        // Transpiling is done; swap to the tight execution budget so a runaway loop is still
        // caught quickly without penalizing a large, legitimately-slow-to-transpile workspace.
        // Captured into a local const (not read via `pendingRun!` inside the callback below) so
        // the message it builds always matches the budget THIS run was actually given.
        const execTimeoutMs = pendingRun.execTimeoutMs
        clearTimeout(pendingRun.timeoutId)
        pendingRun.timeoutId = setTimeout(() => {
          resolveActive({
            success: false,
            logs: pendingRun ? pendingRun.logs : [],
            error: buildExecTimeoutMessage(execTimeoutMs),
          })
          resetTsWorker()
        }, execTimeoutMs)
        return
      }

      clearTimeout(pendingRun.timeoutId)
      const statusLogs = pendingRun.logs
      resolveActive({
        success: data.success === true,
        logs: [...statusLogs, ...(data.logs || [])],
        error: data.error,
        transpileTimingsMs: data.result?.transpileTimingsMs,
      })
    }

    tsWorker.onerror = (error) => {
      // resetTsWorker() must run regardless of whether there was an active pending run: an error
      // event on a worker with no pendingRun (a stray/late event after a run already settled)
      // used to early-return before reaching it, leaving a worker that just errored alive to be
      // reused by the next getTsWorker() call.
      if (pendingRun) {
        clearTimeout(pendingRun.timeoutId)
        const statusLogs = pendingRun.logs
        resolveActive({
          success: false,
          logs: statusLogs,
          error: error.message || "Unknown worker error",
        })
      }
      resetTsWorker()
    }
  }

  return tsWorker
}

function resolveActive(value: TsWorkerRunResult): void {
  if (!pendingRun) return
  const resolve = pendingRun.resolve
  pendingRun = null
  resolve(value)
}

export function runTsInWorker(
  workerData: TsWorkerData,
  execTimeoutMs = DEFAULT_EXEC_TIMEOUT_MS,
  transpileTimeoutMs = DEFAULT_TRANSPILE_TIMEOUT_MS
): Promise<TsWorkerRunResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      success: false,
      logs: [],
      error: "Execution environment is not browser",
    })
  }

  const task = runQueue.then(() => startTsRun(workerData, execTimeoutMs, transpileTimeoutMs))
  runQueue = task.then(
    () => undefined,
    () => undefined
  )
  return task
}

function startTsRun(
  workerData: TsWorkerData,
  execTimeoutMs: number,
  transpileTimeoutMs: number
): Promise<TsWorkerRunResult> {
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = getTsWorker()
    } catch (error) {
      resolve({
        success: false,
        logs: [],
        error: error instanceof Error ? error.message : "Failed to spawn TypeScript Web Worker",
      })
      return
    }

    // Start on the transpile budget. It is replaced by the execution budget as soon as the
    // worker reports `exec-start` (immediately, with no transpile-start at all, for a workspace
    // with no .ts/.tsx files).
    const timeoutId = setTimeout(() => {
      // `pendingRun` is guaranteed set by the time this fires (it is assigned synchronously right
      // after this timer is created, below) — read its accumulated logs (e.g. the "Transpiling
      // TypeScript..." status entry) rather than discarding them.
      resolveActive({
        success: false,
        logs: pendingRun ? pendingRun.logs : [],
        error: TRANSPILE_TIMEOUT_MESSAGE,
      })
      resetTsWorker()
    }, transpileTimeoutMs)

    pendingRun = { resolve, timeoutId, execTimeoutMs, logs: [] }
    worker.postMessage(workerData)
  })
}
