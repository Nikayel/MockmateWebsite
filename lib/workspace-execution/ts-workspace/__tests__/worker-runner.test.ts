import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The persistent-worker two-phase-timeout orchestration turned out to be testable after all (an
 * earlier version of this file assumed otherwise): stubbing `globalThis.Worker` with a minimal
 * fake lets these tests drive `onmessage`/`onerror` directly, without a real browser. Each test
 * `vi.resetModules()`s and re-imports `../worker-runner` so its module-level singleton state
 * (`tsWorker`/`pendingRun`/`runQueue`) never leaks between tests.
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

describe("runTsInWorker", () => {
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
    const { runTsInWorker } = await import("../worker-runner")
    const result = await runTsInWorker({ files: [], testPaths: [], hiddenTestPaths: [] })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not.*browser/i)
  })

  it("includes accumulated logs (e.g. the transpile status entry) when the transpile budget times out (regression)", async () => {
    const { runTsInWorker } = await import("../worker-runner")
    const runPromise = runTsInWorker({ files: [], testPaths: [], hiddenTestPaths: [] }, 5000, 20)

    await yieldToMicrotasksAndOneMacrotask()
    const worker = instances[0]
    worker.onmessage?.({ data: { type: "transpile-start", timestamp: Date.now() } })

    const result = await runPromise
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timed out/i)
    expect(result.logs.some((log) => log.message.includes("Transpiling TypeScript"))).toBe(true)
  })

  it("resets a stray worker on a late onerror with no pending run, so the next call spawns a fresh one (regression)", async () => {
    const { runTsInWorker } = await import("../worker-runner")

    const firstRun = runTsInWorker({ files: [], testPaths: [], hiddenTestPaths: [] }, 5000, 5000)
    await yieldToMicrotasksAndOneMacrotask()
    const firstWorker = instances[0]
    firstWorker.onmessage?.({ data: { success: true, logs: [] } })
    await firstRun

    // A stray error arrives after the run already settled (pendingRun is already null).
    firstWorker.onerror?.({ message: "boom" })

    const secondRun = runTsInWorker({ files: [], testPaths: [], hiddenTestPaths: [] }, 5000, 5000)
    await yieldToMicrotasksAndOneMacrotask()

    // A SECOND worker was spawned — the errored one was not silently reused.
    expect(instances).toHaveLength(2)
    expect(firstWorker.terminated).toBe(true)

    instances[1].onmessage?.({ data: { success: true, logs: [] } })
    await secondRun
  })
})
