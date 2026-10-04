import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * `runInWorker` spawns a fresh worker per call, so these tests stub `globalThis.Worker` with a
 * minimal fake and drive its `onmessage`/`onerror` directly. Each test `vi.resetModules()`s and
 * re-imports `../worker-runner` for a clean slate.
 *
 * The behavior under test: a worker-start failure (the worker or one of its dependency scripts
 * failed to fetch) is retried once with a fresh worker before the learner sees a plain message,
 * while a normal in-worker failure (their code threw) is returned as-is without a retry.
 */

interface FakeWorkerInstance {
  url: string
  onmessage: ((event: { data: unknown }) => void) | null
  onerror: ((event: { message?: string }) => void) | null
  postedMessages: unknown[]
  terminated: boolean
}

type GlobalWithBrowserStubs = typeof globalThis & {
  Worker?: typeof Worker
  window?: unknown
}

function yieldToMicrotasksAndOneMacrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 5))
}

describe("runInWorker", () => {
  const globalStubs = globalThis as GlobalWithBrowserStubs
  let instances: FakeWorkerInstance[]
  let originalWorker: typeof Worker | undefined
  let originalWindow: unknown

  beforeEach(() => {
    vi.resetModules()
    instances = []
    originalWorker = globalStubs.Worker
    originalWindow = globalStubs.window
    globalStubs.window = {}

    class FakeWorker implements FakeWorkerInstance {
      onmessage: ((event: { data: unknown }) => void) | null = null
      onerror: ((event: { message?: string }) => void) | null = null
      postedMessages: unknown[] = []
      terminated = false
      url: string
      constructor(url: string) {
        this.url = url
        instances.push(this)
      }
      postMessage(data: unknown) {
        this.postedMessages.push(data)
      }
      terminate() {
        this.terminated = true
      }
    }
    globalStubs.Worker = FakeWorker as unknown as typeof Worker
  })

  afterEach(() => {
    globalStubs.Worker = originalWorker
    globalStubs.window = originalWindow
  })

  it("resolves with a clear error instead of throwing when not in a browser", async () => {
    globalStubs.window = undefined
    const { runInWorker } = await import("../worker-runner")
    const result = await runInWorker({ code: "return 1" })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not.*browser/i)
  })

  it("returns a normal in-worker failure as-is, without retrying", async () => {
    const { runInWorker } = await import("../worker-runner")
    const runPromise = runInWorker({ code: "throw new Error('user code')" })
    await yieldToMicrotasksAndOneMacrotask()

    instances[0].onmessage?.({ data: { success: false, error: "user code", logs: [] } })

    const result = await runPromise
    expect(result.success).toBe(false)
    expect(result.error).toBe("user code")
    // A user-code failure is not a worker-start failure, so no second worker is spawned.
    expect(instances).toHaveLength(1)
  })

  it("retries once with a fresh worker on onerror, and succeeds when the retry starts", async () => {
    const { runInWorker } = await import("../worker-runner")
    const runPromise = runInWorker({ code: "return 2" })
    await yieldToMicrotasksAndOneMacrotask()

    instances[0].onerror?.({ message: "NetworkError" })
    await yieldToMicrotasksAndOneMacrotask()

    expect(instances).toHaveLength(2)
    expect(instances[0].terminated).toBe(true)
    instances[1].onmessage?.({ data: { success: true, result: 2, logs: [] } })

    const result = await runPromise
    expect(result.success).toBe(true)
    expect(result.result).toBe(2)
  })

  it("reports a plain message when both the first attempt and the retry fail to start", async () => {
    const { runInWorker } = await import("../worker-runner")
    const runPromise = runInWorker({ code: "return 3" })
    await yieldToMicrotasksAndOneMacrotask()

    instances[0].onerror?.({ message: "NetworkError" })
    await yieldToMicrotasksAndOneMacrotask()
    instances[1].onerror?.({ message: "NetworkError" })

    const result = await runPromise
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/couldn't start the code runner/i)
    expect(instances).toHaveLength(2)
  })

  it("retries on a tagged worker-start failure message from the worker", async () => {
    const { runInWorker } = await import("../worker-runner")
    const runPromise = runInWorker({ files: [], entrypoint: "tests/runner.js" })
    await yieldToMicrotasksAndOneMacrotask()

    instances[0].onmessage?.({
      data: { success: false, error: "shim load failed", logs: [], workerStartFailed: true },
    })
    await yieldToMicrotasksAndOneMacrotask()

    expect(instances).toHaveLength(2)
    instances[1].onmessage?.({ data: { success: true, result: undefined, logs: [] } })

    const result = await runPromise
    expect(result.success).toBe(true)
  })
})
