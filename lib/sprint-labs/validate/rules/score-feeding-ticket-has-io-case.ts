/**
 * AUTHORING-RULES.md §5: "Score-feeding tickets (all `unassisted` and
 * `review-only`) must author their hidden tier as IO-cases: deterministic
 * inputs issued at submit, expected outputs held server-side, comparison
 * server-side ... Property probes (client-executed assertions) are allowed
 * on `assisted` tickets as formative feedback only."
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
      const hasIoCase = ticket.hiddenTests.some((hidden) => hidden.kind === "io-case")
      if (!hasIoCase) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          ticketKey: ticket.key,
          message: `score-feeding ticket ${ticket.key} (ai_policy: ${ticket.aiPolicy}) has no io-case hidden test`,
        })
      }
    }
  }

  return findings
}
