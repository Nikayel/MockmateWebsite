/**
 * User Performance RAG Service
 *
 * Tracks, analyzes, and retrieves user performance data for personalization.
 * Provides:
 * - Performance profiling
 * - Strength/weakness analysis
 * - Learning trajectory tracking
 * - Personalized recommendations
 * - Progress analytics
 */

import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { getHybridProvider } from "./embeddings/hybrid-provider"
import { vectorDB } from "./vectordb"
import { adminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"
import type { VectorDocument } from "./types"

/**
 * User performance profile
 */
export interface UserPerformanceProfile {
  userId: string
  lastUpdated: Date

  // Overall metrics
  totalSessions: number
  completedSessions: number
  averageScore: number
  totalPracticeHours: number

  // Pattern proficiency
  patternProficiency: PatternProficiency[]

  // Difficulty performance
  difficultyPerformance: {
    easy: { attempted: number; avgScore: number }
    medium: { attempted: number; avgScore: number }
    hard: { attempted: number; avgScore: number }
  }

  // Trend analysis
  recentTrend: "improving" | "stable" | "declining"
  weeklyProgress: number[] // Last 4 weeks scores

  // Strengths and weaknesses
  strengths: DSAPattern[]
  weaknesses: DSAPattern[]
  focusAreas: string[]

  // Learning style indicators
  preferredSessionLength: number // minutes
  bestPerformanceTime: string // e.g., "morning", "evening"
  learningPace: "slow" | "moderate" | "fast"
}

/**
 * Pattern proficiency metrics
 */
export interface PatternProficiency {
  pattern: DSAPattern
  problemsAttempted: number
  problemsSolved: number
  averageScore: number
  lastPracticed: Date | null
  proficiencyLevel: "novice" | "learning" | "practicing" | "proficient" | "expert"
  improvementTrend: "improving" | "stable" | "declining" | "not_enough_data"
}

/**
 * Session analysis result
 */
export interface SessionAnalysis {
  sessionId: string
  userId: string
  scenarioId: string
  pattern: DSAPattern
  difficulty: "easy" | "medium" | "hard"
  score: number // MASTERY score for technical analysis
  performanceScore: number // PERFORMANCE score for interview readiness
  duration: number
  hintsUsed: number
  testsRun: number
  testsPassed: number
  codeQuality: number
  timestamp: Date
}

/**
 * Personalized recommendation
 */
export interface PersonalizedRecommendation {
  type: "practice" | "review" | "challenge" | "rest"
  priority: "high" | "medium" | "low"
  pattern?: DSAPattern
  difficulty?: "easy" | "medium" | "hard"
  reason: string
  estimatedBenefit: string
  suggestedScenarioIds?: string[]
}

/**
 * User Performance RAG Service
 */
export class UserPerformanceRAG {
  private embeddingProvider = getHybridProvider()

  /**
   * Get or create user performance profile
   */
  async getPerformanceProfile(userId: string): Promise<UserPerformanceProfile> {
    try {
      // Check for cached profile
      const profileDoc = await adminDb.collection("user_performance_profiles").doc(userId).get()

      if (profileDoc.exists) {
        const data = profileDoc.data()!
        const lastUpdated = (data.lastUpdated as Timestamp).toDate()

        // If updated within last hour, return cached
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
        if (lastUpdated > hourAgo) {
          return this.dataToProfile(data, userId)
        }
      }

      // Build fresh profile
      return await this.buildPerformanceProfile(userId)
    } catch (error) {
      console.error("[UserPerformanceRAG] Error getting profile:", error)
      return this.createEmptyProfile(userId)
    }
  }

  /**
   * Build performance profile from session data
   */
  async buildPerformanceProfile(userId: string): Promise<UserPerformanceProfile> {
    try {
      // Get all user sessions from session_summaries subcollection
      const sessionsSnapshot = await adminDb
        .collection("users")
        .doc(userId)
        .collection("session_summaries")
        .orderBy("completedAt", "desc")
        .limit(100)
        .get()

      if (sessionsSnapshot.empty) {
        return this.createEmptyProfile(userId)
      }

      const sessions = sessionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Array<{ id: string; performanceScore?: number; [key: string]: unknown }>

      // Analyze sessions (session_summaries are all completed)
      const analyses = sessions
        .filter((s) => s.performanceScore !== undefined)
        .map((s) => this.analyzeSession(s))

      // Calculate overall metrics
      const totalSessions = sessions.length
      const completedSessions = analyses.length
      const averageScore =
        analyses.length > 0 ? analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length : 0
      const totalPracticeHours = analyses.reduce((sum, a) => sum + a.duration / 3600, 0)

      // Calculate pattern proficiency
      const patternProficiency = this.calculatePatternProficiency(analyses)

      // Calculate difficulty performance
      const difficultyPerformance = this.calculateDifficultyPerformance(analyses)

      // Calculate trend
      const recentTrend = this.calculateTrend(analyses)
      const weeklyProgress = this.calculateWeeklyProgress(analyses)

      // Identify strengths and weaknesses
      const { strengths, weaknesses } = this.identifyStrengthsWeaknesses(patternProficiency)

      // Generate focus areas
      const focusAreas = this.generateFocusAreas(patternProficiency, difficultyPerformance)

      // Analyze learning style
      const preferredSessionLength = this.calculatePreferredSessionLength(analyses)
      const bestPerformanceTime = this.analyzeBestPerformanceTime(analyses)
      const learningPace = this.analyzeLearningPace(analyses)

      const profile: UserPerformanceProfile = {
        userId,
        lastUpdated: new Date(),
        totalSessions,
        completedSessions,
        averageScore,
        totalPracticeHours,
        patternProficiency,
        difficultyPerformance,
        recentTrend,
        weeklyProgress,
        strengths,
        weaknesses,
        focusAreas,
        preferredSessionLength,
        bestPerformanceTime,
        learningPace,
      }

      // Save profile
      await this.saveProfile(profile)

      // Store performance embedding for similarity matching
      await this.storePerformanceEmbedding(profile)

      return profile
    } catch (error) {
      console.error("[UserPerformanceRAG] Error building profile:", error)
      return this.createEmptyProfile(userId)
    }
  }

  /**
   * Analyze a single session
   * Maps session_summaries subcollection format to SessionAnalysis
   *
   * IMPORTANT: Uses MASTERY score for technical proficiency analysis
   */
  private analyzeSession(session: Record<string, unknown>): SessionAnalysis {
    const scoreBreakdown = session.scoreBreakdown as Record<string, unknown> | undefined
    const interactionMetrics = session.interactionMetrics as Record<string, unknown> | undefined

    // Validate pattern - don't silently corrupt data with wrong defaults
    let pattern: DSAPattern
    if (session.pattern && typeof session.pattern === "string") {
      pattern = session.pattern as DSAPattern
    } else {
      // Log warning when pattern is missing - this indicates upstream data issue
      console.warn(
        `[UserPerformanceRAG] Session ${session.sessionId || session.id} missing pattern field. This should be investigated.`
      )
      // Use a safe default but flag it for review
      pattern = "arrays-hashing"
    }

    // Use MASTERY score for technical proficiency (if available), fallback to performance score
    const masteryScore =
      (session.masteryScore as number) ||
      (session.performanceScore as number) ||
      (scoreBreakdown?.overallScore as number) ||
      0

    const performanceScore =
      (session.performanceScore as number) || (scoreBreakdown?.overallScore as number) || 0

    return {
      sessionId: (session.sessionId as string) || (session.id as string),
      userId: session.userId as string,
      scenarioId: session.scenarioId as string,
      pattern,
      difficulty: (session.difficulty || "medium") as "easy" | "medium" | "hard",
      score: masteryScore, // Use MASTERY score for technical proficiency analysis
      performanceScore, // Separate field for interview readiness
      duration: ((session.durationMinutes as number) || 0) * 60, // Convert to seconds
      hintsUsed: (interactionMetrics?.hintsUsed as number) || 0,
      testsRun: (interactionMetrics?.codeExecutions as number) || 0,
      testsPassed: (interactionMetrics?.testsPassed as number) || 0,
      codeQuality: (scoreBreakdown?.codeQualityScore as number) || 50,
      timestamp: session.completedAt
        ? (session.completedAt as Timestamp).toDate?.() || new Date(session.completedAt as string)
        : new Date(),
    }
  }

  /**
   * Calculate pattern proficiency
   */
  private calculatePatternProficiency(analyses: SessionAnalysis[]): PatternProficiency[] {
    const patternMap = new Map<DSAPattern, SessionAnalysis[]>()

    for (const analysis of analyses) {
      const existing = patternMap.get(analysis.pattern) || []
      existing.push(analysis)
      patternMap.set(analysis.pattern, existing)
    }

    const proficiencies: PatternProficiency[] = []

    for (const [pattern, sessions] of patternMap) {
      const sortedSessions = [...sessions].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      )

      const problemsAttempted = sessions.length
      const problemsSolved = sessions.filter((s) => s.score >= 70).length
      const averageScore = sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length
      const lastPracticed = sortedSessions[0]?.timestamp || null

      // Calculate proficiency level
      let proficiencyLevel: PatternProficiency["proficiencyLevel"]
      if (problemsAttempted < 3) {
        proficiencyLevel = "novice"
      } else if (averageScore < 40) {
        proficiencyLevel = "learning"
      } else if (averageScore < 60) {
        proficiencyLevel = "practicing"
      } else if (averageScore < 80) {
        proficiencyLevel = "proficient"
      } else {
        proficiencyLevel = "expert"
      }

      // Calculate improvement trend
      // Requires at least 6 sessions to avoid overlapping data slices
      let improvementTrend: PatternProficiency["improvementTrend"] = "not_enough_data"
      if (sessions.length >= 6) {
        const midpoint = Math.floor(sessions.length / 2)
        const recentSessions = sortedSessions.slice(0, midpoint)
        const olderSessions = sortedSessions.slice(midpoint)
        const recentAvg =
          recentSessions.reduce((sum, s) => sum + s.score, 0) / recentSessions.length
        const olderAvg = olderSessions.reduce((sum, s) => sum + s.score, 0) / olderSessions.length

        if (recentAvg > olderAvg + 10) {
          improvementTrend = "improving"
        } else if (recentAvg < olderAvg - 10) {
          improvementTrend = "declining"
        } else {
          improvementTrend = "stable"
        }
      } else if (sessions.length >= 3) {
        // For 3-5 sessions, provide a simpler trend based on first vs last
        const firstScore = sortedSessions[sortedSessions.length - 1].score
        const lastScore = sortedSessions[0].score
        if (lastScore > firstScore + 15) {
          improvementTrend = "improving"
        } else if (lastScore < firstScore - 15) {
          improvementTrend = "declining"
        } else {
          improvementTrend = "stable"
        }
      }

      proficiencies.push({
        pattern,
        problemsAttempted,
        problemsSolved,
        averageScore,
        lastPracticed,
        proficiencyLevel,
        improvementTrend,
      })
    }

    return proficiencies.sort((a, b) => b.problemsAttempted - a.problemsAttempted)
  }

  /**
   * Calculate difficulty performance
   */
  private calculateDifficultyPerformance(analyses: SessionAnalysis[]) {
    const byDifficulty = {
      easy: analyses.filter((a) => a.difficulty === "easy"),
      medium: analyses.filter((a) => a.difficulty === "medium"),
      hard: analyses.filter((a) => a.difficulty === "hard"),
    }

    return {
      easy: {
        attempted: byDifficulty.easy.length,
        avgScore:
          byDifficulty.easy.length > 0
            ? byDifficulty.easy.reduce((sum, a) => sum + a.score, 0) / byDifficulty.easy.length
            : 0,
      },
      medium: {
        attempted: byDifficulty.medium.length,
        avgScore:
          byDifficulty.medium.length > 0
            ? byDifficulty.medium.reduce((sum, a) => sum + a.score, 0) / byDifficulty.medium.length
            : 0,
      },
      hard: {
        attempted: byDifficulty.hard.length,
        avgScore:
          byDifficulty.hard.length > 0
            ? byDifficulty.hard.reduce((sum, a) => sum + a.score, 0) / byDifficulty.hard.length
            : 0,
      },
    }
  }

  /**
   * Calculate overall trend
   */
  private calculateTrend(analyses: SessionAnalysis[]): "improving" | "stable" | "declining" {
    if (analyses.length < 5) return "stable"

    const sorted = [...analyses].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const recent = sorted.slice(0, 5).reduce((sum, a) => sum + a.score, 0) / 5
    const older = sorted.slice(-5).reduce((sum, a) => sum + a.score, 0) / 5

    if (recent > older + 10) return "improving"
    if (recent < older - 10) return "declining"
    return "stable"
  }

  /**
   * Calculate weekly progress
   */
  private calculateWeeklyProgress(analyses: SessionAnalysis[]): number[] {
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000

    return [0, 1, 2, 3]
      .map((weekOffset) => {
        const weekStart = now - (weekOffset + 1) * weekMs
        const weekEnd = now - weekOffset * weekMs

        const weekSessions = analyses.filter(
          (a) => a.timestamp.getTime() >= weekStart && a.timestamp.getTime() < weekEnd
        )

        return weekSessions.length > 0
          ? weekSessions.reduce((sum, a) => sum + a.score, 0) / weekSessions.length
          : 0
      })
      .reverse()
  }

  /**
   * Identify strengths and weaknesses
   */
  private identifyStrengthsWeaknesses(proficiencies: PatternProficiency[]): {
    strengths: DSAPattern[]
    weaknesses: DSAPattern[]
  } {
    const withEnoughData = proficiencies.filter((p) => p.problemsAttempted >= 3)

    const strengths = withEnoughData
      .filter((p) => p.averageScore >= 70 && p.proficiencyLevel !== "novice")
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3)
      .map((p) => p.pattern)

    const weaknesses = withEnoughData
      .filter((p) => p.averageScore < 60 || p.improvementTrend === "declining")
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 3)
      .map((p) => p.pattern)

    return { strengths, weaknesses }
  }

  /**
   * Generate focus areas
   */
  private generateFocusAreas(
    proficiencies: PatternProficiency[],
    difficultyPerformance: UserPerformanceProfile["difficultyPerformance"]
  ): string[] {
    const areas: string[] = []

    // Pattern-based focus areas
    const needsWork = proficiencies.filter((p) => p.problemsAttempted >= 2 && p.averageScore < 60)
    if (needsWork.length > 0) {
      areas.push(`Improve ${needsWork[0].pattern} pattern understanding`)
    }

    // Difficulty-based focus areas
    if (difficultyPerformance.medium.avgScore < 50) {
      areas.push("Focus on medium difficulty problems")
    } else if (difficultyPerformance.hard.attempted < 3) {
      areas.push("Challenge yourself with hard problems")
    }

    // Consistency focus
    const notRecentlyPracticed = proficiencies.filter((p) => {
      if (!p.lastPracticed) return true
      const daysSince = (Date.now() - p.lastPracticed.getTime()) / (24 * 60 * 60 * 1000)
      return daysSince > 14 && p.proficiencyLevel !== "expert"
    })
    if (notRecentlyPracticed.length > 0) {
      areas.push(`Review ${notRecentlyPracticed[0].pattern} (not practiced recently)`)
    }

    return areas.slice(0, 4)
  }

  /**
   * Calculate preferred session length
   */
  private calculatePreferredSessionLength(analyses: SessionAnalysis[]): number {
    if (analyses.length < 3) return 45

    const successfulSessions = analyses.filter((a) => a.score >= 70)
    if (successfulSessions.length === 0) return 45

    const avgDuration =
      successfulSessions.reduce((sum, a) => sum + a.duration, 0) / successfulSessions.length
    return Math.round(avgDuration / 60) // Convert to minutes
  }

  /**
   * Analyze best performance time
   */
  private analyzeBestPerformanceTime(analyses: SessionAnalysis[]): string {
    if (analyses.length < 5) return "any"

    const byTimeOfDay = {
      morning: [] as number[], // 6-12
      afternoon: [] as number[], // 12-18
      evening: [] as number[], // 18-24
      night: [] as number[], // 0-6
    }

    for (const analysis of analyses) {
      const hour = analysis.timestamp.getHours()
      if (hour >= 6 && hour < 12) byTimeOfDay.morning.push(analysis.score)
      else if (hour >= 12 && hour < 18) byTimeOfDay.afternoon.push(analysis.score)
      else if (hour >= 18 && hour < 24) byTimeOfDay.evening.push(analysis.score)
      else byTimeOfDay.night.push(analysis.score)
    }

    const averages = Object.entries(byTimeOfDay)
      .filter(([, scores]) => scores.length >= 3)
      .map(([time, scores]) => ({
        time,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.avg - a.avg)

    return averages.length > 0 ? averages[0].time : "any"
  }

  /**
   * Analyze learning pace
   */
  private analyzeLearningPace(analyses: SessionAnalysis[]): "slow" | "moderate" | "fast" {
    if (analyses.length < 10) return "moderate"

    // Calculate average improvement rate per pattern
    const improvements = this.calculatePatternProficiency(analyses).filter(
      (p) => p.improvementTrend !== "not_enough_data"
    )

    const improvingCount = improvements.filter((p) => p.improvementTrend === "improving").length
    const totalWithData = improvements.length

    if (totalWithData === 0) return "moderate"

    const improvementRate = improvingCount / totalWithData
    if (improvementRate > 0.6) return "fast"
    if (improvementRate < 0.3) return "slow"
    return "moderate"
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(userId: string): Promise<PersonalizedRecommendation[]> {
    const profile = await this.getPerformanceProfile(userId)
    const recommendations: PersonalizedRecommendation[] = []

    // Weakness-based recommendations
    for (const weakness of profile.weaknesses.slice(0, 2)) {
      recommendations.push({
        type: "practice",
        priority: "high",
        pattern: weakness,
        difficulty: "easy",
        reason: `Your ${weakness} scores need improvement`,
        estimatedBenefit: "Build stronger foundation in this pattern",
      })
    }

    // Review recommendations for declining patterns
    const declining = profile.patternProficiency.filter((p) => p.improvementTrend === "declining")
    for (const pattern of declining.slice(0, 1)) {
      recommendations.push({
        type: "review",
        priority: "high",
        pattern: pattern.pattern,
        reason: `Your ${pattern.pattern} performance is declining`,
        estimatedBenefit: "Prevent skill regression",
      })
    }

    // Challenge recommendations for strong areas
    if (profile.strengths.length > 0 && profile.difficultyPerformance.hard.attempted < 5) {
      recommendations.push({
        type: "challenge",
        priority: "medium",
        pattern: profile.strengths[0],
        difficulty: "hard",
        reason: `You're strong at ${profile.strengths[0]} - challenge yourself`,
        estimatedBenefit: "Develop advanced problem-solving skills",
      })
    }

    // Rest recommendation if practicing a lot
    if (profile.weeklyProgress.slice(-1)[0] > 0 && profile.totalPracticeHours > 50) {
      recommendations.push({
        type: "rest",
        priority: "low",
        reason: "You've been practicing consistently - consider a break",
        estimatedBenefit: "Mental recovery improves retention",
      })
    }

    return recommendations
  }

  /**
   * Store performance embedding for similarity matching
   */
  private async storePerformanceEmbedding(profile: UserPerformanceProfile): Promise<void> {
    try {
      // Create text representation of profile for embedding
      const profileText = `
User performance profile:
Average score: ${profile.averageScore}
Total sessions: ${profile.totalSessions}
Strengths: ${profile.strengths.join(", ")}
Weaknesses: ${profile.weaknesses.join(", ")}
Learning pace: ${profile.learningPace}
Trend: ${profile.recentTrend}
Pattern proficiencies: ${profile.patternProficiency.map((p) => `${p.pattern}:${p.proficiencyLevel}`).join(", ")}
      `.trim()

      const embedding = await this.embeddingProvider.generateEmbedding(profileText)

      const vectorDoc: VectorDocument = {
        id: `user-performance-${profile.userId}`,
        vector: embedding,
        text: profileText,
        metadata: {
          type: "user-performance",
          userId: profile.userId,
          user_id: profile.userId,
          averageScore: profile.averageScore,
          totalSessions: profile.totalSessions,
          strengths: profile.strengths,
          weaknesses: profile.weaknesses,
          learningPace: profile.learningPace,
          timestamp: new Date().toISOString(),
        },
      }

      await vectorDB.upsert([vectorDoc])
    } catch (error) {
      console.error("[UserPerformanceRAG] Error storing performance embedding:", error)
    }
  }

  /**
   * Find users with similar performance profiles
   */
  async findSimilarUsers(userId: string, limit: number = 5): Promise<string[]> {
    try {
      const profile = await this.getPerformanceProfile(userId)

      const profileText = `
Average score: ${profile.averageScore}
Strengths: ${profile.strengths.join(", ")}
Weaknesses: ${profile.weaknesses.join(", ")}
Learning pace: ${profile.learningPace}
      `.trim()

      const embedding = await this.embeddingProvider.generateEmbedding(profileText)

      const results = await vectorDB.query(embedding, {
        topK: limit + 1,
        filter: {
          type: "user-performance",
          excludeIds: [`user-performance-${userId}`],
        },
        includeMetadata: true,
      })

      return results
        .filter((r) => r.metadata?.userId !== userId)
        .map((r) => r.metadata?.userId as string)
        .filter(Boolean)
    } catch (error) {
      console.error("[UserPerformanceRAG] Error finding similar users:", error)
      return []
    }
  }

  /**
   * Save profile to Firestore
   */
  private async saveProfile(profile: UserPerformanceProfile): Promise<void> {
    await adminDb
      .collection("user_performance_profiles")
      .doc(profile.userId)
      .set({
        ...profile,
        lastUpdated: Timestamp.fromDate(profile.lastUpdated),
        patternProficiency: profile.patternProficiency.map((p) => ({
          ...p,
          lastPracticed: p.lastPracticed ? Timestamp.fromDate(p.lastPracticed) : null,
        })),
      })
  }

  /**
   * Convert Firestore data to profile
   */
  private dataToProfile(data: Record<string, unknown>, userId: string): UserPerformanceProfile {
    return {
      userId,
      lastUpdated: (data.lastUpdated as Timestamp).toDate(),
      totalSessions: data.totalSessions as number,
      completedSessions: data.completedSessions as number,
      averageScore: data.averageScore as number,
      totalPracticeHours: data.totalPracticeHours as number,
      patternProficiency: (data.patternProficiency as Record<string, unknown>[]).map((p) => ({
        ...p,
        lastPracticed: p.lastPracticed ? (p.lastPracticed as Timestamp).toDate() : null,
      })) as PatternProficiency[],
      difficultyPerformance:
        data.difficultyPerformance as UserPerformanceProfile["difficultyPerformance"],
      recentTrend: data.recentTrend as "improving" | "stable" | "declining",
      weeklyProgress: data.weeklyProgress as number[],
      strengths: data.strengths as DSAPattern[],
      weaknesses: data.weaknesses as DSAPattern[],
      focusAreas: data.focusAreas as string[],
      preferredSessionLength: data.preferredSessionLength as number,
      bestPerformanceTime: data.bestPerformanceTime as string,
      learningPace: data.learningPace as "slow" | "moderate" | "fast",
    }
  }

  /**
   * Create empty profile for new users
   */
  private createEmptyProfile(userId: string): UserPerformanceProfile {
    return {
      userId,
      lastUpdated: new Date(),
      totalSessions: 0,
      completedSessions: 0,
      averageScore: 0,
      totalPracticeHours: 0,
      patternProficiency: [],
      difficultyPerformance: {
        easy: { attempted: 0, avgScore: 0 },
        medium: { attempted: 0, avgScore: 0 },
        hard: { attempted: 0, avgScore: 0 },
      },
      recentTrend: "stable",
      weeklyProgress: [0, 0, 0, 0],
      strengths: [],
      weaknesses: [],
      focusAreas: ["Start practicing to build your profile!"],
      preferredSessionLength: 45,
      bestPerformanceTime: "any",
      learningPace: "moderate",
    }
  }
}

/**
 * Singleton instance
 */
let performanceRAGInstance: UserPerformanceRAG | null = null

export function getUserPerformanceRAG(): UserPerformanceRAG {
  if (!performanceRAGInstance) {
    performanceRAGInstance = new UserPerformanceRAG()
  }
  return performanceRAGInstance
}

/**
 * Convenience functions
 */
export async function getUserPerformanceProfile(userId: string): Promise<UserPerformanceProfile> {
  return getUserPerformanceRAG().getPerformanceProfile(userId)
}

export async function getUserRecommendations(
  userId: string
): Promise<PersonalizedRecommendation[]> {
  return getUserPerformanceRAG().getRecommendations(userId)
}
