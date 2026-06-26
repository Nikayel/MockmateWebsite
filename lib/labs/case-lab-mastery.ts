import type { CaseLab, CaseLabRun } from "./types"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { calculateMasteryScore } from "@/lib/spaced-repetition"
import { logger } from "@/lib/logger"

// Case Lab builds are multi-file codebase drops (add-functionality / system-design),
// not DSA problems, so they have no natural DSA pattern. We mirror the fallback the
// interview feedback pipeline uses for non-DSA scenarios (see app/api/generate-feedback)
// so the completed Build still lands in the same problem-level mastery store (§7.5).
const CASE_LAB_FALLBACK_PATTERN: DSAPattern = "arrays-hashing"

export interface CaseLabMasterySession {
  scenarioId: string
  title: string
  pattern: DSAPattern
  difficulty: "easy" | "medium" | "hard"
  performanceScore: number
  masteryScore: number
  completedAt: string
}

/**
 * Pure mapping: turn a completed Case Lab run + its lab definition into the
 * session payload the spaced-repetition system expects. The completed Build
 * scenario (`lab.buildScenarioId`) is the unit of mastery — its visible/hidden
 * test pass rate drives the technical mastery score (§7.5).
 */
export function buildCaseLabMasterySession(lab: CaseLab, run: CaseLabRun): CaseLabMasterySession {
  const testResults = run.answers.build?.testResults ?? []
  const testCasesTotal = testResults.length
  const testCasesPassed = testResults.filter((result) => result.passed).length

  const mastery = calculateMasteryScore({
    testCasesPassed,
    // Guard divide-by-zero when the user completed without running tests; with
    // 0 passed against 1 expected the correctness component is simply 0.
    testCasesTotal: testCasesTotal || 1,
    timeSpentMinutes: 0,
    hintsUsed: 0,
    hintsTotal: 5,
    problemDifficulty: lab.difficulty,
  })

  return {
    scenarioId: lab.buildScenarioId,
    title: lab.title,
    pattern: CASE_LAB_FALLBACK_PATTERN,
    difficulty: lab.difficulty,
    performanceScore: mastery.masteryScore,
    masteryScore: mastery.masteryScore,
    completedAt: run.completedAt ?? run.updatedAt,
  }
}

/**
 * Record a completed Case Lab against problem-level mastery + the user's
 * learning state, reusing the same entry point as interview sessions
 * (`completeSessionWithMastery`). Best-effort: failures are logged, never
 * thrown, so a mastery hiccup can't fail the lab-completion response.
 */
export async function recordCaseLabMastery(
  userId: string,
  lab: CaseLab,
  run: CaseLabRun
): Promise<void> {
  try {
    const { completeSessionWithMastery } = await import("@/lib/learning-state")
    await completeSessionWithMastery(userId, buildCaseLabMasterySession(lab, run))
  } catch (error) {
    logger.error("Case lab mastery update failed", { error, userId, caseLabId: lab.id })
  }
}
