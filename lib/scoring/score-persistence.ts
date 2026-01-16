/**
 * Score Persistence
 *
 * Handles atomic persistence of session scores to Firestore.
 * Fixes race conditions by:
 * 1. Using a single batch for all updates (atomic operation)
 * 2. Using FieldValue.increment() instead of read-modify-write
 * 3. Adding idempotency checks to prevent duplicate completions
 * 4. Using server timestamps for consistency
 */

import { adminDb } from "@/lib/firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import type { SessionScores, ScorePersistenceInput, MasteryLevel } from "./types"

/**
 * Persist all session scores atomically
 *
 * Updates three collections in a single batch:
 * 1. session_summaries - Individual session record
 * 2. user_stats - Aggregate statistics (using increment)
 * 3. user_problem_mastery - Per-problem tracking
 *
 * @param input - Score persistence input
 */
export async function persistSessionScores(input: ScorePersistenceInput): Promise<void> {
  const { userId, sessionId, problemId, scores } = input

  // Use a SINGLE batch for all updates - atomic operation
  const batch = adminDb.batch()

  // 1. Session summary
  const sessionRef = adminDb
    .collection("users")
    .doc(userId)
    .collection("session_summaries")
    .doc(sessionId)

  batch.set(
    sessionRef,
    {
      performanceScore: scores.performanceScore,
      technicalScore: scores.technicalScore,
      masteryScore: scores.masteryScore,
      scoreBreakdown: scores.breakdown,
      completedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  // 2. User stats (use increment for thread-safety)
  const statsRef = adminDb.collection("user_stats").doc(userId)

  batch.set(
    statsRef,
    {
      totalSessions: FieldValue.increment(1),
      sumOverallScore: FieldValue.increment(scores.performanceScore),
      sumTechnicalScore: FieldValue.increment(scores.technicalScore),
      sumMasteryScore: FieldValue.increment(scores.masteryScore),
      lastUpdated: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  // 3. Problem mastery
  const masteryRef = adminDb
    .collection("user_problem_mastery")
    .doc(userId)
    .collection("problems")
    .doc(problemId)

  batch.set(
    masteryRef,
    {
      last_score: scores.masteryScore,
      practice_count: FieldValue.increment(1),
      last_practiced: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  // Commit ALL updates atomically
  await batch.commit()
}

/**
 * Check if a session has already been completed
 * Used for idempotency to prevent duplicate score submissions
 *
 * @param userId - User ID
 * @param sessionId - Session ID
 * @returns true if session already has a completedAt timestamp
 */
export async function isSessionAlreadyCompleted(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const doc = await adminDb
    .collection("users")
    .doc(userId)
    .collection("session_summaries")
    .doc(sessionId)
    .get()

  return doc.exists && doc.data()?.completedAt != null
}

/**
 * Get existing session summary (for idempotent returns)
 *
 * @param userId - User ID
 * @param sessionId - Session ID
 * @returns Session scores if exists, null otherwise
 */
export async function getExistingSessionScores(
  userId: string,
  sessionId: string
): Promise<SessionScores | null> {
  const doc = await adminDb
    .collection("users")
    .doc(userId)
    .collection("session_summaries")
    .doc(sessionId)
    .get()

  if (!doc.exists) return null

  const data = doc.data()
  if (!data) return null

  // Calculate approximate technical score if missing
  // Technical score excludes communication, so we estimate by removing 20% communication contribution
  // Performance = 0.25*U + 0.25*PS + 0.30*CQ + 0.20*C
  // Assume average communication (50) contributes 10 points, rescale remaining 80% to 100%
  const estimatedTechnicalScore =
    data.technicalScore ??
    (data.scoreBreakdown
      ? Math.round(
          data.scoreBreakdown.understandingScore * 0.15 +
            data.scoreBreakdown.problemSolvingScore * 0.25 +
            data.scoreBreakdown.codeQualityScore * 0.6
        )
      : Math.max(0, Math.round((data.performanceScore - 10) / 0.8)))

  // Mastery score is harder to estimate - use a conservative approach
  // It's based on correctness, time, and independence which we don't have
  // Use performance minus a buffer (mastery typically lower than performance)
  const estimatedMasteryScore =
    data.masteryScore ?? Math.max(0, Math.round((data.performanceScore ?? 0) * 0.9 - 5))

  return {
    performanceScore: data.performanceScore ?? 0,
    technicalScore: estimatedTechnicalScore,
    masteryScore: estimatedMasteryScore,
    breakdown: data.scoreBreakdown ?? {
      understandingScore: 0,
      problemSolvingScore: 0,
      codeQualityScore: 0,
      communicationScore: 0,
      overallScore: data.performanceScore ?? 0,
    },
  }
}

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
  // Read from problem_mastery collection (where spaced repetition stores mastery_level)
  // NOT user_problem_mastery (which is for score persistence only)
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

/**
 * Update mastery level for a problem
 * Called after spaced repetition calculates new level
 *
 * @param userId - User ID
 * @param problemId - Problem ID
 * @param masteryLevel - New mastery level
 * @param interval - Current interval in days
 */
export async function updateProblemMasteryLevel(
  userId: string,
  problemId: string,
  masteryLevel: MasteryLevel,
  interval: number
): Promise<void> {
  const ref = adminDb
    .collection("user_problem_mastery")
    .doc(userId)
    .collection("problems")
    .doc(problemId)

  await ref.set(
    {
      mastery_level: masteryLevel,
      current_interval: interval,
      last_updated: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}
