/**
 * AUTHORING-RULES.md §1 [validate] + SPRINT-PLAN.md §5 ("`newSourceFiles` is
 * unreliable in both directions"): `newSourceFiles` must equal the
 * mechanically computed set difference (sprint's filesTouched) − (seed ∪
 * every earlier sprint's newSourceFiles) — catching both directions SPRINT-PLAN.md
 * names (files listed as new that are already in the seed/prior; files
 * created but never listed). `rewrittenFiles` must be a subset of
 * seed ∪ prior (PLAN.md Task 3: "rewrittenFiles ⊆ seed ∪ prior").
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import { computeCumulativeFileSets } from "../sprint-file-sets"

export const RULE_ID = "new-source-files-set-difference"

export function newSourceFilesSetDifference(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const { validBefore } = computeCumulativeFileSets(workbook)

  for (const sprint of workbook.sprints) {
    const priorValid = validBefore.get(sprint.number) ?? new Set<string>()
    const computedNew = new Set(sprint.filesTouched.filter((path) => !priorValid.has(path)))
    const authoredNew = new Set(sprint.newSourceFiles)

    for (const path of computedNew) {
      if (!authoredNew.has(path)) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          path,
          message: `sprint ${sprint.number} (${sprint.dirName}): "${path}" is touched and new (not in the seed or any earlier sprint) but missing from newSourceFiles`,
        })
      }
    }

    for (const path of authoredNew) {
      if (!computedNew.has(path)) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          path,
          message: `sprint ${sprint.number} (${sprint.dirName}): "${path}" is listed in newSourceFiles but already exists in the seed or an earlier sprint`,
        })
      }
    }

    for (const path of sprint.rewrittenFiles) {
      if (!priorValid.has(path)) {
        findings.push({
          ruleId: RULE_ID,
          severity: "error",
          path,
          message: `sprint ${sprint.number} (${sprint.dirName}): rewrittenFiles lists "${path}", which does not exist in the seed or any earlier sprint`,
        })
      }
    }
  }

  return findings
}
