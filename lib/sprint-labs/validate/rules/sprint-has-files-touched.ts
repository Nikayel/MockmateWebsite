/**
 * Review round 1, C-1 (amended by ruling R17): the surviving defect after
 * R14/R17's casing rules was silence -- an absent or wrong-cased file-set
 * field yields an empty array via `toStringArray(undefined)`, and an empty
 * `filesTouched` makes `files-touched-exist`/`new-source-files-set-difference`
 * vacuously pass (nothing to check). A sprint that ships tickets ships code
 * changes, so an empty `filesTouched` on such a sprint is itself the
 * defect, independent of why the field came up empty (missing key, wrong
 * casing, or a genuine authoring omission) -- `snake-case-authoring-keys`
 * catches the wrong-casing case directly; this rule is the backstop for
 * "the field is simply empty," which no casing check can name.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "sprint-has-files-touched"

export function sprintHasFilesTouched(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    if (sprint.tickets.length > 0 && sprint.filesTouched.length === 0) {
      findings.push({
        ruleId: RULE_ID,
        severity: "error",
        path: sprint.dirPath,
        message: `sprint ${sprint.number} (${sprint.dirName}) declares ${sprint.tickets.length} ticket(s) but no filesTouched`,
      })
    }
  }

  return findings
}
