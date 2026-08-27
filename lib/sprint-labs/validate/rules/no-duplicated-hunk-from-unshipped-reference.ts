/**
 * WORKBOOK-SPEC.md §6 / AUTHORING-RULES.md §5: "No `setup.diff` or
 * `MERIDIAN.md` delta contains a hunk from an unsolved `reference.diff`."
 * A "hunk" is approximated as a contiguous block of 3+ added lines
 * (diff-utils.ts's `extractAddedLineBlocks`/`extractProseLineBlocks`,
 * fingerprinted by exact text after trim). "Not-yet-shipped" is a
 * reference.diff belonging to a strictly later sprint than the setup.diff
 * being checked. MERIDIAN.md is a single hand-authored file (not
 * sprint-partitioned -- PLAN.md Task 15), so it is checked workbook-wide
 * against every reference.diff, not just later ones: a live architecture
 * doc should never literally embed a hunk from ANY ticket's secret fix.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import { extractAddedLineBlocks, extractProseLineBlocks, fingerprintBlock } from "../diff-utils"

export const RULE_ID = "no-duplicated-hunk-from-unshipped-reference"

const MIN_BLOCK_LINES = 3

export function noDuplicatedHunkFromUnshippedReference(
  workbook: AuthoredWorkbook
): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  const referenceFingerprintsBySprint = new Map<number, Set<string>>()
  for (const sprint of workbook.sprints) {
    const set = new Set<string>()
    for (const ticket of sprint.tickets) {
      if (!ticket.referenceDiff) continue
      for (const block of extractAddedLineBlocks(ticket.referenceDiff, MIN_BLOCK_LINES)) {
        set.add(fingerprintBlock(block))
      }
    }
    referenceFingerprintsBySprint.set(sprint.number, set)
  }

  function unshippedFingerprints(afterSprintNumber: number): Set<string> {
    const combined = new Set<string>()
    for (const [sprintNumber, set] of referenceFingerprintsBySprint) {
      if (sprintNumber > afterSprintNumber) for (const fp of set) combined.add(fp)
    }
    return combined
  }

  for (const sprint of workbook.sprints) {
    const unshipped = unshippedFingerprints(sprint.number)
    if (unshipped.size === 0) continue

    for (const ticket of sprint.tickets) {
      if (!ticket.setupDiff) continue
      for (const block of extractAddedLineBlocks(ticket.setupDiff, MIN_BLOCK_LINES)) {
        if (unshipped.has(fingerprintBlock(block))) {
          findings.push({
            ruleId: RULE_ID,
            severity: "error",
            ticketKey: ticket.key,
            message: `ticket ${ticket.key}'s setup.diff (sprint ${sprint.number}) contains a hunk that also appears in a not-yet-shipped reference.diff from a later sprint`,
          })
        }
      }
    }
  }

  if (workbook.meridianMd) {
    const allReferenceFingerprints = new Set<string>()
    for (const set of referenceFingerprintsBySprint.values()) {
      for (const fp of set) allReferenceFingerprints.add(fp)
    }
    for (const block of extractProseLineBlocks(workbook.meridianMd, MIN_BLOCK_LINES)) {
      if (allReferenceFingerprints.has(fingerprintBlock(block))) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          path: "MERIDIAN.md",
          message:
            "MERIDIAN.md contains a block of text that duplicates a hunk from a reference.diff",
        })
      }
    }
  }

  return findings
}
