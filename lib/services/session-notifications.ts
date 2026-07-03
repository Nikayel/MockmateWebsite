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
import { reconcileStreak } from "@/lib/spaced-repetition/streak"
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
import { isToday } from "@/lib/email/timezone"

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

    // Check if current session mastered a new pattern
    // A pattern is considered mastered when: high mastery score (85+) and reviewed multiple times
    const currentPatternMastered = await checkIfPatternJustMastered(data.userId, data.pattern)

    // Current stats after this session
    const currentStats = {
      problemsSolved: data.problemsSolvedTotal,
      patternsCompleted:
        currentPatternMastered && !previousStats.patternsCompleted.includes(data.pattern)
          ? [...previousStats.patternsCompleted, data.pattern]
          : previousStats.patternsCompleted,
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
        // Calculate total mastered and next pattern for the notification
        const totalMastered = currentStats.patternsCompleted.length
        const nextPattern = getNextPattern(currentStats.patternsCompleted)

        notifications.push({
          type: "milestone_celebration",
          variables: {
            milestoneType: "pattern",
            pattern: milestone.value,
            totalMastered,
            nextPattern,
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
 *
 * IMPORTANT: Uses timezone-aware date comparison to correctly determine
 * if the user has practiced "today" in their local timezone.
 */
export async function checkStreakAtRisk(userId: string): Promise<boolean> {
  try {
    const learningStateDoc = await adminDb.collection("user_learning_state").doc(userId).get()
    const learningState = learningStateDoc.data()

    if (!learningState) return false

    const storedStreak = learningState.streak_days || 0
    const lastSessionAt = learningState.last_session_at

    // No streak to protect (cheap exit before the timezone fetch; effective <= stored).
    if (storedStreak < 3) return false

    // Get user's timezone from preferences
    const prefs = await getNotificationPreferencesServer(userId)
    const userTimezone = prefs.timezone || "America/Los_Angeles"

    // Get current hour in user's timezone
    const now = new Date()

    // Reconcile the stored streak against the last session: if it's already broken (missed > 1 day),
    // there is nothing "at risk" and we must not message a stale count. (chore #4)
    const streakDays = reconcileStreak(storedStreak, lastSessionAt, userTimezone, now)
    if (streakDays < 3) return false
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

    // Check if they've practiced today using timezone-aware comparison
    // FIXED: Previously compared UTC date portion to user's local date (bug!)
    if (isToday(lastSessionAt, userTimezone)) return false

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
 *
 * IMPORTANT: Uses timezone-aware date comparison.
 */
export async function sendDailyReminderIfNeeded(userId: string): Promise<boolean> {
  try {
    const learningStateDoc = await adminDb.collection("user_learning_state").doc(userId).get()
    const learningState = learningStateDoc.data()

    if (!learningState) return false

    // Get user's timezone for accurate "today" check
    const prefs = await getNotificationPreferencesServer(userId)
    const userTimezone = prefs.timezone || "America/Los_Angeles"

    // Check if they've practiced today (in THEIR timezone)
    const lastSessionAt = learningState.last_session_at

    // FIXED: Previously used UTC date comparison
    if (isToday(lastSessionAt, userTimezone)) return false

    // Reconcile so a broken streak reads as 0 ("start a new streak") instead of a stale count. (chore #4)
    const streakDays = reconcileStreak(
      learningState.streak_days,
      lastSessionAt,
      userTimezone,
      new Date()
    )

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

    // Get patterns where user has mastered at least MIN_PROBLEMS_FOR_PATTERN_MASTERY problems
    // This must be consistent with checkIfPatternJustMastered
    const MIN_PROBLEMS_FOR_PATTERN_MASTERY = 3
    const patternMasteryCount = new Map<string, number>()

    problemsSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.mastery_level === "mastered") {
        const count = patternMasteryCount.get(data.pattern) || 0
        patternMasteryCount.set(data.pattern, count + 1)
      }
    })

    const masteredPatterns: string[] = []
    patternMasteryCount.forEach((count, pattern) => {
      if (count >= MIN_PROBLEMS_FOR_PATTERN_MASTERY) {
        masteredPatterns.push(pattern)
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

/**
 * Check if a pattern was just mastered by the user in this session
 * A pattern is mastered when the user has mastered at least 3 problems in that pattern
 * (or all problems if there are fewer than 3 available)
 */
async function checkIfPatternJustMastered(userId: string, pattern: string): Promise<boolean> {
  try {
    // Count mastered problems in this pattern
    const masteredSnapshot = await adminDb
      .collection("problem_mastery")
      .doc(userId)
      .collection("problems")
      .where("pattern", "==", pattern)
      .where("mastery_level", "==", "mastered")
      .get()

    const masteredCount = masteredSnapshot.size

    // Require at least 3 mastered problems to consider a pattern mastered
    // This prevents triggering pattern mastery notification for a single question
    const MIN_PROBLEMS_FOR_PATTERN_MASTERY = 3

    return masteredCount >= MIN_PROBLEMS_FOR_PATTERN_MASTERY
  } catch {
    return false
  }
}

/**
 * Get the next pattern the user should work on based on the roadmap
 */
function getNextPattern(completedPatterns: string[]): string {
  // Import the roadmap order
  const roadmapOrder = [
    "arrays-hashing",
    "two-pointers",
    "stack",
    "binary-search",
    "sliding-window",
    "linked-list",
    "trees",
    "heap",
    "trie",
    "backtracking",
    "graphs",
    "dp-1d",
    "dp-2d",
    "greedy",
    "intervals",
    "bit-manipulation",
    "math-geometry",
  ]

  // Find first pattern not yet completed
  for (const pattern of roadmapOrder) {
    if (!completedPatterns.includes(pattern)) {
      return pattern
    }
  }

  return "advanced patterns"
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

    // Generate message with appropriate tone based on notification type
    const toneForType: Record<
      string,
      "motivational" | "informative" | "urgent" | "celebratory" | "supportive"
    > = {
      milestone_celebration: "celebratory",
      streak_maintenance: "urgent",
      weak_pattern_focus: "supportive",
      daily_practice_reminder: "motivational",
    }
    const preferredTone = toneForType[type] || "informative"
    const { title, body } = generateNotificationMessage(knowledge, variables, preferredTone)

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
