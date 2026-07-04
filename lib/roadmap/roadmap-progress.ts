/**
 * Shared roadmap progress math.
 *
 * Extracted so the progress route and the defer route recompute completion and
 * on-track status identically instead of duplicating the rules (CLAUDE.md: no
 * duplicated business logic).
 */

import { toDateValue, type FirestoreDailyPlan } from "./roadmap-serialization"

/**
 * Recompute completed/skipped counts from the daily plans. Used after a defer
 * relocates a question so the counts cannot drift from the actual node states.
 */
export function computeCompletionCounts(
  dailyPlans: Array<{ questions?: Array<{ status?: string }> }>
): { questionsCompleted: number; questionsSkipped: number } {
  const all = dailyPlans.flatMap((plan) => plan.questions ?? [])
  return {
    questionsCompleted: all.filter((q) => q.status === "completed").length,
    questionsSkipped: all.filter((q) => q.status === "skipped").length,
  }
}

/**
 * Determine whether the user is on track: actual completion progress vs the
 * expected progress by today's position in the plan, with a 10% grace buffer.
 * Moved verbatim from app/api/roadmap/progress/route.ts.
 */
export function calculateIsOnTrack(
  dailyPlans: FirestoreDailyPlan[],
  interviewDate: unknown
): boolean {
  const now = new Date()
  // interviewDate is accepted for signature parity with the original and future
  // pacing tweaks; current heuristic derives pacing from plan positions.
  void interviewDate
  const totalDays = dailyPlans.length

  // Find today's index (last plan on or before now).
  let todayIndex = 0
  for (let i = 0; i < dailyPlans.length; i++) {
    const planDate = toDateValue(dailyPlans[i].date)
    if (planDate <= now) {
      todayIndex = i
    }
  }

  const expectedProgress = totalDays > 0 ? (todayIndex + 1) / totalDays : 0

  let completedQuestions = 0
  let totalQuestions = 0
  dailyPlans.forEach((plan) => {
    plan.questions?.forEach((q) => {
      totalQuestions++
      if (q.status === "completed") completedQuestions++
    })
  })

  const actualProgress = totalQuestions > 0 ? completedQuestions / totalQuestions : 0

  // Allow a 10% buffer before marking as behind.
  return actualProgress >= expectedProgress - 0.1
}
