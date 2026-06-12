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
  logs: DsaExecutionResult["consoleLogs"]
}

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
        type?: "status" | "result"
        success?: boolean
        result?: unknown
        logs?: DsaExecutionResult["consoleLogs"]
        error?: string
        message?: string
        timestamp?: number
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
      const resolve = pendingRun.resolve
      const statusLogs = pendingRun.logs
      pendingRun = null
      resolve({
        success: data.success === true,
        result: data.result,
        logs: [...statusLogs, ...(data.logs || [])],
        error: data.error,
      })
    }

    pythonWorker.onerror = (error) => {
      if (!pendingRun) return

      clearTimeout(pendingRun.timeoutId)
      const resolve = pendingRun.resolve
      const statusLogs = pendingRun.logs
      resetPythonWorker()
      resolve({
        success: false,
        logs: statusLogs,
        error: error.message || "Unknown Python worker error",
      })
    }
  }

  return pythonWorker
}

export function runPythonInWorker(
  workerData: string | PythonWorkerData,
  timeoutMs = 5000
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

    const timeoutId = setTimeout(() => {
      resetPythonWorker()
      resolve({
        success: false,
        logs: [],
        error: "Code execution timed out. Try checking for infinite loops.",
      })
    }, timeoutMs)

    pendingRun = { resolve, timeoutId, logs: [] }
    worker.postMessage(typeof workerData === "string" ? { code: workerData } : workerData)
  })
}
