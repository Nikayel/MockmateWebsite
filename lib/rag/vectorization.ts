/**
 * Vectorization Infrastructure for Analytics & Recommendations
 *
 * This module provides:
 * 1. Session metrics vectorization for ML analysis
 * 2. Code embedding generation for similarity search
 * 3. User performance pattern analysis
 * 4. Recommendation engine based on session history
 */

import { adminDb } from "../firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import { cosineSimilarity } from "./utils"
import type { SessionMetrics, SessionVector, CodeFeatures, UserPerformanceProfile } from "./types"

// Vector dimensions
const METRICS_VECTOR_DIM = 25
const CODE_FEATURES_DIM = 15

/**
 * Convert session metrics to a normalized vector
 */
export function vectorizeSessionMetrics(metrics: Partial<SessionMetrics>): number[] {
  const vector: number[] = []

  // Time features (normalized to 0-1)
  const maxSessionTime = 3600 // 1 hour max
  vector.push(Math.min(1, (metrics.timeSpentSeconds || 0) / maxSessionTime))
  vector.push(Math.min(1, (metrics.timeToFirstCode || 0) / 300)) // First code within 5 min
  vector.push(
    metrics.timeBetweenMessages?.length
      ? Math.min(
          1,
          metrics.timeBetweenMessages.reduce((a, b) => a + b, 0) /
            metrics.timeBetweenMessages.length /
            60
        )
      : 0.5
  )

  // Collaboration features (normalized)
  const totalInterviewer =
    (metrics.interviewerMessagesSent || 0) + (metrics.interviewerMessagesReceived || 0)
  const totalPartner = (metrics.partnerMessagesSent || 0) + (metrics.partnerMessagesReceived || 0)
  vector.push(Math.min(1, totalInterviewer / 20))
  vector.push(Math.min(1, totalPartner / 20))
  vector.push(Math.min(1, (metrics.interviewerMessagesSent || 0) / 10))
  vector.push(Math.min(1, (metrics.partnerMessagesSent || 0) / 10))

  // Hint usage
  const hintsTotal = metrics.hintsTotal || 3
  vector.push(hintsTotal > 0 ? (metrics.hintsRevealed || 0) / hintsTotal : 0)

  // Test performance
  const testsTotal = metrics.testsTotal || 1
  vector.push(testsTotal > 0 ? (metrics.testsPassed || 0) / testsTotal : 0)
  vector.push(Math.min(1, (metrics.testsRunCount || 0) / 10))

  // Code metrics
  vector.push(Math.min(1, (metrics.linesOfCode || 0) / 200))
  vector.push(Math.min(1, (metrics.codeChangesCount || 0) / 50))
  vector.push(Math.min(1, (metrics.finalCodeLength || 0) / 5000))

  // Efficiency scores (already 0-100, normalize to 0-1)
  vector.push((metrics.codeEfficiencyScore || 50) / 100)
  vector.push((metrics.timeComplexityScore || 50) / 100)
  vector.push((metrics.spaceComplexityScore || 50) / 100)

  // Problem context (one-hot encoded)
  // Difficulty: easy=0, medium=0.5, hard=1
  const difficultyMap: Record<string, number> = { easy: 0, medium: 0.5, hard: 1 }
  vector.push(difficultyMap[metrics.problemDifficulty || "medium"] ?? 0.5)

  // Type: one-hot [dsa, bugfix, system-design]
  vector.push(metrics.problemType === "dsa" ? 1 : 0)
  vector.push(metrics.problemType === "bugfix" ? 1 : 0)
  vector.push(metrics.problemType === "system-design" ? 1 : 0)

  // Final scores (normalized)
  vector.push((metrics.correctnessScore || 50) / 100)
  vector.push((metrics.overallScore || 50) / 100)

  // Derived features
  const collaborationRatio =
    totalInterviewer + totalPartner > 0
      ? metrics.interviewerMessagesSent! / (totalInterviewer + totalPartner)
      : 0.5
  vector.push(collaborationRatio)

  const testEfficiency =
    testsTotal > 0 && (metrics.testsRunCount || 0) > 0
      ? (metrics.testsPassed || 0) / (metrics.testsRunCount || 1)
      : 0.5
  vector.push(testEfficiency)

  // Pad to fixed dimension
  while (vector.length < METRICS_VECTOR_DIM) {
    vector.push(0)
  }

  return vector.slice(0, METRICS_VECTOR_DIM)
}

/**
 * Extract code features for analysis
 */
