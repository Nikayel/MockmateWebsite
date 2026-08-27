/**
 * PLAN.md Task 7 review round 1, Important 1: a harness that could not run at all must never be
 * read as a "vacuous pass". `harnessFailedToRun` is tested directly (the exact boolean the review
 * specified); `vi.mock`s `ts-replay.ts` to prove `runDynamicGateForTicket` itself turns a harness
 * failure into a `dynamic-red-green` ERROR rather than silently treating an empty `results` array
 * as "nothing failed, so everything passed" -- the real bug `splitVerdict`'s old vacuous-true
 * defaults would have produced without this check.
 */
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import type { WorkspaceExecutionResult } from "@/lib/workspace-execution/types"

import { harnessFailedToRun } from "../red-green"

function emptySummary(): WorkspaceExecutionResult["summary"] {
  return { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 }
}

describe("harnessFailedToRun", () => {
  it("is true when result.error is set (the top-level catch path)", () => {
    const result: WorkspaceExecutionResult = {
      success: false,
      results: [],
      consoleLogs: [],
      summary: emptySummary(),
      error: "boom",
    }
    expect(harnessFailedToRun(result)).toBe(true)
  })

  it("is true when success is false AND results is empty, even with error: null (the vacuous-pass shape this check exists for)", () => {
    const result: WorkspaceExecutionResult = {
      success: false,
      results: [],
      consoleLogs: [],
      summary: emptySummary(),
      error: null,
    }
    expect(harnessFailedToRun(result)).toBe(true)
  })

  it("is false for a genuine failing-tests run (results present, success false)", () => {
    const result: WorkspaceExecutionResult = {
      success: false,
      results: [{ suite: "s", name: "n", passed: false, error: "assertion failed" }],
      consoleLogs: [],
      summary: emptySummary(),
      error: null,
    }
    expect(harnessFailedToRun(result)).toBe(false)
  })

  it("is false for a genuine passing run", () => {
    const result: WorkspaceExecutionResult = {
      success: true,
      results: [{ suite: "s", name: "n", passed: true, error: null }],
      consoleLogs: [],
      summary: emptySummary(),
      error: null,
    }
    expect(harnessFailedToRun(result)).toBe(false)
  })
})

describe("runDynamicGateForTicket fails closed on a harness that could not run at all (integration, mocked harness)", () => {
  it("a mocked runTicketFullSuite returning the vacuous-pass shape produces a dynamic-red-green ERROR, never zero findings", async () => {
    vi.resetModules()
    vi.doMock("../ts-replay", () => ({
      runTicketFullSuite: vi.fn(async () => ({
        result: {
          success: false,
          results: [],
          consoleLogs: [],
          summary: emptySummary(),
          error: null,
        },
        hiddenFindings: [],
      })),
      runTicketVisibleSuite: vi.fn(),
    }))

    const { loadWorkbookTree } = await import("../../load-tree")
    const { findTicketLocation } = await import("../materialize")
    const { runDynamicGateForTicket: mockedRun } = await import("../red-green")

    const FIXTURES = join(__dirname, "fixtures")
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const { ticket } = findTicketLocation(workbook, "FIX-101")

    const findings = await mockedRun(workbook, ticket)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ ruleId: "dynamic-red-green", severity: "error" })
    expect(findings[0].message).toContain("could not run at all")

    vi.doUnmock("../ts-replay")
    vi.resetModules()
  }, 20_000)
})
