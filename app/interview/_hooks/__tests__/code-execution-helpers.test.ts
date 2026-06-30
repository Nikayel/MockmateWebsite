import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Scenario } from "@/lib/scenarios"

vi.mock("@/lib/workspace-execution", () => ({
  executeScenarioInBrowser: vi.fn(),
}))
vi.mock("@/lib/piston", () => ({
  isExecutionServiceError: vi.fn(),
}))
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { executeScenarioInBrowser } from "@/lib/workspace-execution"
import { isExecutionServiceError } from "@/lib/piston"
import { toast } from "sonner"
import { applyExecutionApiError, executeScenario } from "../code-execution-helpers"

const dsaScenario = { id: "two-sum", type: "dsa", title: "Two Sum" } as unknown as Scenario

describe("executeScenario", () => {
  beforeEach(() => {
    vi.mocked(executeScenarioInBrowser).mockReset()
    vi.mocked(isExecutionServiceError).mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns a 400 when no scenario is selected", async () => {
    const result = await executeScenario({
      selectedScenario: null,
      code: "x",
      selectedLanguage: "javascript",
      workspaceContext: [],
    })
    expect(result).toEqual({ ok: false, status: 400, data: { error: "No scenario selected" } })
  })

  it("uses the browser sandbox result when available (no /api/execute call)", async () => {
    vi.mocked(executeScenarioInBrowser).mockResolvedValue({
      results: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0 },
      error: undefined,
    } as any)
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const result = await executeScenario({
      selectedScenario: dsaScenario,
      code: "code",
      selectedLanguage: "javascript",
      workspaceContext: [],
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
  })

  it("returns a 400 without touching /api/execute when the sandbox declines", async () => {
    // The Piston `/api/execute` fallback is deprecated and unwired: a null sandbox result
    // (unsupported language) now resolves to a 400 instead of a server round-trip.
    vi.mocked(executeScenarioInBrowser).mockResolvedValue(null as any)
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const result = await executeScenario({
      selectedScenario: dsaScenario,
      code: "function f(){}",
      selectedLanguage: "python",
      workspaceContext: [],
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.status).toBe(400)
    expect(String(result.data.error)).toMatch(/Unsupported execution language/)
  })
})

describe("applyExecutionApiError", () => {
  const makeCtx = () => ({
    setConsoleLogs: vi.fn(),
    setTestResults: vi.fn(),
    setInterviewerMessages: vi.fn(),
    setIsRunningTests: vi.fn(),
    playSound: vi.fn(),
  })

  beforeEach(() => {
    vi.mocked(isExecutionServiceError).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it("on a transient error: nudges the interviewer, plays fail, stops running", () => {
    vi.mocked(isExecutionServiceError).mockReturnValue(false)
    const ctx = makeCtx()

    applyExecutionApiError({ ok: false, status: 500, data: { error: "boom" } }, ctx)

    expect(ctx.setConsoleLogs).toHaveBeenCalledTimes(1)
    expect(ctx.setTestResults).toHaveBeenCalledTimes(1)
    expect(ctx.setInterviewerMessages).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
    expect(ctx.playSound).toHaveBeenCalledWith("fail")
    expect(ctx.setIsRunningTests).toHaveBeenCalledWith(false)
  })

  it("when the service is down: toasts instead of nudging the interviewer", () => {
    vi.mocked(isExecutionServiceError).mockReturnValue(true)
    const ctx = makeCtx()

    applyExecutionApiError({ ok: false, status: 503, data: {} }, ctx)

    expect(ctx.setInterviewerMessages).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(ctx.playSound).toHaveBeenCalledWith("fail")
    expect(ctx.setIsRunningTests).toHaveBeenCalledWith(false)
  })

  it("dedupes the interviewer nudge against the last two messages", () => {
    vi.mocked(isExecutionServiceError).mockReturnValue(false)
    const ctx = makeCtx()

    applyExecutionApiError({ ok: false, status: 500, data: { error: "boom" } }, ctx)
    const updater = ctx.setInterviewerMessages.mock.calls[0][0] as (prev: any[]) => any[]

    const prevWithRecentError = [
      { type: "ai", message: "There was a problem running your code: x" },
    ]
    expect(updater(prevWithRecentError)).toBe(prevWithRecentError) // unchanged (deduped)

    const fresh = [{ type: "ai", message: "hello" }]
    expect(updater(fresh)).toHaveLength(2) // appends a new nudge
  })
})
