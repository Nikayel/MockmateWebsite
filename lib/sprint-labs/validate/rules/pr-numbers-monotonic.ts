/**
 * AUTHORING-RULES.md §1: "Agent PR numbers are monotonic ... Fix every
 * ticket body that says otherwise." PR numbers are narrated in a
 * review-only ticket's own title/body prose (SPRINT-PLAN.md's ticket
 * table rows read like "Review: agent PR #412 ..."), not a structured
 * frontmatter field, so this rule extracts `#<digits>` from title+body and
 * checks the workbook-wide sequence (ordered by sprint, then ticket key)
 * increases strictly. Deliberately does not hardcode Meridian's specific
 * allocation table (#412, #418, ...) -- that is content Task 16 is
 * responsible for authoring correctly; this rule checks the general
 * invariant so it stays useful for any workbook, not just Meridian.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "pr-numbers-monotonic"

const PR_NUMBER_RE = /#(\d{2,})/

interface PrEntry {
  sprintNumber: number
  ticketKey: string
  prNumber: number
}

export function prNumbersMonotonic(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const entries: PrEntry[] = []

  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      if (ticket.aiPolicy !== "review-only") continue
      const haystack = `${ticket.title ?? ""}\n${ticket.bodyMd}`
      const match = PR_NUMBER_RE.exec(haystack)
      if (match) {
        entries.push({
          sprintNumber: sprint.number,
          ticketKey: ticket.key,
          prNumber: Number.parseInt(match[1], 10),
        })
      }
    }
  }

  entries.sort((a, b) => a.sprintNumber - b.sprintNumber || a.ticketKey.localeCompare(b.ticketKey))

  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]
    const curr = entries[i]
    if (curr.prNumber <= prev.prNumber) {
      findings.push({
        ruleId: RULE_ID,
        severity: "error",
        ticketKey: curr.ticketKey,
        message: `PR #${curr.prNumber} on ${curr.ticketKey} (sprint ${curr.sprintNumber}) is not greater than PR #${prev.prNumber} on ${prev.ticketKey} (sprint ${prev.sprintNumber}); PR numbers must increase monotonically`,
      })
    }
  }

  return findings
}
