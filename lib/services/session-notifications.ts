/**
 * Session Notifications Service
 *
 * Triggers smart notifications after session completion.
 * This is the missing "last mile" that connects notification logic to user actions.
 *
 * Kept notification types (high value):
 * - spaced_repetition_review (handled by cron)
 * - streak_maintenance
 * - interview_countdown (handled by cron)
 * - weak_pattern_focus
 * - milestone_celebration
 * - daily_practice_reminder
 *
 * Removed notification types (low value or redundant):
 * - pattern_decay_alert (redundant with spaced_repetition_review)
 * - optimal_review_time (complex, marginal value)
 * - rest_reminder (patronizing)
 * - roadmap_behind (handled by cron)
 */

import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import {
  createInAppNotificationServer,
  getNotificationPreferencesServer,
  shouldSendNotificationServer,
  recordNotificationSentServer,
} from "@/lib/notification-helpers-server"
import { detectMilestones, generateNotificationMessage } from "@/lib/services/notification-service"
import {
  getNotificationByType,
  type NotificationType,
} from "@/lib/rag/knowledge-base/notification-knowledge"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

export interface SessionCompletionData {
  userId: string
  problemId: string
  scenarioId: string
  pattern: DSAPattern
  performanceScore: number
  masteryScore: number
  timeSpentMinutes: number
  hintsUsed: number
  streakDays: number
  problemsSolvedTotal: number
  isNewProblem: boolean
}

interface PatternStats {
  pattern: string
  totalAttempts: number
  avgScore: number
  lastScore: number
  daysSincePractice: number
}

/**
 * Trigger session-based notifications after practice completion.
 * Called from the spaced-repetition/complete endpoint.
 */
export async function triggerSessionNotifications(data: SessionCompletionData): Promise<void> {
  try {
    // Get previous stats for milestone detection
    const previousStats = await getPreviousStats(data.userId)

    // Current stats after this session
    const currentStats = {
      problemsSolved: data.problemsSolvedTotal,
      patternsCompleted: previousStats.patternsCompleted, // Will update below if pattern mastered
      streakDays: data.streakDays,
    }

    // Check for milestones
    const milestones = detectMilestones(previousStats, currentStats)

    // Get weak patterns for this user
    const weakPatterns = await getWeakPatterns(data.userId)

    // Build and send notifications
    const notifications: Array<{ type: NotificationType; variables: Record<string, any> }> = []

    // 1. Milestone celebrations (immediate feedback)
    for (const milestone of milestones) {
      if (milestone.type === "problems_solved") {
        notifications.push({
          type: "milestone_celebration",
          variables: {
            milestoneType: "problems",
            problemCount: milestone.value,
            pattern: data.pattern,
          },
        })
      } else if (milestone.type === "streak") {
        notifications.push({
          type: "milestone_celebration",
          variables: {
            milestoneType: "streak",
            streakDays: milestone.value,
          },
        })
      } else if (milestone.type === "pattern_mastered") {
        notifications.push({
          type: "milestone_celebration",
          variables: {
            milestoneType: "pattern",
            pattern: milestone.value,
          },
        })
      }
    }

    // 2. Weak pattern focus (if they just practiced a weak pattern, encourage continuation)
    const justPracticedWeakPattern = weakPatterns.find((p) => p.pattern === data.pattern)
    if (justPracticedWeakPattern && data.performanceScore < 70) {
      // They struggled - queue a weak pattern notification for next session
      await queueWeakPatternReminder(data.userId, data.pattern, justPracticedWeakPattern)
    }

    // 3. If there's a different weak pattern they haven't touched in 3+ days, suggest it
    const neglectedWeakPattern = weakPatterns.find(
      (p) => p.pattern !== data.pattern && p.daysSincePractice >= 3
    )
    if (neglectedWeakPattern) {
      notifications.push({
        type: "weak_pattern_focus",
        variables: {
          pattern: neglectedWeakPattern.pattern,
          successRate: Math.round(neglectedWeakPattern.avgScore),
          daysSincePractice: neglectedWeakPattern.daysSincePractice,
          currentLevel: getPatternLevel(neglectedWeakPattern.avgScore),
          targetLevel: "Intermediate",
        },
      })
    }

    // Send all notifications
    for (const notification of notifications) {
      await sendSessionNotification(data.userId, notification.type, notification.variables)
    }

    // Update stats cache for next comparison
    await updateStatsCache(data.userId, currentStats)
  } catch (error) {
    // Don't fail the session completion if notifications fail
    logger.error("Failed to trigger session notifications", { error, userId: data.userId })
  }
}

