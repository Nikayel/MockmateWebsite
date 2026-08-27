/**
 * WORKBOOK-SPEC.md §6 / AUTHORING-RULES.md §5: "No `setup.diff` or
 * `MERIDIAN.md` delta contains a hunk from an unsolved `reference.diff`."
 *
 * Review round 1, C-2: the first implementation fingerprinted whole
 * contiguous runs, which a partial copy or an interleaved-context copy
 * both evaded (proven empirically). Fixed by sliding a fixed 3-line window
 * over a flattened sequence (diff-utils.ts's `extractAddedLines`/
 * `extractProseLines`) instead: any 3 consecutive "real" lines that appear
 * in both sequences count as a match, however they're embedded in either
 * source. "Not-yet-shipped" is a reference.diff belonging to a strictly
 * later sprint than the setup.diff being checked. MERIDIAN.md is a single
 * hand-authored file (not sprint-partitioned -- PLAN.md Task 15), so it is
 * checked workbook-wide against every reference.diff, not just later ones.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import {
  extractAddedLines,
  extractProseLines,
  fingerprintBlock,
  slidingWindows,
} from "../diff-utils"

export const RULE_ID = "no-duplicated-hunk-from-unshipped-reference"

const WINDOW_SIZE = 3

export function noDuplicatedHunkFromUnshippedReference(
  workbook: AuthoredWorkbook
): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  const referenceWindowsBySprint = new Map<number, Set<string>>()
  for (const sprint of workbook.sprints) {
    const set = new Set<string>()
    for (const ticket of sprint.tickets) {
      if (!ticket.referenceDiff) continue
      for (const window of slidingWindows(extractAddedLines(ticket.referenceDiff), WINDOW_SIZE)) {
        set.add(fingerprintBlock(window))
      }
    }
    referenceWindowsBySprint.set(sprint.number, set)
  }

  function unshippedFingerprints(afterSprintNumber: number): Set<string> {
    const combined = new Set<string>()
    for (const [sprintNumber, set] of referenceWindowsBySprint) {
      if (sprintNumber > afterSprintNumber) for (const fp of set) combined.add(fp)
    }
    return combined
  }

  for (const sprint of workbook.sprints) {
    const unshipped = unshippedFingerprints(sprint.number)
    if (unshipped.size === 0) continue

    for (const ticket of sprint.tickets) {
      if (!ticket.setupDiff) continue
      const alreadyReported = new Set<string>()
      for (const window of slidingWindows(extractAddedLines(ticket.setupDiff), WINDOW_SIZE)) {
        const fp = fingerprintBlock(window)
        if (unshipped.has(fp) && !alreadyReported.has(fp)) {
          alreadyReported.add(fp)
          findings.push({
            ruleId: RULE_ID,
            severity: "error",
            ticketKey: ticket.key,
            message: `ticket ${ticket.key}'s setup.diff (sprint ${sprint.number}) contains a ${WINDOW_SIZE}-line run that also appears in a not-yet-shipped reference.diff from a later sprint`,
          })
        }
      }
    }
  }

  if (workbook.meridianMd) {
    const allReferenceFingerprints = new Set<string>()
    for (const set of referenceWindowsBySprint.values()) {
      for (const fp of set) allReferenceFingerprints.add(fp)
    }
    const alreadyReported = new Set<string>()
    for (const window of slidingWindows(extractProseLines(workbook.meridianMd), WINDOW_SIZE)) {
      const fp = fingerprintBlock(window)
      if (allReferenceFingerprints.has(fp) && !alreadyReported.has(fp)) {
        alreadyReported.add(fp)
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          path: "MERIDIAN.md",
          message: `MERIDIAN.md contains a ${WINDOW_SIZE}-line run of text that duplicates a hunk from a reference.diff`,
        })
      }
    }
  }

  return findings
}
