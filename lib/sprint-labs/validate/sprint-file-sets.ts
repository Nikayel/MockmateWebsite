/**
 * Shared set-accumulation logic for the two `filesTouched`/`newSourceFiles`
 * rules (`rules/files-touched-exist.ts`, `rules/new-source-files-set-difference.ts`).
 * Kept in one place per CLAUDE.md's DRY principle: both rules need "what
 * files legitimately exist as of sprint N," they just draw the boundary at
 * a different point (inclusive of sprint N's own new files, vs. strictly
 * before sprint N).
 */

import type { AuthoredWorkbook } from "./tree"

export interface CumulativeSprintFileSets {
  /** seed ∪ every newSourceFiles up to and INCLUDING this sprint, keyed by sprint number. */
  validAsOf: Map<number, Set<string>>
  /** seed ∪ every newSourceFiles strictly BEFORE this sprint, keyed by sprint number. */
  validBefore: Map<number, Set<string>>
}

export function computeCumulativeFileSets(workbook: AuthoredWorkbook): CumulativeSprintFileSets {
  const validAsOf = new Map<number, Set<string>>()
  const validBefore = new Map<number, Set<string>>()
  let running = new Set(workbook.seedFiles)

  for (const sprint of workbook.sprints) {
    validBefore.set(sprint.number, new Set(running))
    const withCurrent = new Set(running)
    for (const path of sprint.newSourceFiles) withCurrent.add(path)
    validAsOf.set(sprint.number, withCurrent)
    running = withCurrent
  }

  return { validAsOf, validBefore }
}
