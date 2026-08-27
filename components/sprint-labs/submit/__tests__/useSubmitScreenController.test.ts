/**
 * @vitest-environment jsdom
 *
 * Covers the gate-execution seam this task wired in: `start()` fetches the learner's current
 * workspace files, runs the client-side io-case executor over the io-cases the open call issued,
 * and posts the RAW resulting outputs (never booleans, never fabricated) to `completeAttempt`.
 * `openAttempt`/`completeAttempt`/`ensureBoardAtLeast`/the session cache all stay mocked, matching
 * `useTicketReview.test.tsx`'s established style for this same attempt-client surface.
 */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getCachedCompletedOutcome: vi.fn(),
  cacheCompletedOutcome: vi.fn(),
  openAttempt: vi.fn(),
  completeAttempt: vi.fn(),
  ensureBoardAtLeast: vi.fn(),
  fetchSprintLabWorkspaceFiles: vi.fn(),
  runIoCases: vi.fn(),
}))
vi.mock("../attempt-client", () => ({
  getCachedCompletedOutcome: mocks.getCachedCompletedOutcome,
  cacheCompletedOutcome: mocks.cacheCompletedOutcome,
  openAttempt: mocks.openAttempt,
  completeAttempt: mocks.completeAttempt,
  ensureBoardAtLeast: mocks.ensureBoardAtLeast,
}))
vi.mock("@/lib/sprint-labs/runs-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sprint-labs/runs-client")>(
    "@/lib/sprint-labs/runs-client"
  )
  return { ...actual, fetchSprintLabWorkspaceFiles: mocks.fetchSprintLabWorkspaceFiles }
})
vi.mock("@/lib/sprint-labs/runtime/io-case-executor", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sprint-labs/runtime/io-case-executor")>(
    "@/lib/sprint-labs/runtime/io-case-executor"
  )
  return { ...actual, runIoCases: mocks.runIoCases }
})

import { useSubmitScreenController } from "../useSubmitScreenController"

beforeEach(() => {
  mocks.getCachedCompletedOutcome.mockReturnValue(null)
  // `useSubmitScreenController.ts`'s own (pre-existing, unmodified-by-this-task) code chains
  // `.then(...)` onto `ensureBoardAtLeast`'s result, so this must be configured BEFORE `start()`
  // runs, not just cleaned up after -- an unconfigured `vi.fn()` resolves to `undefined`, and
  // `undefined.then` throws.
  mocks.ensureBoardAtLeast.mockResolvedValue("review")
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const OPENED = {
  ok: true,
  data: {
    attemptId: "a1",
    ticketKey: "MER-201",
    variantId: "v0",
    aiPolicy: "unassisted",
    ioCases: [
      {
        id: "case-1",
        humanName: "Escaped: x",
        input: "v1",
        entryPoint: { module: "src/x.ts", export: "f" },
      },
    ],
    probes: [],
    regressionManifest: [],
    submissionsUsed: 0,
    submissionsRemaining: 4,
  },
}

const COMPLETED_OUTCOME = {
  attempt: {
    ticketKey: "MER-201",
    aiPolicy: "unassisted",
    variantId: "v0",
    finalized: true,
    gateResults: [],
    escapedDefects: [],
    scores: {
      understanding: 80,
      problemSolving: 80,
      codeQuality: 80,
      communication: null,
      verification: 80,
      overall: 80,
    },
    submittedAt: "2026-01-01T00:00:00.000Z",
  },
  submissionsRemaining: 4,
}

describe("useSubmitScreenController — gate execution seam", () => {
  it("runs the io-case executor over the reassembled workspace files and posts its RAW outputs to completeAttempt", async () => {
    mocks.openAttempt.mockResolvedValue(OPENED)
    mocks.fetchSprintLabWorkspaceFiles.mockResolvedValue({
      ok: true,
      files: [{ path: "src/x.ts", content: "export function f() { return { a: 1 } }" }],
    })
    // The executor's own raw-output result -- a structured object, never a boolean.
    mocks.runIoCases.mockResolvedValue([{ caseId: "case-1", status: "ok", output: { a: 1 } }])
    mocks.completeAttempt.mockResolvedValue({ ok: true, data: COMPLETED_OUTCOME })

    const { result } = renderHook(() =>
      useSubmitScreenController({ runId: "run1", ticketKey: "MER-201", boardStatus: "todo" })
    )
    await waitFor(() => expect(result.current.phase).toBe("confirm-first"))
    act(() => result.current.start())
    await waitFor(() => expect(mocks.completeAttempt).toHaveBeenCalledTimes(1))

    // The executor was handed the reassembled files (seed [] + the fetched overlay) and the
    // exact io-cases the open call issued.
    expect(mocks.runIoCases).toHaveBeenCalledWith(
      [{ path: "src/x.ts", content: "export function f() { return { a: 1 } }" }],
      OPENED.data.ioCases
    )

    // completeAttempt received the executor's RAW output, not a boolean and not an empty object.
    const [completeInput] = mocks.completeAttempt.mock.calls[0]
    expect(completeInput.ioCaseOutputs).toEqual({ "case-1": { a: 1 } })
    expect(typeof completeInput.ioCaseOutputs["case-1"]).not.toBe("boolean")
  })

  it("omits a case the executor could not run, never fabricating a value for it", async () => {
    mocks.openAttempt.mockResolvedValue(OPENED)
    mocks.fetchSprintLabWorkspaceFiles.mockResolvedValue({ ok: true, files: [] })
    mocks.runIoCases.mockResolvedValue([
      { caseId: "case-1", status: "error", error: "learner code threw" },
    ])
    mocks.completeAttempt.mockResolvedValue({ ok: true, data: COMPLETED_OUTCOME })

    const { result } = renderHook(() =>
      useSubmitScreenController({ runId: "run1", ticketKey: "MER-201", boardStatus: "todo" })
    )
    await waitFor(() => expect(result.current.phase).toBe("confirm-first"))
    act(() => result.current.start())
    await waitFor(() => expect(mocks.completeAttempt).toHaveBeenCalledTimes(1))

    const [completeInput] = mocks.completeAttempt.mock.calls[0]
    expect(completeInput.ioCaseOutputs).toEqual({})
  })

  it("still runs the executor (against an empty file set) when the workspace-files load fails, rather than aborting the submission", async () => {
    mocks.openAttempt.mockResolvedValue(OPENED)
    mocks.fetchSprintLabWorkspaceFiles.mockResolvedValue({ ok: false })
    mocks.runIoCases.mockResolvedValue([{ caseId: "case-1", status: "error", error: "no files" }])
    mocks.completeAttempt.mockResolvedValue({ ok: true, data: COMPLETED_OUTCOME })

    const { result } = renderHook(() =>
      useSubmitScreenController({ runId: "run1", ticketKey: "MER-201", boardStatus: "todo" })
    )
    await waitFor(() => expect(result.current.phase).toBe("confirm-first"))
    act(() => result.current.start())

    await waitFor(() => expect(result.current.phase).toBe("active"))
    expect(mocks.completeAttempt).toHaveBeenCalledTimes(1)
    expect(mocks.runIoCases).toHaveBeenCalledWith([], OPENED.data.ioCases)
  })
})
