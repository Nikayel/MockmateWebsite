/**
 * AUTHORING-RULES.md §1 [validate]: "Every path in `filesTouched` exists in
 * the seed or in an earlier sprint's created set." The valid set for sprint
 * N includes sprint N's OWN newSourceFiles too, not just strictly-earlier
 * sprints: `new-source-files-set-difference.ts` (the companion rule)
 * guarantees a same-sprint touched+new path lands in that sprint's own
 * newSourceFiles, so treating it as invalid HERE would make the two rules
 * contradict each other for the ordinary "created and used in the same
 * sprint" case.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import { computeCumulativeFileSets } from "../sprint-file-sets"

export const RULE_ID = "files-touched-exist"

export function filesTouchedExist(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const { validAsOf } = computeCumulativeFileSets(workbook)

  for (const sprint of workbook.sprints) {
    const valid = validAsOf.get(sprint.number) ?? new Set<string>()
    for (const path of sprint.filesTouched) {
      if (!valid.has(path)) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          path,
          message: `sprint ${sprint.number} (${sprint.dirName}) lists "${path}" in filesTouched, but it is not in the seed, this sprint's newSourceFiles, or any earlier sprint's newSourceFiles`,
        })
      }
    }
  }

  return findings
}
