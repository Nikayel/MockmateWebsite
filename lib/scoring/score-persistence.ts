/**
 * Score Read Helpers
 *
 * Read-only accessors for persisted session scores and problem-mastery stats
 * (the user_stats aggregates and the unified problem_mastery collection). The
 * write path lives with the feedback pipeline; this module only reads.
 */

import { adminDb } from "@/lib/firebase-admin"
import type { MasteryLevel } from "./types"

/**
 * Get user score statistics
 *
 * @param userId - User ID
 * @returns User score stats or defaults
 */
export async function getUserScoreStats(userId: string): Promise<{
  totalSessions: number
  sumOverallScore: number
  sumTechnicalScore: number
  sumMasteryScore: number
  averageOverallScore: number
  averageTechnicalScore: number
  averageMasteryScore: number
}> {
  const doc = await adminDb.collection("user_stats").doc(userId).get()

  const data = doc.data()
  const totalSessions = data?.totalSessions ?? 0

  const sumOverall = data?.sumOverallScore ?? 0
  const sumTechnical = data?.sumTechnicalScore ?? sumOverall // Fallback
  const sumMastery = data?.sumMasteryScore ?? sumOverall // Fallback

  return {
    totalSessions,
    sumOverallScore: sumOverall,
    sumTechnicalScore: sumTechnical,
    sumMasteryScore: sumMastery,
    averageOverallScore: totalSessions > 0 ? Math.round(sumOverall / totalSessions) : 0,
    averageTechnicalScore: totalSessions > 0 ? Math.round(sumTechnical / totalSessions) : 0,
    averageMasteryScore: totalSessions > 0 ? Math.round(sumMastery / totalSessions) : 0,
  }
}

/**
 * Get mastery statistics for a user
 * Counts problems by mastery level
 *
 * @param userId - User ID
 * @returns Mastery statistics
 */
export async function getMasteryStatistics(userId: string): Promise<{
  total: number
  new: number
  learning: number
  reviewing: number
  mastered: number
}> {
  // Read from problem_mastery collection (unified collection for both SR and score tracking)
  // user_problem_mastery is deprecated - all data now goes to problem_mastery
  const snapshot = await adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .get()

  const stats = {
    total: 0,
    new: 0,
    learning: 0,
    reviewing: 0,
    mastered: 0,
  }

  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    const level = (data.mastery_level as MasteryLevel) ?? "new"

    stats.total++
    stats[level]++
  })

  return stats
}

/**
 * Get list of mastered problems for a user
 * @param userId - User ID
 * @returns Array of mastered problem details
 */
export async function getMasteredProblems(userId: string): Promise<
  Array<{
    problemId: string
    scenarioId: string
    title: string
    pattern: string
    difficulty: string
    masteredAt: string
  }>
> {
  const snapshot = await adminDb
    .collection("problem_mastery")
    .doc(userId)
    .collection("problems")
    .where("mastery_level", "==", "mastered")
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      problemId: doc.id,
      scenarioId: data.scenario_id || doc.id,
      title: data.title || data.scenario_title || doc.id,
      pattern: data.pattern || "unknown",
      difficulty: data.difficulty || "medium",
      masteredAt: data.last_review_at || data.updated_at || new Date().toISOString(),
    }
  })
}
