/**
 * AUTHORING-RULES.md §6 / PLAN.md Global Constraints: "No em dashes in
 * learner-facing prose" (site-wide content rule). Checked on: ticket
 * bodies, ticket title, ticket acceptanceCriteria, sprint goal, sprint
 * standupQuote, hidden-test humanName, and workbook.yaml's objective
 * label/canDo text (the vocabulary's own learner-facing sentences).
 *
 * `ticket.title` and `sprint.goal` (ruling R18, review round 1 I-1): both
 * render to the learner (board card / standup) exactly like the fields
 * already checked, so the same rule applies to them. R18 also settles the
 * ordering question: this site-wide rule outranks spec punctuation, so an
 * em-dashed title quoted verbatim from SPRINT-PLAN.md gets re-punctuated at
 * authoring rather than preserved.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "no-em-dash-in-prose"

const EM_DASH = "—"

function checkField(
  findings: ValidationFinding[],
  ticketKey: string | undefined,
  path: string | undefined,
  label: string,
  value: string | undefined
): void {
  if (typeof value === "string" && value.includes(EM_DASH)) {
    findings.push({
      ruleId: RULE_ID,
      severity: "error",
      ticketKey,
      path,
      message: `${label} contains an em dash (U+2014); learner-facing prose may not use one`,
    })
  }
}

export function noEmDashInProse(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const objective of workbook.objectivesVocabulary) {
    checkField(
      findings,
      undefined,
      "workbook.yaml",
      `objective "${objective.id}" label`,
      objective.label
    )
    checkField(
      findings,
      undefined,
      "workbook.yaml",
      `objective "${objective.id}" canDo`,
      objective.canDo
    )
  }

  for (const sprint of workbook.sprints) {
    checkField(
      findings,
      undefined,
      sprint.dirPath,
      `sprint ${sprint.number} standupQuote`,
      sprint.standupQuote
    )
    checkField(findings, undefined, sprint.dirPath, `sprint ${sprint.number} goal`, sprint.goal)

    for (const ticket of sprint.tickets) {
      checkField(findings, ticket.key, ticket.dirPath, `ticket ${ticket.key} title`, ticket.title)
      checkField(findings, ticket.key, ticket.dirPath, `ticket ${ticket.key} body`, ticket.bodyMd)

      ticket.acceptanceCriteria.forEach((criterion, index) => {
        checkField(
          findings,
          ticket.key,
          ticket.dirPath,
          `ticket ${ticket.key} acceptanceCriteria[${index}]`,
          criterion
        )
      })

      for (const hidden of ticket.hiddenTests) {
        checkField(
          findings,
          ticket.key,
          hidden.path,
          `hidden test "${hidden.fileName}" humanName`,
          hidden.humanName
        )
      }
    }
  }

  return findings
}
