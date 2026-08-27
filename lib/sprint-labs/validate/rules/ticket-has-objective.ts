/**
 * AUTHORING-RULES.md §6 [validate]: "Every ticket maps to ≥1 learning
 * objective ... a ticket mapping to none is rejected as a chore."
 * `objective-tag-vocabulary.ts` covers the companion half (every tag a
 * ticket DOES list must be in the controlled vocabulary).
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "ticket-has-objective"

export function ticketHasObjective(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      if (ticket.objectives.length === 0) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          ticketKey: ticket.key,
          message: `ticket ${ticket.key} maps to no learning objective; every ticket must map to at least one`,
        })
      }
    }
  }

  return findings
}
