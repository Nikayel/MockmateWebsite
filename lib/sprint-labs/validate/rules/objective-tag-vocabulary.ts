/**
 * AUTHORING-RULES.md §6 [validate]: "every objective tag exists in the
 * vocabulary" (bijection style, per PLAN.md Task 3: unknown tag fails,
 * unused vocabulary entry warns). The vocabulary is workbook.yaml's
 * top-level `objectives[]` (confirmed against scripts/compile-workbooks.mjs's
 * own error message: 'objective id "..." is not in the workbook's
 * objectives vocabulary (workbook.yaml)'). "Used" is computed from
 * ticket-level `objectives[]` only, matching the rule's own wording
 * ("every ticket maps to...").
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "objective-tag-vocabulary"

export function objectiveTagVocabulary(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const vocabulary = new Set(workbook.objectivesVocabulary.map((objective) => objective.id))
  const used = new Set<string>()

  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      for (const tag of ticket.objectives) {
        used.add(tag)
        if (!vocabulary.has(tag)) {
          findings.push({
            ruleId: RULE_ID,
            severity: "error",
            ticketKey: ticket.key,
            message: `ticket ${ticket.key} references objective "${tag}", which is not in workbook.yaml's objectives vocabulary`,
          })
        }
      }
    }
  }

  for (const objective of workbook.objectivesVocabulary) {
    if (!used.has(objective.id)) {
      findings.push({
        ruleId: RULE_ID,
        severity: "warn",
        path: "workbook.yaml",
        message: `objective "${objective.id}" is declared in workbook.yaml but no ticket references it`,
      })
    }
  }

  return findings
}
