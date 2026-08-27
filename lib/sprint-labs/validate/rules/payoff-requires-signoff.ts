/**
 * AUTHORING-RULES.md §4 [validate]: "Every `payoffFor`-declaring ticket
 * carries a reviewer sign-off field attesting" that the payoff fires for
 * every correct implementation of its setup, never for one branch and
 * never for learners who ignored a criterion. `lab validate` cannot check
 * the SUBSTANCE of that attestation (that needs a human reviewer reading
 * the setup/reference diffs) — only that a payoffFor ticket has one.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "payoff-requires-signoff"

export function payoffRequiresSignoff(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      if (ticket.payoffFor && ticket.payoffSignoff !== true) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          ticketKey: ticket.key,
          message: `ticket ${ticket.key} declares payoffFor "${ticket.payoffFor}" but has no payoffSignoff: true`,
        })
      }
    }
  }

  return findings
}
