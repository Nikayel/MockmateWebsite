/**
 * WORKBOOK-SPEC.md §4 / AUTHORING-RULES.md §6: "The files to touch are
 * never listed — in body, criteria, or hints." Heuristic per PLAN.md Task
 * 3: 3+ DISTINCT `src/` paths in a ticket's body+criteria fails (review
 * round 1, I-3: counting raw mentions let three repeats of the same path
 * trip the rule, which isn't "enumerating files to touch" at all), unless
 * the ticket carries `pathEnumerationSignoff: true` (an escape hatch this
 * task introduces — see tree.ts's field doc — for the rare ticket a
 * reviewer has confirmed the enumeration is pedagogically necessary).
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "no-file-path-enumeration"

const SRC_PATH_RE = /\bsrc\/[^\s'"`),]+/g
const MIN_MATCHES_TO_FAIL = 3

export function noFilePathEnumeration(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      if (ticket.pathEnumerationSignoff) continue

      const haystack = [ticket.bodyMd, ...ticket.acceptanceCriteria].join("\n")
      const matches = haystack.match(SRC_PATH_RE) ?? []
      const distinctPaths = new Set(matches)

      if (distinctPaths.size >= MIN_MATCHES_TO_FAIL) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          ticketKey: ticket.key,
          message: `ticket ${ticket.key}'s body/criteria name ${distinctPaths.size} distinct src/ paths (${[...distinctPaths].join(", ")}); locating the change is part of the exercise -- add pathEnumerationSignoff: true (with reviewer signoff) if this is intentional`,
        })
      }
    }
  }

  return findings
}
