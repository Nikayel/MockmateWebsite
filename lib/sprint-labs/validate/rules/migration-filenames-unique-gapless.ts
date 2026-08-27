/**
 * AUTHORING-RULES.md §1 [validate]: "one monotonic counter 0001-0030
 * across the whole workbook, unique, no gaps." Migration files are
 * collected from the seed (repo/**\/*.sql matching NNNN_name.sql) and
 * from every ticket's setup.diff/reference.diff (any file a diff creates,
 * via its `+++ b/` header) — diffs are the only place a migration can
 * appear post-seed, since there is no separate authored "migrations list"
 * field anywhere in the spec.
 *
 * Review round 1, M-4: duplicate detection is dirname-aware -- tracked by
 * FULL path, not bare filename. The original implementation deduped by
 * filename alone, so two files sharing a number AND a basename but sitting
 * in different directories (e.g. `db/migrations/0004_x.sql` and
 * `archive/0004_x.sql`) read as "1 distinct filename" and the collision
 * went undetected. Also enforces AUTHORING-RULES.md's stated `0001`-`0030`
 * band directly, independent of gaplessness (a number that's unique and
 * "gapless" relative to the other numbers found could still sit outside
 * the allocated range if, say, numbering starts at 0005).
 */

import type { AuthoredWorkbook } from "../tree"
import type { ValidationFinding } from "../types"
import { extractDiffFilePaths } from "../diff-utils"

export const RULE_ID = "migration-filenames-unique-gapless"

const MIGRATION_RE = /(?:^|\/)(\d{4})_[A-Za-z0-9_-]+\.sql$/
const BAND_MIN = 1
const BAND_MAX = 30

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
  /** migration number (string, e.g. "0004") -> full paths seen with that number. */
  const byNumber = new Map<string, Set<string>>()

  for (const path of collectMigrationPaths(workbook)) {
    const match = MIGRATION_RE.exec(path)
    if (!match) continue
    const [, number] = match
    const set = byNumber.get(number) ?? new Set<string>()
    set.add(path)
    byNumber.set(number, set)
  }

  for (const [number, paths] of byNumber) {
    if (paths.size > 1) {
      findings.push({
        ruleId: RULE_ID,
        severity: "error",
        message: `migration number ${number} is used by ${paths.size} different files: ${[...paths].sort().join(", ")}`,
      })
    }
  }

  for (const number of [...byNumber.keys()].sort()) {
    const value = Number.parseInt(number, 10)
    if (value < BAND_MIN || value > BAND_MAX) {
      findings.push({
        ruleId: RULE_ID,
        severity: "error",
        message: `migration number ${number} is outside the allocated ${String(BAND_MIN).padStart(4, "0")}-${String(BAND_MAX).padStart(4, "0")} band`,
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
