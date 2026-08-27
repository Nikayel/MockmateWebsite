/**
 * AUTHORING-RULES.md §1: "Agent PR numbers are monotonic ... Fix every
 * ticket body that says otherwise." PR numbers are narrated in a ticket's
 * own title/body prose (SPRINT-PLAN.md's ticket table rows read like
 * "Review: agent PR #412 ..."), not a structured frontmatter field.
 *
 * Review round 1, M-2: scan every ticket, not just `review-only` ones (a
 * PR can be mentioned in passing on any ticket type), using a GLOBAL match
 * so a ticket that mentions more than one PR number isn't reduced to just
 * the first. Deliberately does not hardcode Meridian's specific allocation
 * table (#412, #418, ...) -- that is content Task 16's job; this rule
 * checks the general invariant so it stays useful for any workbook.
 *
 * Review round 2, item 2: a ticket's body can legitimately cite an OLDER
 * PR for context ("follows up on #500; #480 didn't fix it") -- reproduced
 * empirically as a false self-regression when every mention became its own
 * entry. Fixed by never comparing two numbers mentioned by the SAME
 * ticket: each ticket contributes exactly one entry, its MAXIMUM mentioned
 * PR number, and monotonicity is enforced only across DIFFERENT tickets.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "pr-numbers-monotonic"

const PR_NUMBER_RE = /#(\d{2,})/g

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
      const haystack = `${ticket.title ?? ""}\n${ticket.bodyMd}`
      let maxPrNumber: number | null = null
      for (const match of haystack.matchAll(PR_NUMBER_RE)) {
        const prNumber = Number.parseInt(match[1], 10)
        if (maxPrNumber === null || prNumber > maxPrNumber) maxPrNumber = prNumber
      }
      if (maxPrNumber !== null) {
        entries.push({ sprintNumber: sprint.number, ticketKey: ticket.key, prNumber: maxPrNumber })
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
