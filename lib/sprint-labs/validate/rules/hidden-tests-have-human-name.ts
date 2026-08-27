/**
 * AUTHORING-RULES.md §5: "Every hidden test carries a curated `humanName` —
 * the only string the learner ever sees from the grading tier."
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "hidden-tests-have-human-name"

export function hiddenTestsHaveHumanName(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      for (const hidden of ticket.hiddenTests) {
        if (!hidden.humanName || !hidden.humanName.trim()) {
          findings.push({
            ruleId: RULE_ID,
            severity: "error",
            ticketKey: ticket.key,
            path: hidden.path,
            message: `hidden test "${hidden.fileName}" on ${ticket.key} has no humanName`,
          })
        }
      }
    }
  }

  return findings
}
