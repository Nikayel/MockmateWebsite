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
 *
 * Review round 2 update: DEMO-102's two io-case hidden tests now carry a real `entryPoint`
 * (`compatibilityDescriptor`, the same function the ticket's own visible test already exercises)
 * with `input`/`expected` retargeted to match it -- there is no HTTP layer anywhere in this
 * fixture to produce a status code or header, so the original `{path, status, ...}` shape (Task
 * 2's illustrative authoring, never actually run before this task existed) could never have been
 * executed by ANY mechanism. `compatibilityDescriptor`'s v1/v2 branches were also DELIBERATELY
 * swapped in `setup.diff` (previously the file did not exist at all until `reference.diff`,
 * which made the hidden tier fail via "module not found" rather than via a genuine wrong-answer
 * check) -- both io-cases now discriminate on their own terms: traced by hand and confirmed by
 * the tests below that the buggy (swapped) branch returns the WRONG shape for both v1 and v2
 * inputs, and the reference (un-swapped) branch returns the right one for both. The workbook was
 * recompiled after every content change so the generated public/sealed bundles stay
 * byte-consistent; `compiler.test.ts`/`sealing.test.ts` both still pass unchanged.
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

  it("DEMO-102 (unassisted, two io-cases with a real entryPoint, depends on DEMO-101 same-sprint): both visible AND hidden tiers genuinely go red->green, zero findings", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-102")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toEqual([])
  }, 20_000)

  it("validateWorkbookDynamic runs the whole fixture workbook end to end with zero findings -- fully green, the exemplar this task's own verification bar requires", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)

    const findings = await validateWorkbookDynamic(workbook)

    expect(findings).toEqual([])
  }, 30_000)
})
