/**
 * Runs the dynamic gate against the REAL `workbooks/_fixture-workbook` -- the "live red/green
 * target" PLAN.md Task 7 names explicitly, as opposed to this task's own `fixtures/happy-path`
 * (which exists purely for isolated, full-control unit testing).
 *
 * DEMO-101's and DEMO-102's `setup.diff`/`reference.diff` were hand-authored by Task 2 as opaque
 * TEXT for the content compiler (which never applies a diff, only embeds its bytes) and had never
 * been run through a real `git apply` before this task. Two independent, empirically-confirmed
 * bugs were found and fixed as part of building this gate (full detail in task-7-report.md):
 *  1. Both tickets' `setup.diff` (and DEMO-102's `reference.diff`) were authored as MODIFY diffs
 *     against files that do not exist anywhere (no seed `repo/` in this fixture, confirmed
 *     deliberate by sprint.yaml's own comment) -- `git apply` doesn't error on this, it silently
 *     prints "Skipped patch" and exits 0, so the tree these diffs "applied" onto had never
 *     actually changed. Regenerated all four diffs as real `git diff` output (new-file headers,
 *     correct hunk line counts) from a scratch repo that performs the exact edits by hand.
 *  2. DEMO-101's `reference.diff` hunk header undercounted both its old-side and new-side line
 *     totals (`@@ -1,10 +1,19 @@` where the actual counts are 3 and 20) -- a second, independent
 *     hand-authoring mistake caught by the same regeneration.
 * The workbook was recompiled (`pnpm workbooks:compile workbooks/_fixture-workbook`) after the
 * fix so the generated public/sealed bundles stay byte-consistent with the corrected diffs;
 * `compiler.test.ts`/`sealing.test.ts` both still pass unchanged.
 */
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import { findTicketLocation } from "../materialize"
import { runDynamicGateForTicket } from "../red-green"
import { validateWorkbookDynamic } from "../index"

const FIXTURE_WORKBOOK = join(__dirname, "../../../../../workbooks/_fixture-workbook")

describe("workbooks/_fixture-workbook (real content, not a synthetic fixture)", () => {
  it("DEMO-101 (assisted, probe hidden test): reference.diff goes red->green with zero findings", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-101")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toEqual([])
  }, 20_000)

  it("DEMO-102 (review-only, io-case hidden tests, depends on DEMO-101 same-sprint): visible tier goes red->green; both io-cases are honestly reported as not dynamically executable (D1: no server-side io-case execution exists anywhere yet)", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-102")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    // No red/green or regression ERROR -- the visible tier's own red->green holds.
    expect(findings.filter((f) => f.severity === "error")).toEqual([])
    // Exactly the two io-case gaps, named, not silently swallowed.
    const ioCaseGaps = findings.filter((f) => f.ruleId === "dynamic-hidden-test-not-executable")
    expect(ioCaseGaps).toHaveLength(2)
    expect(ioCaseGaps.every((f) => f.ticketKey === "DEMO-102" && f.severity === "warn")).toBe(true)
  }, 20_000)

  it("validateWorkbookDynamic runs the whole fixture workbook end to end and reports only the two known io-case gaps", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)

    const findings = await validateWorkbookDynamic(workbook)

    expect(findings.every((f) => f.ruleId === "dynamic-hidden-test-not-executable")).toBe(true)
    expect(findings).toHaveLength(2)
  }, 30_000)
})