export function extractCodeFeatures(code: string, language: string): CodeFeatures {
  const lines = code.split("\n")

  // Count patterns based on language
  const functionPatterns: Record<string, RegExp> = {
    javascript: /function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|=>\s*[{(]/g,
    typescript: /function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|=>\s*[{(]/g,
    python: /def\s+\w+\s*\(/g,
    java: /(?:public|private|protected)?\s*(?:static\s+)?[\w<>]+\s+\w+\s*\([^)]*\)\s*\{/g,
  }

  const classPatterns: Record<string, RegExp> = {
    javascript: /class\s+\w+/g,
    typescript: /class\s+\w+/g,
    python: /class\s+\w+/g,
    java: /class\s+\w+/g,
  }

  const loopPatterns = /for\s*\(|while\s*\(|\.forEach|\.map|\.filter|\.reduce|for\s+\w+\s+in/gi
  const conditionalPatterns = /if\s*\(|else\s*{|switch\s*\(|\?.*:/gi
  const recursionPattern = /(\w+)\s*\([^)]*\)[^{]*{[^}]*\1\s*\(/

  const funcPattern = functionPatterns[language] || functionPatterns.javascript
  const classPattern = classPatterns[language] || classPatterns.javascript

  const functionCount = (code.match(funcPattern) || []).length
  const classCount = (code.match(classPattern) || []).length
  const loopCount = (code.match(loopPatterns) || []).length
  const conditionalCount = (code.match(conditionalPatterns) || []).length

  // Calculate nesting depth
  let maxNestingDepth = 0
  let currentDepth = 0
  for (const char of code) {
    if (char === "{") {
      currentDepth++
      maxNestingDepth = Math.max(maxNestingDepth, currentDepth)
    } else if (char === "}") {
      currentDepth = Math.max(0, currentDepth - 1)
    }
  }

  // Pattern detection
  const usesHashMap = /Map\(|HashMap|new\s+Map|{}\s*;|\[\]|dict\(|{}/i.test(code)
  const usesSorting = /\.sort\(|sorted\(|Arrays\.sort|Collections\.sort/i.test(code)
  const usesRecursion = recursionPattern.test(code)
  const usesDynamicProgramming = /dp\[|memo\[|cache\[|@lru_cache|memoize/i.test(code)
  const usesGreedy = /greedy|Math\.max|Math\.min|max\(|min\(/i.test(code) && loopCount > 0

  // Quality features
  const hasComments = /\/\/|\/\*|#\s|"""/i.test(code)
  const hasErrorHandling = /try\s*{|catch\s*\(|except\s*:|throw\s+|raise\s+/i.test(code)
  const hasInputValidation =
    /if\s*\([^)]*null|if\s*\([^)]*undefined|if\s*\(.*\.length|if\s*\(.*==\s*None/i.test(code)

  const nonEmptyLines = lines.filter((l) => l.trim().length > 0)
  const averageLineLength =
    nonEmptyLines.length > 0
      ? nonEmptyLines.reduce((sum, l) => sum + l.length, 0) / nonEmptyLines.length
      : 0

  return {
    functionCount,
    classCount,
    loopCount,
    conditionalCount,
    recursionDetected: usesRecursion,
    hasComments,
    hasErrorHandling,
    hasInputValidation,
    averageLineLength,
    maxNestingDepth,
    usesHashMap,
    usesSorting,
    usesRecursion,
    usesDynamicProgramming,
    usesGreedy,
  }
}

/**
 * Convert code features to vector
 */
export function vectorizeCodeFeatures(features: CodeFeatures): number[] {
  return [
    Math.min(1, features.functionCount / 10),
    Math.min(1, features.classCount / 5),
    Math.min(1, features.loopCount / 10),
    Math.min(1, features.conditionalCount / 15),
    features.recursionDetected ? 1 : 0,
    features.hasComments ? 1 : 0,
    features.hasErrorHandling ? 1 : 0,
    features.hasInputValidation ? 1 : 0,
    Math.min(1, features.averageLineLength / 100),
    Math.min(1, features.maxNestingDepth / 6),
    features.usesHashMap ? 1 : 0,
    features.usesSorting ? 1 : 0,
    features.usesRecursion ? 1 : 0,
    features.usesDynamicProgramming ? 1 : 0,
    features.usesGreedy ? 1 : 0,
  ]
}

/**
 * Store session vector in Firestore
 */
export async function storeSessionVector(sessionVector: SessionVector): Promise<string> {
  try {
    const docRef = await adminDb.collection("session_vectors").add({
      ...sessionVector,
      userId: sessionVector.userId,
      user_id: sessionVector.userId, // For Firestore rules compatibility
      timestamp: Timestamp.fromDate(sessionVector.timestamp),
      createdAt: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error storing session vector:", error)
    throw error
  }
}

/**
 * Find similar sessions based on vector similarity
 */
export async function findSimilarSessions(
  targetVector: number[],
  userId: string,
  options: {
    limit?: number
    excludeSessionId?: string
    sameType?: string
    sameDifficulty?: string
  } = {}
): Promise<Array<SessionVector & { similarity: number }>> {
  try {
    const q = adminDb
      .collection("session_vectors")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(100)

    const snapshot = await q.get()
    const sessions: SessionVector[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      if (options.excludeSessionId && doc.id === options.excludeSessionId) return
      if (options.sameType && data.metadata?.type !== options.sameType) return
      if (options.sameDifficulty && data.metadata?.difficulty !== options.sameDifficulty) return

      const timestamp =
        data.timestamp instanceof Timestamp
          ? data.timestamp.toDate()
          : data.timestamp?.toDate?.() || new Date(data.timestamp)

      sessions.push({
        ...data,
        sessionId: doc.id,
        timestamp,
      } as SessionVector)
    })

    const withSimilarity = sessions.map((session) => ({
      ...session,
      similarity: cosineSimilarity(targetVector, session.vector),
    }))

    return withSimilarity.sort((a, b) => b.similarity - a.similarity).slice(0, options.limit || 5)
  } catch (error) {
    console.error("Error finding similar sessions:", error)
    return []
  }
}

/**
 * Get or create user performance profile
 */
export async function getUserPerformanceProfile(
  userId: string
): Promise<UserPerformanceProfile | null> {
  try {
    const docRef = adminDb.collection("performance_profiles").doc(userId)
    const docSnap = await docRef.get()

    if (docSnap.exists) {
      const data = docSnap.data()
      if (!data) return null

      const lastUpdated =
        data.lastUpdated instanceof Timestamp
          ? data.lastUpdated.toDate()
          : data.lastUpdated?.toDate?.() || new Date(data.lastUpdated)

      return {
        ...data,
        lastUpdated,
      } as UserPerformanceProfile
    }

    return null
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

/**
 * Update user performance profile with new session data
 */
export async function updateUserPerformanceProfile(
  userId: string,
  sessionVector: SessionVector
): Promise<void> {
  try {
    const existingProfile = await getUserPerformanceProfile(userId)

    const scoresByType = existingProfile?.scoresByType || {}
    const scoresByDifficulty = existingProfile?.scoresByDifficulty || {}

    const type = sessionVector.metadata.type
    const difficulty = sessionVector.metadata.difficulty

    scoresByType[type] = [...(scoresByType[type] || []), sessionVector.scores.overall]
    scoresByDifficulty[difficulty] = [
      ...(scoresByDifficulty[difficulty] || []),
      sessionVector.scores.overall,
    ]

    Object.keys(scoresByType).forEach((key) => {
      scoresByType[key] = scoresByType[key].slice(-20)
    })
    Object.keys(scoresByDifficulty).forEach((key) => {
      scoresByDifficulty[key] = scoresByDifficulty[key].slice(-20)
    })

    const allScores = Object.values(scoresByType).flat()
    const averageScore =
      allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 50

    const typeAverages = Object.entries(scoresByType).map(([type, scores]) => ({
      type,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    }))

    const strengthAreas = typeAverages
      .filter((t) => t.avg >= 70)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
      .map((t) => t.type)

    const weaknessAreas = typeAverages
      .filter((t) => t.avg < 60)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)
      .map((t) => t.type)

    const recentScores = allScores.slice(-5)
    let recentTrend: "improving" | "stable" | "declining" = "stable"
    if (recentScores.length >= 3) {
      const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2))
      const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2))
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      if (secondAvg - firstAvg > 5) recentTrend = "improving"
      else if (firstAvg - secondAvg > 5) recentTrend = "declining"
    }

    const vectorizedProfile = new Array(METRICS_VECTOR_DIM).fill(0)
    if (existingProfile?.vectorizedProfile) {
      const weight = 0.9
      for (let i = 0; i < METRICS_VECTOR_DIM; i++) {
        vectorizedProfile[i] =
          existingProfile.vectorizedProfile[i] * weight + sessionVector.vector[i] * (1 - weight)
      }
    } else {
      sessionVector.vector.forEach((v, i) => {
        if (i < METRICS_VECTOR_DIM) vectorizedProfile[i] = v
      })
    }

    const updatedProfile: UserPerformanceProfile = {
      userId,
      totalSessions: (existingProfile?.totalSessions || 0) + 1,
      averageScore,
      scoresByType,
      scoresByDifficulty,
      strengthAreas,
      weaknessAreas,
      recentTrend,
      vectorizedProfile,
      lastUpdated: new Date(),
    }

    const docRef = adminDb.collection("performance_profiles").doc(userId)
    await docRef.set(
      {
        ...updatedProfile,
        lastUpdated: Timestamp.fromDate(updatedProfile.lastUpdated),
      },
      { merge: true }
    )
  } catch (error) {
    console.error("Error updating user profile:", error)
  }
}

/**
 * Get recommended scenarios based on user profile
 */
export async function getRecommendedScenarios(
  userId: string,
  availableScenarios: Array<{ id: string; type: string; difficulty: string; title: string }>
): Promise<Array<{ id: string; reason: string; priority: number }>> {
  try {
    const profile = await getUserPerformanceProfile(userId)

    if (!profile) {
      return availableScenarios
        .filter((s) => s.difficulty === "easy")
        .slice(0, 3)
        .map((s) => ({
          id: s.id,
          reason: "Great starting point for new users",
          priority: 1,
        }))
    }

    const recommendations: Array<{ id: string; reason: string; priority: number }> = []

    for (const weakness of profile.weaknessAreas) {
      const matching = availableScenarios.filter((s) => s.type === weakness)
      if (matching.length > 0) {
        recommendations.push({
          id: matching[0].id,
          reason: `Practice ${weakness} to improve - currently a weak area`,
          priority: 1,
        })
      }
    }

    if (profile.recentTrend === "improving" && profile.averageScore > 70) {
      const hardProblems = availableScenarios.filter((s) => s.difficulty === "hard")
      if (hardProblems.length > 0) {
        recommendations.push({
          id: hardProblems[0].id,
          reason: "You're improving! Try a harder challenge",
          priority: 2,
        })
      }
    }

    if (profile.recentTrend === "declining") {
      for (const strength of profile.strengthAreas) {
        const matching = availableScenarios.filter(
          (s) => s.type === strength && s.difficulty === "easy"
        )
        if (matching.length > 0) {
          recommendations.push({
            id: matching[0].id,
            reason: `Rebuild confidence with ${strength} - your strength`,
            priority: 2,
          })
          break
        }
      }
    }

    const remainingSlots = 5 - recommendations.length
    const usedIds = new Set(recommendations.map((r) => r.id))
    const remaining = availableScenarios.filter((s) => !usedIds.has(s.id))

    for (let i = 0; i < Math.min(remainingSlots, remaining.length); i++) {
      recommendations.push({
        id: remaining[i].id,
        reason: "Diverse practice",
        priority: 3,
      })
    }

    return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 5)
  } catch (error) {
    console.error("Error getting recommendations:", error)
    return []
  }
}

/**
 * Analytics: Get aggregate statistics for admin dashboard
 */
export async function getAggregateAnalytics(timeRange: "day" | "week" | "month" = "week"): Promise<{
  totalSessions: number
  averageScore: number
  scoreDistribution: Record<string, number>
  popularScenarios: Array<{ id: string; title: string; count: number }>
  providerUsage: Record<string, number>
  averageLatency: number
}> {
  try {
    const now = new Date()
    const startDate = new Date()

    switch (timeRange) {
      case "day":
        startDate.setDate(now.getDate() - 1)
        break
      case "week":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        break
    }

    const q = adminDb
      .collection("session_vectors")
      .where("timestamp", ">=", Timestamp.fromDate(startDate))
      .orderBy("timestamp", "desc")

    const snapshot = await q.get()

    let totalScore = 0
    const scenarioCounts: Record<string, { title: string; count: number }> = {}
    const scoreRanges = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 }

    snapshot.forEach((doc) => {
      const data = doc.data()
      totalScore += data.scores?.overall || 0

      const score = data.scores?.overall || 0
      if (score <= 20) scoreRanges["0-20"]++
      else if (score <= 40) scoreRanges["21-40"]++
      else if (score <= 60) scoreRanges["41-60"]++
      else if (score <= 80) scoreRanges["61-80"]++
      else scoreRanges["81-100"]++

      const scenarioId = data.scenarioId
      if (!scenarioCounts[scenarioId]) {
        scenarioCounts[scenarioId] = { title: data.scenarioTitle, count: 0 }
      }
      scenarioCounts[scenarioId].count++
    })

    const totalSessions = snapshot.size
    const averageScore = totalSessions > 0 ? totalScore / totalSessions : 0

    const popularScenarios = Object.entries(scenarioCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalSessions,
      averageScore: Math.round(averageScore),
      scoreDistribution: scoreRanges,
      popularScenarios,
      providerUsage: {},
      averageLatency: 0,
    }
  } catch (error) {
    console.error("Error getting aggregate analytics:", error)
    return {
      totalSessions: 0,
      averageScore: 0,
      scoreDistribution: {},
      popularScenarios: [],
      providerUsage: {},
      averageLatency: 0,
    }
  }
}