/**
 * Check if user's streak is at risk and send notification.
 * Called from a cron job or dashboard load.
 */
export async function checkStreakAtRisk(userId: string): Promise<boolean> {
  try {
    const learningStateDoc = await adminDb.collection("user_learning_state").doc(userId).get()
    const learningState = learningStateDoc.data()

    if (!learningState) return false

    const streakDays = learningState.streak_days || 0
    const lastPracticeDate = learningState.last_session_at

    // No streak to protect
    if (streakDays < 3) return false

    // Get user's timezone from preferences
    const prefs = await getNotificationPreferencesServer(userId)
    const userTimezone = prefs.timezone || "America/Los_Angeles"

    // Get current hour in user's timezone
    const now = new Date()
    let currentHour: number
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimezone,
        hour: "numeric",
        hour12: false,
      })
      currentHour = parseInt(formatter.format(now), 10)
    } catch {
      // Fallback to UTC if timezone is invalid
      currentHour = now.getUTCHours()
    }

    // Check if they've practiced today (in user's timezone)
    let todayInUserTz: string
    try {
      const dateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: userTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      todayInUserTz = dateFormatter.format(now)
    } catch {
      todayInUserTz = now.toISOString().split("T")[0]
    }

    if (lastPracticeDate?.split("T")[0] === todayInUserTz) return false

    // Check if it's evening (after 7 PM in user's local time)
    if (currentHour < 19) return false

    const hoursRemaining = 24 - currentHour

    // Send streak at risk notification
    await sendSessionNotification(userId, "streak_maintenance", {
      streakDays,
      hoursRemaining,
    })

    return true
  } catch (error) {
    logger.error("Failed to check streak at risk", { error, userId })
    return false
  }
}

/**
 * Send a daily practice reminder if user hasn't practiced.
 * Called from a cron job.
 */
export async function sendDailyReminderIfNeeded(userId: string): Promise<boolean> {
  try {
    const learningStateDoc = await adminDb.collection("user_learning_state").doc(userId).get()
    const learningState = learningStateDoc.data()

    if (!learningState) return false

    // Check if they've practiced today
    const today = new Date().toISOString().split("T")[0]
    const lastPracticeDate = learningState.last_session_at

    if (lastPracticeDate?.split("T")[0] === today) return false

    const streakDays = learningState.streak_days || 0

    await sendSessionNotification(userId, "daily_practice_reminder", {
      streakDays,
      todayPattern: "your next challenge",
      problemCount: 3,
      estimatedTime: 30,
    })

    return true
  } catch (error) {
    logger.error("Failed to send daily reminder", { error, userId })
    return false
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getPreviousStats(userId: string): Promise<{
  problemsSolved: number
  patternsCompleted: string[]
  streakDays: number
}> {
  try {
    // Check for cached stats
    const cacheDoc = await adminDb.collection("notification_stats_cache").doc(userId).get()
    if (cacheDoc.exists) {
      const data = cacheDoc.data()
      return {
        problemsSolved: data?.problemsSolved || 0,
        patternsCompleted: data?.patternsCompleted || [],
        streakDays: data?.streakDays || 0,
      }
    }

    // Build from scratch if no cache
    const problemsSnapshot = await adminDb
      .collection("problem_mastery")
      .doc(userId)
      .collection("problems")
      .get()

    const problemsSolved = problemsSnapshot.size

    // Get patterns where user has expert level
    const masteredPatterns: string[] = []
    problemsSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.mastery_level === "expert" && !masteredPatterns.includes(data.pattern)) {
        masteredPatterns.push(data.pattern)
      }
    })

    const learningStateDoc = await adminDb.collection("user_learning_state").doc(userId).get()
    const streakDays = learningStateDoc.data()?.streak_days || 0

    return {
      problemsSolved,
      patternsCompleted: masteredPatterns,
      streakDays,
    }
  } catch {
    return { problemsSolved: 0, patternsCompleted: [], streakDays: 0 }
  }
}

