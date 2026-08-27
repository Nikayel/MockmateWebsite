/**
 * AUTHORING-RULES.md §6: "`ai_policy_reason` is required on every
 * `unassisted` ticket." lib/sprint-labs/types.ts's own file header names
 * this exact check as deliberately deferred to `lab validate` rather than
 * enforced at the zod-schema layer (the raw authored value hasn't been
 * proven to even parse as a TicketPublic yet), so this is not a duplicate
 * of an existing check — it is that check's home.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "ai-policy-reason-required"

export function aiPolicyReasonRequired(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      if (ticket.aiPolicy === "unassisted" && !ticket.aiPolicyReason?.trim()) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          ticketKey: ticket.key,
          message: `ticket ${ticket.key} is ai_policy: unassisted but has no ai_policy_reason`,
        })
      }
    }
  }

  return findings
}
