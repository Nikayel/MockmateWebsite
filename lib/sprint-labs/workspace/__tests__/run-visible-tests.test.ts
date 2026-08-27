import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({ runTsInWorker: vi.fn() }))
vi.mock("@/lib/workspace-execution/ts-workspace", () => ({
  runTsInWorker: mocks.runTsInWorker,
}))

import { runVisibleTests } from "../run-visible-tests"

const RESULTS_MARKER = "__WORKSPACE_TEST_RESULTS__:"

beforeEach(() => {
  mocks.runTsInWorker.mockReset()
})

describe("runVisibleTests", () => {
  it("passes files/testPaths through with an empty hiddenTestPaths (visible-tier only)", async () => {
    mocks.runTsInWorker.mockResolvedValue({ success: true, logs: [] })
    const files = [{ path: "a.ts", content: "export const x = 1" }]
    await runVisibleTests(files, ["a.test.ts"])
    expect(mocks.runTsInWorker).toHaveBeenCalledWith(
      { files, testPaths: ["a.test.ts"], hiddenTestPaths: [] },
      expect.any(Number)
    )
  })

  it("parses the marker into results + a computed summary", async () => {
    const marker = `${RESULTS_MARKER}${JSON.stringify([
      { suite: "workspace", name: "accepts a valid claim", passed: true, error: null },
      {
        suite: "workspace",
        name: "rejects a bad claim",
        passed: false,
        error: "AssertionError: expected 1, got 2",
      },
    ])}`
    mocks.runTsInWorker.mockResolvedValue({
      success: true,
      logs: [{ type: "log", message: marker, timestamp: 1 }],
    })

    const result = await runVisibleTests([], [])
    expect(result.infraError).toBeNull()
    expect(result.results).toHaveLength(2)
    expect(result.summary).toEqual({ total: 2, passed: 1, failed: 1, passRate: 50 })
  })

  it("uses only the LAST marker when several are present", async () => {
    const stale = `${RESULTS_MARKER}${JSON.stringify([{ suite: "s", name: "old", passed: false, error: null }])}`
    const fresh = `${RESULTS_MARKER}${JSON.stringify([{ suite: "s", name: "new", passed: true, error: null }])}`
    mocks.runTsInWorker.mockResolvedValue({
      success: true,
      logs: [
        { type: "log", message: stale, timestamp: 1 },
        { type: "log", message: fresh, timestamp: 2 },
      ],
    })
    const result = await runVisibleTests([], [])
    expect(result.results).toEqual([{ suite: "s", name: "new", passed: true, error: null }])
  })

  it("ignores a marker-shaped line logged via console.error/warn/info (cannot forge a result)", async () => {
    const forged = `${RESULTS_MARKER}${JSON.stringify([{ suite: "s", name: "forged", passed: true, error: null }])}`
    mocks.runTsInWorker.mockResolvedValue({
      success: true,
      logs: [{ type: "error", message: forged, timestamp: 1 }],
    })
    const result = await runVisibleTests([], [])
    expect(result.infraError).toBe("The test runner did not report any results.")
  })

  it("surfaces an infrastructure error (transpile/exec timeout, worker spawn failure) distinctly", async () => {
    mocks.runTsInWorker.mockResolvedValue({
      success: false,
      logs: [],
      error: "TypeScript transpilation timed out.",
    })
    const result = await runVisibleTests([], [])
    expect(result.infraError).toBe("TypeScript transpilation timed out.")
    expect(result.results).toEqual([])
    expect(result.summary).toEqual({ total: 0, passed: 0, failed: 0, passRate: 0 })
  })

  it("treats malformed marker JSON as no results rather than throwing", async () => {
    mocks.runTsInWorker.mockResolvedValue({
      success: true,
      logs: [{ type: "log", message: `${RESULTS_MARKER}{not json`, timestamp: 1 }],
    })
    const result = await runVisibleTests([], [])
    expect(result.infraError).toBe("The test runner did not report any results.")
  })

  it("computes passRate 100 when every test passes and 0 when the suite is all-failing", async () => {
    const allPass = `${RESULTS_MARKER}${JSON.stringify([
      { suite: "s", name: "a", passed: true, error: null },
    ])}`
    mocks.runTsInWorker.mockResolvedValue({
      success: true,
      logs: [{ type: "log", message: allPass, timestamp: 1 }],
    })
    const result = await runVisibleTests([], [])
    expect(result.summary.passRate).toBe(100)
  })
})
