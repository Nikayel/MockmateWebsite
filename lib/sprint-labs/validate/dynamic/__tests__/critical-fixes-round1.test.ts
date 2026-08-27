/**
 * Regression locks for PLAN.md Task 7 review round 1's two Criticals.
 *
 * Critical 1: the red check is now PER TIER, not a combined "not everything passes" union. A
 * hidden probe that passes even against the buggy setup state (an escape test that does not catch
 * its own escape) must fail the gate even though the visible tier DOES fail in red -- the exact
 * hole the union check had.
 *
 * Critical 2: an io-case hidden test with an authored `entryPoint` is now dynamically executed
 * (imports the named export from the materialized workspace, calls it with `input`, compares to
 * `expected` via `assert.deepStrictEqual`) and folded into the SAME per-tier red/green logic as a
 * probe -- proven both discriminating (goes red->green) and non-discriminating (fails the gate,
 * same as Critical 1's probe case).
 */
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import { findTicketLocation } from "../materialize"
import { runDynamicGateForTicket } from "../red-green"

const FIXTURES = join(__dirname, "fixtures")

describe("Critical 1: per-tier red assertion", () => {
  it("a non-discriminating hidden probe (passes even in the red state) fails the gate, even though the visible tier DOES fail in red", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "non-discriminating-hidden"))
    const { ticket } = findTicketLocation(workbook, "NONDISC-101")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      ruleId: "dynamic-red-green",
      severity: "error",
      ticketKey: "NONDISC-101",
    })
    expect(findings[0].message).toContain("hidden tier did not fail in the red state")
    expect(findings[0].message).toContain("does not catch its escape")
  }, 20_000)
})

describe("Critical 2: io-case entryPoint execution", () => {
  it("an io-case WITH entryPoint that genuinely discriminates goes red->green with zero findings", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "io-case-entrypoint-green"))
    const { ticket } = findTicketLocation(workbook, "ENTRY-101")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toEqual([])
  }, 20_000)

  it("an io-case WITH entryPoint whose output matches expected even in the red state (non-discriminating) fails the gate the same way a non-discriminating probe does", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "io-case-entrypoint-non-discriminating"))
    const { ticket } = findTicketLocation(workbook, "ENTRY-201")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      ruleId: "dynamic-red-green",
      severity: "error",
      ticketKey: "ENTRY-201",
    })
    expect(findings[0].message).toContain("hidden tier did not fail in the red state")
  }, 20_000)
})
