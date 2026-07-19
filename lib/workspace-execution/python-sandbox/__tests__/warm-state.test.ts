/**
 * prewarmPythonRuntime boots the worker + Pyodide on workspace mount so the user's FIRST Run
 * doesn't pay the multi-second WASM cold start. These tests pin its contract: single warm ping
 * in flight, warm-state marked only on success, failures swallowed (with retry possible), and —
 * critically — a real Run issued mid-warm QUEUES behind the ping instead of failing with
 * "Python execution is already running".
 *
 * The worker itself is a plain JS file Pyodide-side, so (mirroring worker-module-purge.test.ts)
 * its half of the contract is checked against the SHIPPED source: the warm branch must answer
 * before any execution path.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

class FakeWorker {
  static instances: FakeWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((error: { message?: string }) => void) | null = null
  posted: unknown[] = []

  constructor(public url: string) {
    FakeWorker.instances.push(this)
  }

  postMessage(data: unknown): void {
    this.posted.push(data)
  }

  terminate(): void {}

  emit(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent)
  }
}

/** Fresh module-level state (warmed flag, in-flight guard, worker, run queue) per test. */
async function loadSandbox() {
  vi.resetModules()
  const warmState = await import("../warm-state")
  const workerRunner = await import("../worker-runner")
  return { ...warmState, ...workerRunner }
}

/** One macrotask: lets the run queue dispatch and any settled promises run their handlers. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("prewarmPythonRuntime", () => {
  beforeEach(() => {
    FakeWorker.instances = []
    vi.stubGlobal("window", {})
    vi.stubGlobal("Worker", FakeWorker)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("boots the worker with a warm ping and marks the runtime warm on success", async () => {
    const sandbox = await loadSandbox()
    expect(sandbox.isPythonRuntimeWarm()).toBe(false)

    sandbox.prewarmPythonRuntime()
    await flush()

    expect(FakeWorker.instances).toHaveLength(1)
    expect(FakeWorker.instances[0].posted).toEqual([{ warm: true }])

    FakeWorker.instances[0].emit({ type: "result", success: true, logs: [] })
    await flush()

    expect(sandbox.isPythonRuntimeWarm()).toBe(true)
  })

  it("is single-flight: repeated calls post exactly one warm ping, and none once warm", async () => {
    const sandbox = await loadSandbox()

    sandbox.prewarmPythonRuntime()
    sandbox.prewarmPythonRuntime()
    await flush()
    sandbox.prewarmPythonRuntime()
    await flush()

    expect(FakeWorker.instances).toHaveLength(1)
    expect(FakeWorker.instances[0].posted).toEqual([{ warm: true }])

    FakeWorker.instances[0].emit({ type: "result", success: true, logs: [] })
    await flush()

    // Once warm, further calls don't even touch the worker.
    sandbox.prewarmPythonRuntime()
    await flush()
    expect(FakeWorker.instances[0].posted).toHaveLength(1)
  })

  it("swallows a failed warm-up, stays cold, and lets a later call retry", async () => {
    const sandbox = await loadSandbox()

    sandbox.prewarmPythonRuntime()
    await flush()
    FakeWorker.instances[0].emit({
      type: "result",
      success: false,
      error: "Couldn't start the Python runtime.",
      logs: [],
    })
    await flush()

    expect(sandbox.isPythonRuntimeWarm()).toBe(false)

    // A later mount may try again.
    sandbox.prewarmPythonRuntime()
    await flush()
    expect(FakeWorker.instances[0].posted).toEqual([{ warm: true }, { warm: true }])
  })

  it("queues a real Run issued mid-warm behind the ping instead of failing it", async () => {
    const sandbox = await loadSandbox()

    sandbox.prewarmPythonRuntime()
    await flush()
    const worker = FakeWorker.instances[0]

    const runPromise = sandbox.runPythonInWorker("print('hi')")
    await flush()
    // Still only the warm ping on the wire: the real run WAITS its turn.
    expect(worker.posted).toEqual([{ warm: true }])

    worker.emit({ type: "result", success: true, logs: [] })
    await flush()
    expect(worker.posted).toEqual([{ warm: true }, { code: "print('hi')" }])

    worker.emit({ type: "exec-start", timestamp: 1 })
    worker.emit({ type: "result", success: true, result: 42, logs: [] })
    const result = await runPromise

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it("no-ops outside a browser environment", async () => {
    vi.unstubAllGlobals()
    vi.stubGlobal("Worker", FakeWorker)
    const sandbox = await loadSandbox()

    sandbox.prewarmPythonRuntime()
    await flush()

    expect(FakeWorker.instances).toHaveLength(0)
    expect(sandbox.isPythonRuntimeWarm()).toBe(false)
  })
})

describe("python-sandbox-worker warm contract", () => {
  const WORKER = readFileSync(
    join(process.cwd(), "public/workers/python-sandbox-worker.js"),
    "utf8"
  )

  it("answers a warm ping right after the runtime loads, before any execution", () => {
    expect(WORKER).toMatch(/const \{ code, files, entrypoint, warm \}/)

    const warmIndex = WORKER.indexOf("if (warm)")
    expect(warmIndex).toBeGreaterThan(-1)
    // The warm branch must short-circuit before the execution path begins (`exec-start` is the
    // message that arms the runner's tight execution timeout).
    expect(warmIndex).toBeLessThan(WORKER.indexOf('"exec-start"'))
  })
})
