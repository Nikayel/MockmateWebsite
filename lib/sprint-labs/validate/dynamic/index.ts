/**
 * `lab validate --dynamic` -- composition root for the dynamic gates (PLAN.md Task 7): the
 * red/green history gate, regression replay, and the provisioning scans, layered on top of Task
 * 3's static gates. `validateWorkbookDynamic` takes an already-loaded `AuthoredWorkbook` (the same
 * `loadWorkbookTree` output the static gates consume) and returns `ValidationFinding[]` in the
 * exact shape `scripts/lab-validate.mjs`'s reporter already knows how to print -- this task adds a
 * layer, it does not touch `lib/sprint-labs/validate/index.ts` or any `rules/*`.
 *
 * A ticket with no authored `reference.diff` at all is a Task 16 STUB, not a failure: every
 * Meridian ticket outside sprints 1-4 is a stub today, and sprints 1-4 themselves are stubs until
 * Tasks 17-20 land content (see PLAN.md Task 7's own verification note making this the expected
 * state). Such a ticket contributes ZERO findings -- "nothing to dynamically check yet" is not the
 * same claim as "checked and clean". A ticket with a `reference.diff` but zero visible tests is a
 * real, worth-flagging gap (a reference with nothing proving it went red->green), reported as a
 * single WARN rather than silently skipped or run through a suite with nothing in it.
 */
import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import { allTicketsInOrder } from "./materialize"
import { runDynamicGateForTicket } from "./red-green"
import { scanProvisioning } from "./provisioning"

function hasAnyVisibleTest(ticketDirPath: string): boolean {
  const visibleDir = join(ticketDirPath, "tests", "visible")
  if (!existsSync(visibleDir)) return false
  const walk = (dir: string): boolean => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory() && walk(full)) return true
      if (entry.isFile() && /\.tsx?$/.test(entry.name)) return true
    }
    return false
  }
  return walk(visibleDir)
}

/** Runs the dynamic gate (red/green + regression + provisioning scans) for every non-stub ticket
 *  in `workbook`, in the workbook's own sprint-then-key order. */
export async function validateWorkbookDynamic(
  workbook: AuthoredWorkbook
): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = []

  for (const { ticket } of allTicketsInOrder(workbook)) {
    if (!ticket.referenceDiff) continue // stub: nothing authored yet, nothing to check

    if (!hasAnyVisibleTest(ticket.dirPath)) {
      findings.push({
        ruleId: "dynamic-no-visible-tests",
        severity: "warn",
        ticketKey: ticket.key,
        message:
          "ticket authors a reference.diff but no tests/visible/*.test.ts; red->green cannot be verified.",
      })
    }

    findings.push(...(await runDynamicGateForTicket(workbook, ticket)))

    const provisioning = scanProvisioning(workbook, ticket.key)
    findings.push(...provisioning.contentFindings, ...provisioning.gitObjectFindings)
  }

  return findings
}
