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
 *
 * Review round 1 update: DEMO-102 is `ai_policy: unassisted` (a score-feeding policy, per
 * WORKBOOK-SPEC.md §5 -- corrects this file's own earlier "review-only" mischaracterization). Its
 * two io-case hidden tests author no `entryPoint`, so under Critical 2's new severity split they
 * are now `dynamic-hidden-test-not-executable` ERRORs, not WARNs: an unverifiable hidden tier on a
 * score-feeding ticket is a real content gap, correctly surfaced rather than silently passed. This
 * is a genuinely correct, intended behavior change from before this review round, not a
 * regression -- content authoring (Task 2/15, or a follow-up) needs to either author an
 * `entryPoint` matching a real callable, or convert these to `probe`-kind hidden tests.
 */
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import { validateWorkbookDynamic } from "../index"
import { findTicketLocation } from "../materialize"
import { runDynamicGateForTicket } from "../red-green"

const FIXTURE_WORKBOOK = join(__dirname, "../../../../../workbooks/_fixture-workbook")

describe("workbooks/_fixture-workbook (real content, not a synthetic fixture)", () => {
  it("DEMO-101 (assisted, probe hidden test): reference.diff goes red->green with zero findings", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-101")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toEqual([])
  }, 20_000)

  it("DEMO-102 (unassisted, io-case hidden tests with no entryPoint authored, depends on DEMO-101 same-sprint): visible tier still goes red->green, but the unverifiable hidden tier is correctly an ERROR on a score-feeding ticket", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-102")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    // No red/green or regression ERROR from the VISIBLE tier itself -- that half still holds.
    expect(findings.some((f) => f.ruleId === "dynamic-red-green")).toBe(false)
    expect(findings.some((f) => f.ruleId === "dynamic-regression")).toBe(false)
    // Exactly the two io-case gaps, named, ERROR (unassisted is score-feeding).
    const ioCaseGaps = findings.filter((f) => f.ruleId === "dynamic-hidden-test-not-executable")
    expect(ioCaseGaps).toHaveLength(2)
    expect(ioCaseGaps.every((f) => f.ticketKey === "DEMO-102" && f.severity === "error")).toBe(true)
    expect(findings).toHaveLength(2)
  }, 20_000)

  it("validateWorkbookDynamic runs the whole fixture workbook end to end and reports only the two known (now ERROR) io-case gaps", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)

    const findings = await validateWorkbookDynamic(workbook)

    expect(findings.every((f) => f.ruleId === "dynamic-hidden-test-not-executable")).toBe(true)
    expect(findings.every((f) => f.severity === "error")).toBe(true)
    expect(findings).toHaveLength(2)
  }, 30_000)
})
