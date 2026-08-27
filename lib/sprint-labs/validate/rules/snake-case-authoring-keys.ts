/**
 * Ruling R14 (defense-in-depth with the compiler's identical rejection):
 * `ai_policy`, `ai_policy_reason`, `concession_triggers` are the three
 * authored keys the spec names in snake_case (every other multiword
 * authoring key is camelCase). scripts/compile-workbooks.mjs's
 * `rejectWrongCasing` independently confirms this exact three-key list and
 * enforces it at compile time; this rule catches the same defect one layer
 * earlier, at `lab validate` time, against the raw parsed frontmatter/YAML
 * (before any compiler has run).
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "snake-case-authoring-keys"

const TICKET_WRONG_TO_RIGHT: ReadonlyArray<readonly [string, string]> = [
  ["aiPolicy", "ai_policy"],
  ["aiPolicyReason", "ai_policy_reason"],
]

const AUTHOR_BRIEF_WRONG_TO_RIGHT: ReadonlyArray<readonly [string, string]> = [
  ["concessionTriggers", "concession_triggers"],
]

export function snakeCaseAuthoringKeys(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      for (const [wrong, right] of TICKET_WRONG_TO_RIGHT) {
        if (Object.prototype.hasOwnProperty.call(ticket.frontmatterRaw, wrong)) {
          findings.push({
            ruleId: RULE_ID,
            severity: "error",
            ticketKey: ticket.key,
            path: "ticket.md",
            message: `ticket ${ticket.key}'s ticket.md uses "${wrong}"; the authored key is "${right}" (snake_case, ruling R14)`,
          })
        }
      }

      if (ticket.authorBriefRaw) {
        for (const [wrong, right] of AUTHOR_BRIEF_WRONG_TO_RIGHT) {
          if (Object.prototype.hasOwnProperty.call(ticket.authorBriefRaw, wrong)) {
            findings.push({
              ruleId: RULE_ID,
              severity: "error",
              ticketKey: ticket.key,
              path: "author_brief.yaml",
              message: `ticket ${ticket.key}'s author_brief.yaml uses "${wrong}"; the authored key is "${right}" (snake_case, ruling R14)`,
            })
          }
        }
      }
    }
  }

  return findings
}
