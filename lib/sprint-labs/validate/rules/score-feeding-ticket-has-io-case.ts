/**
 * AUTHORING-RULES.md §5: "Score-feeding tickets (all `unassisted` and
 * `review-only`) must author their hidden tier as IO-cases: deterministic
 * inputs issued at submit, expected outputs held server-side, comparison
 * server-side ... Property probes (client-executed assertions) are allowed
 * on `assisted` tickets as formative feedback only."
 *
 * Ruling R23: the real intent is "when a score-feeding ticket HAS authored
 * its hidden tier, at least one must be an io-case" -- not "every
 * score-feeding stub must already be gradeable." A ticket with NO
 * `tests/hidden/` directory at all (a Task 16 stub; its hidden tier lands
 * in Tasks 17-20, and sprints 5-10 stay stubs this pass) is exempt, not a
 * finding. A ticket WITH a hidden tier that is all-probe still fails --
 * that is the real defect this rule guards against.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "score-feeding-ticket-has-io-case"

const SCORE_FEEDING_POLICIES = new Set(["unassisted", "review-only"])

export function scoreFeedingTicketHasIoCase(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      if (!ticket.aiPolicy || !SCORE_FEEDING_POLICIES.has(ticket.aiPolicy)) continue
      // No authored hidden tier at all = a stub awaiting Tasks 17-20; exempt.
      if (ticket.hiddenTests.length === 0) continue
      const hasIoCase = ticket.hiddenTests.some((hidden) => hidden.kind === "io-case")
      if (!hasIoCase) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          ticketKey: ticket.key,
          message: `score-feeding ticket ${ticket.key} (ai_policy: ${ticket.aiPolicy}) has an authored hidden tier with no io-case hidden test`,
        })
      }
    }
  }

  return findings
}
