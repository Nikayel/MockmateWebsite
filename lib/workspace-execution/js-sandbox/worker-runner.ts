// Function to execute wrapped code string in Web Worker with a 5s timeout
export function runInWorker(
  workerData: { code?: string; files?: { path: string; content: string }[]; entrypoint?: string },
  timeoutMs = 5000
): Promise<{ success: boolean; result?: any; logs: any[]; error?: string }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ success: false, logs: [], error: "Execution environment is not browser" })
      return
    }

    let worker: Worker
    try {
      worker = new Worker("/workers/js-sandbox-worker.js")
    } catch (err) {
      resolve({ success: false, logs: [], error: `Failed to spawn Web Worker: ${err}` })
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
      resolve(e.data)
    }

    worker.onerror = (err) => {
      clearTimeout(timer)
      worker.terminate()
      resolve({
        success: false,
        logs: [],
        error: err.message || "Unknown worker error",
      })
    }

    worker.postMessage(workerData)
  })
}
