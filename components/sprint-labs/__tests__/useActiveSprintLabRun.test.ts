/**
 * @vitest-environment jsdom
 *
 * useActiveSprintLabRun — the one-fetch run-state hook extracted from `WorkbookOverviewShell`'s
 * inline effect (UX-SPEC.md §16.1(b)). Pins the same guarantee that shell's own test pins: one fetch,
 * and a setter escape hatch for the standup screen's run-creation flow.
 */
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.hoisted(() => ({ value: { user: null as unknown, initialized: true } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))

const mockFetchRun = vi.hoisted(() => vi.fn())
vi.mock("@/lib/sprint-labs/runs-client", () => ({ fetchActiveSprintLabRun: mockFetchRun }))

import { useActiveSprintLabRun } from "../useActiveSprintLabRun"

afterEach(() => {
  vi.clearAllMocks()
})

describe("useActiveSprintLabRun", () => {
  it("resolves to signed-out without fetching when there is no user", () => {
    mockAuth.value = { user: null, initialized: true }
    const { result } = renderHook(() => useActiveSprintLabRun("fixture-demo"))
    expect(result.current[0]).toEqual({ kind: "signed-out" })
    expect(mockFetchRun).not.toHaveBeenCalled()
  })

  it("fetches exactly once and resolves to no-run when nothing exists", async () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    mockFetchRun.mockResolvedValue(null)
    const { result } = renderHook(() => useActiveSprintLabRun("fixture-demo"))
    await waitFor(() => expect(result.current[0]).toEqual({ kind: "no-run" }))
    expect(mockFetchRun).toHaveBeenCalledTimes(1)
  })

  it("resolves to the fetched run when one exists", async () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    const run = {
      id: "run1",
      userId: "u1",
      workbookId: "fixture-demo",
      contentVersion: "v1",
      currentSprint: 1,
      board: { "DEMO-101": "todo" as const },
      status: "in_progress" as const,
      startedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }
    mockFetchRun.mockResolvedValue(run)
    const { result } = renderHook(() => useActiveSprintLabRun("fixture-demo"))
    await waitFor(() => expect(result.current[0]).toEqual({ kind: "run", run }))
  })

  it("exposes a setter that folds an externally-created run in without a second fetch", async () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    mockFetchRun.mockResolvedValue(null)
    const { result } = renderHook(() => useActiveSprintLabRun("fixture-demo"))
    await waitFor(() => expect(result.current[0]).toEqual({ kind: "no-run" }))

    const created = {
      id: "run2",
      userId: "u1",
      workbookId: "fixture-demo",
      contentVersion: "v1",
      currentSprint: 1,
      board: {},
      status: "in_progress" as const,
      startedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }
    act(() => {
      result.current[1]({ kind: "run", run: created })
    })
    expect(result.current[0]).toEqual({ kind: "run", run: created })
    expect(mockFetchRun).toHaveBeenCalledTimes(1)
  })
})
