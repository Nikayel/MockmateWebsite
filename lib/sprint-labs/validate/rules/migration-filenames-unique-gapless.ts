/**
 * AUTHORING-RULES.md §1 [validate]: "one monotonic counter 0001-0030 across
 * the whole workbook, unique, no gaps." Migration files are collected from
 * the seed (repo/**\/*.sql matching NNNN_name.sql) and from every ticket's
 * setup.diff/reference.diff (any file a diff creates, via its `+++ b/`
 * header) — diffs are the only place a migration can appear post-seed,
 * since there is no separate authored "migrations list" field anywhere in
 * the spec.
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import { extractDiffFilePaths } from "../diff-utils"

export const RULE_ID = "migration-filenames-unique-gapless"

const MIGRATION_RE = /(?:^|\/)(\d{4})_[A-Za-z0-9_-]+\.sql$/

function collectMigrationPaths(workbook: AuthoredWorkbook): string[] {
  const paths = new Set<string>()
  for (const path of workbook.seedFiles) paths.add(path)
  for (const sprint of workbook.sprints) {
    for (const ticket of sprint.tickets) {
      for (const diffText of [ticket.setupDiff, ticket.referenceDiff]) {
        if (!diffText) continue
        for (const path of extractDiffFilePaths(diffText)) paths.add(path)
      }
    }
  }
  return [...paths]
}

export function migrationFilenamesUniqueGapless(workbook: AuthoredWorkbook): ValidationFinding[] {
  const findings: ValidationFinding[] = []
  const byNumber = new Map<string, Set<string>>()

  for (const path of collectMigrationPaths(workbook)) {
    const match = MIGRATION_RE.exec(path)
    if (!match) continue
    const [, number] = match
    const filename = path.slice(path.lastIndexOf("/") + 1)
    const set = byNumber.get(number) ?? new Set<string>()
    set.add(filename)
    byNumber.set(number, set)
  }

  for (const [number, filenames] of byNumber) {
    if (filenames.size > 1) {
      findings.push({
        ruleId: RULE_ID,
        severity: "error",
        message: `migration number ${number} is used by ${filenames.size} different files: ${[...filenames].sort().join(", ")}`,
      })
    }
  }

  const numbers = [...byNumber.keys()].map((n) => Number.parseInt(n, 10)).sort((a, b) => a - b)
  for (let i = 0; i < numbers.length; i++) {
    const expected = i + 1
    if (numbers[i] !== expected) {
      findings.push({
        ruleId: RULE_ID,
        severity: "error",
        message: `migration numbering has a gap: expected ${String(expected).padStart(4, "0")} but the sequence jumps to ${String(numbers[i]).padStart(4, "0")} (full sequence found: ${numbers.map((n) => String(n).padStart(4, "0")).join(", ")})`,
      })
      break
    }
  }

  return findings
}
