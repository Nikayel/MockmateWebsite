/**
 * Guided bug-fix lab mastery signal.
 *
 * A guided lab is a scaffolded teaching exercise, so the interview-style 11-dim
 * bugfix rubric is not a valid debugging-skill measure for it (the rail dictates
 * most scored behaviors). Instead we summarize what the lab actually produces —
 * first-try quiz accuracy and milestone completion — as a labeled practice
 * signal. The numeric mastery score itself is computed from the workspace test
 * pass rate (mirroring lib/labs/case-lab-mastery.ts) in the persist route.
 */

import type { GuidedLabConfig, GuidedLabProgress } from "./types"

export interface GuidedLabProgressSummary {
  quizzesCorrect: number
  quizzesTotal: number
  /** First-try quiz accuracy as a 0-100 percentage (100 when there are no quizzes). */
  quizAccuracy: number
  milestonesCompleted: number
  milestonesTotal: number
}

export function summarizeGuidedLabProgress(
  config: GuidedLabConfig,
  progress: GuidedLabProgress
): GuidedLabProgressSummary {
  const quizzes = config.milestones.flatMap((milestone) =>
    milestone.blocks.filter((block) => block.kind === "quiz")
  )
  const quizzesTotal = quizzes.length
  const quizzesCorrect = quizzes.filter((quiz) => {
    if (quiz.kind !== "quiz") return false
    const answer = progress.quizAnswers.find((entry) => entry.quizId === quiz.id)
    return answer?.selectedIndex === quiz.correctIndex
  }).length

  const milestonesTotal = config.milestones.length
  const milestonesCompleted = config.milestones.filter(
    (milestone) => progress.milestoneStatus[milestone.id] === "done"
  ).length

  return {
    quizzesCorrect,
    quizzesTotal,
    quizAccuracy: quizzesTotal === 0 ? 100 : Math.round((quizzesCorrect / quizzesTotal) * 100),
    milestonesCompleted,
    milestonesTotal,
  }
}
