/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ runVisibleTests: vi.fn() }))
vi.mock("@/lib/sprint-labs/workspace/run-visible-tests", () => ({
  runVisibleTests: mocks.runVisibleTests,
}))

import { useWorkspaceVisibleTests } from "../useWorkspaceVisibleTests"

beforeEach(() => {
  mocks.runVisibleTests.mockReset()
})

describe("useWorkspaceVisibleTests", () => {
  it("starts never-run with zero failing count, even before any files exist", () => {
    const { result } = renderHook(() => useWorkspaceVisibleTests({}, [], []))
    expect(result.current.status).toBe("never-run")
    expect(result.current.failingCount).toBe(0)
    expect(result.current.redVisibleTests).toEqual([])
  })

  it("after a run: derives failingCount and redVisibleTests from the REAL results, and goes fresh", async () => {
    mocks.runVisibleTests.mockResolvedValue({
      results: [
        { suite: "workspace", name: "accepts a valid claim", passed: true, error: null },
        {
          suite: "workspace",
          name: "rejects a bad claim",
          passed: false,
          error: "AssertionError: expected 1, got 2",
        },
      ],
      summary: { total: 2, passed: 1, failed: 1, passRate: 50 },
      infraError: null,
    })

    const { result } = renderHook(() =>
      useWorkspaceVisibleTests(
        { "a.ts": "x" },
        [{ path: "a.test.ts", content: "t" }],
        ["a.test.ts"]
      )
    )

    await act(async () => {
      await result.current.run()
    })

    expect(result.current.status).toBe("fresh")
    expect(result.current.failingCount).toBe(1)
    expect(result.current.redVisibleTests).toEqual([
      {
        name: "workspace: rejects a bad claim",
        failingAssertion: "AssertionError: expected 1, got 2",
      },
    ])
    expect(result.current.summary).toEqual({ total: 2, passed: 1, failed: 1, passRate: 50 })
  })

  it("passes the fixed (locked) files plus the editable overlay to the runner together", async () => {
    mocks.runVisibleTests.mockResolvedValue({ results: [], summary: null, infraError: null })
    const fixed = [{ path: "a.test.ts", content: "test body" }]
    const { result } = renderHook(() =>
      useWorkspaceVisibleTests({ "src/a.ts": "code" }, fixed, ["a.test.ts"])
    )
    await act(async () => {
      await result.current.run()
    })
    expect(mocks.runVisibleTests).toHaveBeenCalledWith(
      [
        { path: "a.test.ts", content: "test body" },
        { path: "src/a.ts", content: "code" },
      ],
      ["a.test.ts"]
    )
  })

  it("goes stale when the editable files change after a run, without a new run", async () => {
    mocks.runVisibleTests.mockResolvedValue({
      results: [{ suite: "s", name: "n", passed: true, error: null }],
      summary: { total: 1, passed: 1, failed: 0, passRate: 100 },
      infraError: null,
    })

    const { result, rerender } = renderHook(
      ({ files }) => useWorkspaceVisibleTests(files, [], []),
      { initialProps: { files: { "a.ts": "v1" } } }
    )

    await act(async () => {
      await result.current.run()
    })
    expect(result.current.status).toBe("fresh")

    rerender({ files: { "a.ts": "v2" } })
    expect(result.current.status).toBe("stale")
    // Stale keeps the LAST KNOWN numbers rather than clearing them (UX-SPEC.md §7).
    expect(result.current.failingCount).toBe(0)
    expect(result.current.summary).toEqual({ total: 1, passed: 1, failed: 0, passRate: 100 })
  })

  it("does not go stale when re-rendered with unchanged file content", async () => {
    mocks.runVisibleTests.mockResolvedValue({ results: [], summary: null, infraError: null })
    const files = { "a.ts": "v1" }
    const { result, rerender } = renderHook(({ f }) => useWorkspaceVisibleTests(f, [], []), {
      initialProps: { f: files },
    })
    await act(async () => {
      await result.current.run()
    })
    rerender({ f: { "a.ts": "v1" } }) // same content, different object identity
    expect(result.current.status).toBe("fresh")
  })

  it("surfaces infraError distinctly and still marks the run as having happened", async () => {
    mocks.runVisibleTests.mockResolvedValue({
      results: [],
      summary: { total: 0, passed: 0, failed: 0, passRate: 0 },
      infraError: "TypeScript transpilation timed out.",
    })
    const { result } = renderHook(() => useWorkspaceVisibleTests({}, [], []))
    await act(async () => {
      await result.current.run()
    })
    expect(result.current.infraError).toBe("TypeScript transpilation timed out.")
    expect(result.current.status).toBe("fresh")
  })
})