async function updateStatsCache(
  userId: string,
  stats: { problemsSolved: number; patternsCompleted: string[]; streakDays: number }
): Promise<void> {
  try {
    await adminDb
      .collection("notification_stats_cache")
      .doc(userId)
      .set(
        {
          ...stats,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
  } catch (error) {
    logger.error("Failed to update stats cache", { error, userId })
  }
}

async function getWeakPatterns(userId: string): Promise<PatternStats[]> {
  try {
    const problemsSnapshot = await adminDb
      .collection("problem_mastery")
      .doc(userId)
      .collection("problems")
      .get()

    const patternStatsMap = new Map<
      string,
      {
        totalScore: number
        count: number
        lastScore: number
        lastPracticeDate: Date
      }
    >()

    problemsSnapshot.forEach((doc) => {
      const data = doc.data()
      const pattern = data.pattern
      const score = data.performance_score || 0
      const lastReviewed = new Date(data.last_reviewed_at)

      const existing = patternStatsMap.get(pattern)
      if (existing) {
        existing.totalScore += score
        existing.count++
        if (lastReviewed > existing.lastPracticeDate) {
          existing.lastScore = score
          existing.lastPracticeDate = lastReviewed
        }
      } else {
        patternStatsMap.set(pattern, {
          totalScore: score,
          count: 1,
          lastScore: score,
          lastPracticeDate: lastReviewed,
        })
      }
    })

    const now = Date.now()
    const weakPatterns: PatternStats[] = []

    patternStatsMap.forEach((stats, pattern) => {
      const avgScore = stats.totalScore / stats.count
      const daysSincePractice = Math.floor(
        (now - stats.lastPracticeDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Consider weak if avg score < 60% or hasn't been practiced in 5+ days with < 75%
      if (avgScore < 60 || (daysSincePractice >= 5 && avgScore < 75)) {
        weakPatterns.push({
          pattern,
          totalAttempts: stats.count,
          avgScore,
          lastScore: stats.lastScore,
          daysSincePractice,
        })
      }
    })

    // Sort by worst performing first
    return weakPatterns.sort((a, b) => a.avgScore - b.avgScore)
  } catch {
    return []
  }
}

async function queueWeakPatternReminder(
  userId: string,
  pattern: string,
  stats: PatternStats
): Promise<void> {
  // Store a reminder to send next time they're active
  try {
    await adminDb.collection("notification_queue").add({
      userId,
      type: "weak_pattern_focus",
      triggerData: {
        pattern,
        successRate: Math.round(stats.avgScore),
        currentLevel: getPatternLevel(stats.avgScore),
        targetLevel: "Intermediate",
      },
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      priority: "high",
      status: "pending",
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error("Failed to queue weak pattern reminder", { error, userId, pattern })
  }
}

function getPatternLevel(avgScore: number): string {
  if (avgScore >= 85) return "Expert"
  if (avgScore >= 70) return "Intermediate"
  if (avgScore >= 50) return "Beginner"
  return "Novice"
}

function getNotificationLink(type: NotificationType, variables: Record<string, any>): string {
  switch (type) {
    case "weak_pattern_focus":
      return `/practice?pattern=${encodeURIComponent(variables.pattern || "")}`
    case "milestone_celebration":
      return "/dashboard"
    case "streak_maintenance":
    case "daily_practice_reminder":
      return "/practice"
    default:
      return "/dashboard"
  }
}

async function sendSessionNotification(
  userId: string,
  type: NotificationType,
  variables: Record<string, any>
): Promise<boolean> {
  try {
    const knowledge = getNotificationByType(type)
    if (!knowledge) {
      logger.warn("Unknown notification type", { type })
      return false
    }

    // Check rate limits and user preferences
    const { shouldSend, reason } = await shouldSendNotificationServer(
      userId,
      type,
      knowledge.frequency.cooldownAfterDismiss,
      knowledge.frequency.maxPerDay
    )

    if (!shouldSend) {
      logger.debug("Notification blocked", { type, reason, userId })
      return false
    }

    // Check user preferences
    const prefs = await getNotificationPreferencesServer(userId)
    if (!prefs.enabled) return false
    if (!prefs.typePreferences[type]?.enabled) return false

    // Generate message
    const { title, body } = generateNotificationMessage(knowledge, variables)

    // Create in-app notification
    await createInAppNotificationServer({
      userId,
      type,
      title,
      body,
      link: getNotificationLink(type, variables),
      read: false,
    })

    // Record for analytics
    await recordNotificationSentServer(userId, type)

    logger.info("Session notification sent", { userId, type, title })
    return true
  } catch (error) {
    logger.error("Failed to send session notification", { error, userId, type })
    return false
  }
}
