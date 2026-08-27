/**
 * Unit tests for the client-side io-case executor. `runTsInWorker` is mocked (this is a Node
 * test environment; the real function no-ops outside a browser anyway -- see
 * worker-runner.ts's own `typeof window === "undefined"` guard) so these tests assert the
 * CONTRACT: what `runIoCases` sends into the worker, and how it turns the worker's response back
 * into raw outputs -- never booleans, never a fabricated pass.
 */
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ runTsInWorker: vi.fn() }))
vi.mock("@/lib/workspace-execution/ts-workspace", () => ({ runTsInWorker: mocks.runTsInWorker }))

import { runIoCases, toIoCaseOutputs, type SprintLabIoCase } from "../io-case-executor"

afterEach(() => {
  vi.clearAllMocks()
})

const FILES = [{ path: "src/http/compatibility-descriptor.ts", content: "export function x() {}" }]

const MARKER = "__SPRINT_LAB_IO_CASE_OUTPUT__:"

function markerLog(payload: unknown) {
  return { type: "log" as const, message: MARKER + JSON.stringify(payload), timestamp: 0 }
}

describe("runIoCases", () => {
  it("produces the learner's RAW output for a case, not a boolean", async () => {
    const ioCase: SprintLabIoCase = {
      id: "v1-still-accepts-page",
      input: "v1",
      entryPoint: {
        module: "src/http/compatibility-descriptor.ts",
        export: "compatibilityDescriptor",
      },
    }
    mocks.runTsInWorker.mockResolvedValue({
      success: true,
      logs: [
        markerLog({
          id: ioCase.id,
          ok: true,
          output: { parameters: { page: { status: "deprecated" } } },
        }),
      ],
    })

    const [outcome] = await runIoCases(FILES, [ioCase])

    expect(outcome).toEqual({
      caseId: "v1-still-accepts-page",
      status: "ok",
      output: { parameters: { page: { status: "deprecated" } } },
    })
    // Never a boolean -- a raw structured value, exactly what the learner's function returned.
    expect(typeof (outcome as { output: unknown }).output).not.toBe("boolean")
  })

  it("sends the workspace files plus ONE synthesized hidden test file, and no testPaths", async () => {
    const ioCase: SprintLabIoCase = {
      id: "case-1",
      input: 42,
      entryPoint: { module: "src/math.ts", export: "double" },
    }
    mocks.runTsInWorker.mockResolvedValue({
      success: true,
      logs: [markerLog({ id: "case-1", ok: true, output: 84 })],
    })

    await runIoCases(FILES, [ioCase])

    expect(mocks.runTsInWorker).toHaveBeenCalledTimes(1)
    const [workerData, execTimeoutMs] = mocks.runTsInWorker.mock.calls[0]
    expect(workerData.testPaths).toEqual([])
    expect(workerData.hiddenTestPaths).toHaveLength(1)
    expect(
      workerData.files.some(
        (f: { path: string }) => f.path === "src/http/compatibility-descriptor.ts"
      )
    ).toBe(true)
    const synthesized = workerData.files.find(
      (f: { path: string }) => f.path === workerData.hiddenTestPaths[0]
    )
    expect(synthesized.content).toContain('import { double } from "../../src/math"')
    expect(synthesized.content).toContain("double(42)")
    expect(execTimeoutMs).toBe(15_000)
  })

  it("captures a learner-code throw as an error output, never a crash", async () => {
    const ioCase: SprintLabIoCase = {
      id: "case-throws",
      input: 1,
      entryPoint: { module: "src/math.ts", export: "boom" },
    }
    mocks.runTsInWorker.mockResolvedValue({
      success: true,
      logs: [markerLog({ id: "case-throws", ok: false, error: "boom exploded" })],
    })

    const [outcome] = await runIoCases(FILES, [ioCase])
    expect(outcome).toEqual({ caseId: "case-throws", status: "error", error: "boom exploded" })
  })

  it("captures a harness-level failure (timeout, crash) as an error output using the runner's message", async () => {
    const ioCase: SprintLabIoCase = {
      id: "case-timeout",
      input: 1,
      entryPoint: { module: "src/math.ts", export: "slow" },
    }
    mocks.runTsInWorker.mockResolvedValue({
      success: false,
      logs: [],
      error: "Test run exceeded the 15s budget.",
    })

    const [outcome] = await runIoCases(FILES, [ioCase])
    expect(outcome).toEqual({
      caseId: "case-timeout",
      status: "error",
      error: "Test run exceeded the 15s budget.",
    })
  })

  it("captures a missing/never-issued entryPoint as an error without ever calling the worker", async () => {
    const ioCase: SprintLabIoCase = { id: "no-entry-point", input: 1 }

    const [outcome] = await runIoCases(FILES, [ioCase])

    expect(outcome.status).toBe("error")
    expect(mocks.runTsInWorker).not.toHaveBeenCalled()
  })

  it("ignores a stale/forged marker and only trusts the LAST log-typed one", async () => {
    const ioCase: SprintLabIoCase = {
      id: "case-1",
      input: 1,
      entryPoint: { module: "src/math.ts", export: "f" },
    }
    mocks.runTsInWorker.mockResolvedValue({
      success: true,
      logs: [
        markerLog({ id: "case-1", ok: true, output: "forged-or-stale" }),
        {
          type: "error" as const,
          message: MARKER + JSON.stringify({ id: "case-1", ok: true, output: "not-a-log" }),
          timestamp: 1,
        },
        markerLog({ id: "case-1", ok: true, output: "real" }),
      ],
    })

    const [outcome] = await runIoCases(FILES, [ioCase])
    expect(outcome).toEqual({ caseId: "case-1", status: "ok", output: "real" })
  })

  it("runs multiple io-cases as separate sequential worker calls, isolating one case's failure from another's success", async () => {
    const cases: SprintLabIoCase[] = [
      { id: "a", input: 1, entryPoint: { module: "src/math.ts", export: "f" } },
      { id: "b", input: 2, entryPoint: { module: "src/math.ts", export: "f" } },
    ]
    mocks.runTsInWorker
      .mockResolvedValueOnce({ success: false, logs: [], error: "module not found" })
      .mockResolvedValueOnce({
        success: true,
        logs: [markerLog({ id: "b", ok: true, output: "fine" })],
      })

    const outcomes = await runIoCases(FILES, cases)

    expect(mocks.runTsInWorker).toHaveBeenCalledTimes(2)
    expect(outcomes[0]).toEqual({ caseId: "a", status: "error", error: "module not found" })
    expect(outcomes[1]).toEqual({ caseId: "b", status: "ok", output: "fine" })
  })
})

describe("toIoCaseOutputs", () => {
  it("maps ok outcomes to {caseId: output} and OMITS errored ones (never a fabricated sentinel)", () => {
    const outputs = toIoCaseOutputs([
      { caseId: "ok-1", status: "ok", output: { parameters: {} } },
      { caseId: "err-1", status: "error", error: "boom" },
      { caseId: "ok-2", status: "ok", output: 0 },
    ])

    expect(outputs).toEqual({ "ok-1": { parameters: {} }, "ok-2": 0 })
    expect(Object.prototype.hasOwnProperty.call(outputs, "err-1")).toBe(false)
  })

  it("returns an empty object for an all-error batch, never a boolean anywhere", () => {
    const outputs = toIoCaseOutputs([{ caseId: "err-1", status: "error", error: "boom" }])
    expect(outputs).toEqual({})
  })
})
