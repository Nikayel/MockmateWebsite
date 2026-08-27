/**
 * AUTHORING-RULES.md §1/§2 [validate]: "One name per file, forever" —
 * `src/db/repositories/outbox.ts` (never `outbox-repository.ts`),
 * `src/db/repositories/claims.ts` (never `claim-repository.ts`). Checked
 * anywhere the banned name could be authored: a sprint's filesTouched /
 * newSourceFiles / rewrittenFiles lists, or literally inside a ticket's
 * setup.diff / reference.diff text.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"

export const RULE_ID = "one-name-per-file"

const BANNED_BASENAMES = ["outbox-repository.ts", "claim-repository.ts"]

function findBanned(value: string): string[] {
  return BANNED_BASENAMES.filter((name) => value.includes(name))
}

export function oneNamePerFile(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []

  for (const sprint of workbook.sprints) {
    const fileLists: Array<[string, string[]]> = [
      ["filesTouched", sprint.filesTouched],
      ["newSourceFiles", sprint.newSourceFiles],
      ["rewrittenFiles", sprint.rewrittenFiles],
    ]
    for (const [fieldName, paths] of fileLists) {
      for (const path of paths) {
        for (const banned of findBanned(path)) {
          findings.push({
            ruleId: RULE_ID,
            severity: "error",
            path,
            message: `sprint ${sprint.number} (${sprint.dirName}) ${fieldName} references banned filename "${banned}" in "${path}"`,
          })
        }
      }
    }

    for (const ticket of sprint.tickets) {
      const diffSources: Array<[string, string | null]> = [
        ["setup.diff", ticket.setupDiff],
        ["reference.diff", ticket.referenceDiff],
      ]
      for (const [sourceName, text] of diffSources) {
        if (!text) continue
        for (const banned of findBanned(text)) {
          findings.push({
            ruleId: RULE_ID,
            severity: "error",
            ticketKey: ticket.key,
            message: `ticket ${ticket.key}'s ${sourceName} references banned filename "${banned}"`,
          })
        }
      }
    }
  }

  return findings
}
