import type { DsaExecutionResult } from "../types"

interface PythonWorkerRunResult {
  success: boolean
  result?: unknown
  logs: DsaExecutionResult["consoleLogs"]
  error?: string
}

interface PythonWorkerData {
  code?: string
  files?: { path: string; content: string }[]
  entrypoint?: string
}

interface PendingPythonRun {
  resolve: (value: PythonWorkerRunResult) => void
  timeoutId: ReturnType<typeof setTimeout>
  execTimeoutMs: number
  logs: DsaExecutionResult["consoleLogs"]
}

// Downloading + initializing Pyodide on a first run is a multi-MB CDN fetch that
// can take many seconds on a slow connection. Keep this well above the execution
// budget so a slow COLD START is never misreported as an infinite loop.
const DEFAULT_BOOT_TIMEOUT_MS = 60000
// Once the runtime is ready, real user code should finish quickly; a longer run
// is treated as a runaway loop.
const DEFAULT_EXEC_TIMEOUT_MS = 5000

const BOOT_TIMEOUT_MESSAGE =
  "Couldn't start the Python runtime. Check your connection and try again."
const EXEC_TIMEOUT_MESSAGE = "Code execution timed out. Try checking for infinite loops."

let pythonWorker: Worker | null = null
let pendingRun: PendingPythonRun | null = null

function resetPythonWorker(): void {
  if (pythonWorker) {
    pythonWorker.terminate()
  }
  pythonWorker = null
  pendingRun = null
}

function getPythonWorker(): Worker {
  if (!pythonWorker) {
    pythonWorker = new Worker("/workers/python-sandbox-worker.js")

    pythonWorker.onmessage = (event: MessageEvent) => {
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

      // The runtime has finished booting and is about to execute user code.
      // Swap the generous boot timeout for the tight execution timeout so that
      // a runaway loop is still caught quickly, without penalizing cold starts.
      if (data.type === "exec-start") {
        clearTimeout(pendingRun.timeoutId)
        pendingRun.timeoutId = setTimeout(() => {
          // Resolve BEFORE tearing down: resetPythonWorker() nulls pendingRun,
          // and resolveActive() no-ops on a null pendingRun. Reversing the order
          // would leave the run promise pending forever.
          resolveActive({ success: false, logs: [], error: EXEC_TIMEOUT_MESSAGE })
          resetPythonWorker()
        }, pendingRun.execTimeoutMs)
        return
      }

      if (data.type === "status") {
        pendingRun.logs.push({
          type: "info",
          message: data.message || "Preparing Python runtime...",
          timestamp: data.timestamp || Date.now(),
        })
        return
      }

      clearTimeout(pendingRun.timeoutId)
      const statusLogs = pendingRun.logs
      const payload: PythonWorkerRunResult = {
        success: data.success === true,
        result: data.result,
        logs: [...statusLogs, ...(data.logs || [])],
        error: data.error,
      }
      resolveActive(payload)
    }

    pythonWorker.onerror = (error) => {
      if (!pendingRun) return

      clearTimeout(pendingRun.timeoutId)
      const statusLogs = pendingRun.logs
      // Resolve BEFORE resetPythonWorker() (which nulls pendingRun); otherwise
      // resolveActive() would short-circuit and the promise would never settle.
      resolveActive({
        success: false,
        logs: statusLogs,
        error: error.message || "Unknown Python worker error",
      })
      resetPythonWorker()
    }
  }

  return pythonWorker
}

// Resolve the in-flight run exactly once and clear it.
function resolveActive(value: PythonWorkerRunResult): void {
  if (!pendingRun) return
  const resolve = pendingRun.resolve
  pendingRun = null
  resolve(value)
}

export function runPythonInWorker(
  workerData: string | PythonWorkerData,
  execTimeoutMs = DEFAULT_EXEC_TIMEOUT_MS,
  bootTimeoutMs = DEFAULT_BOOT_TIMEOUT_MS
): Promise<PythonWorkerRunResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ success: false, logs: [], error: "Execution environment is not browser" })
      return
    }

    if (pendingRun) {
      resolve({ success: false, logs: [], error: "Python execution is already running" })
      return
    }

    let worker: Worker
    try {
      worker = getPythonWorker()
    } catch (error) {
      resolve({
        success: false,
        logs: [],
        error: error instanceof Error ? error.message : "Failed to spawn Python Web Worker",
      })
      return
    }

    // Start on the boot timeout. It is replaced by the execution timeout as soon
    // as the worker reports it is about to run code (`exec-start`).
    const timeoutId = setTimeout(() => {
      // Resolve BEFORE resetPythonWorker() nulls pendingRun, or the promise hangs.
      resolveActive({ success: false, logs: [], error: BOOT_TIMEOUT_MESSAGE })
      resetPythonWorker()
    }, bootTimeoutMs)

    pendingRun = { resolve, timeoutId, execTimeoutMs, logs: [] }
    worker.postMessage(typeof workerData === "string" ? { code: workerData } : workerData)
  })
}
