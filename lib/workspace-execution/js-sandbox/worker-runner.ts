// Function to execute wrapped code string in Web Worker with a 5s timeout
import { WORKER_START_FAILURE_MESSAGE } from "../harness-errors"

export type WorkerRunResult = {
  success: boolean
  result?: any
  logs: any[]
  error?: string
  // Set by the worker (or by a spawn/onerror failure here) when the worker could not START, as
  // opposed to the learner's code failing. Only this kind of failure is retried.
  workerStartFailed?: boolean
}

function runInWorkerOnce(
  workerData: { code?: string; files?: { path: string; content: string }[]; entrypoint?: string },
  timeoutMs: number
): Promise<WorkerRunResult> {
  return new Promise((resolve) => {
    let worker: Worker
    try {
      worker = new Worker("/workers/js-sandbox-worker.js")
    } catch (err) {
      resolve({
        success: false,
        logs: [],
        error: `Failed to spawn Web Worker: ${err}`,
        workerStartFailed: true,
      })
      return
    }

    const timer = setTimeout(() => {
      worker.terminate()
      resolve({
        success: false,
        logs: [],
        error: "Code execution timed out. Try checking for infinite loops.",
      })
    }, timeoutMs)

    worker.onmessage = (e) => {
      clearTimeout(timer)
      worker.terminate()
      resolve(e.data as WorkerRunResult)
    }

    worker.onerror = (err) => {
      clearTimeout(timer)
      worker.terminate()
      resolve({
        success: false,
        logs: [],
        error: err.message || "Unknown worker error",
        workerStartFailed: true,
      })
    }

    worker.postMessage(workerData)
  })
}

export async function runInWorker(
  workerData: { code?: string; files?: { path: string; content: string }[]; entrypoint?: string },
  timeoutMs = 5000
): Promise<WorkerRunResult> {
  if (typeof window === "undefined") {
    return { success: false, logs: [], error: "Execution environment is not browser" }
  }

  const first = await runInWorkerOnce(workerData, timeoutMs)
  if (!first.workerStartFailed) {
    return first
  }

  // A worker-start failure (a dependency script or the worker itself failed to fetch) is usually
  // transient. Retry once with a fresh worker before giving up; only then show a plain message.
  const second = await runInWorkerOnce(workerData, timeoutMs)
  if (!second.workerStartFailed) {
    return second
  }

  return { success: false, logs: [], error: WORKER_START_FAILURE_MESSAGE }
}
