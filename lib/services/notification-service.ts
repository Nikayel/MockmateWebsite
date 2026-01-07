/**
 * Notification Service
 *
 * Core business logic for the notification system.
 * Evaluates triggers, generates messages, and orchestrates delivery.
 *
 * Uses the notification knowledge base for:
 * - Message templates
 * - Timing optimization
 * - Frequency limits
 * - Scientific basis for spaced repetition
 */

import {
  NOTIFICATION_KNOWLEDGE,
  SPACED_REPETITION_SCHEDULES,
  getNotificationByType,
  getReviewSchedule,
  type NotificationType,
  type NotificationKnowledge,
} from "@/lib/rag/knowledge-base/notification-knowledge"
import {
  getNotificationPreferences,
  createNotification,
  createInAppNotification,
  addToNotificationQueue,
  shouldSendNotification,
  recordNotificationSent,
  getRecentNotificationsByType,
} from "@/lib/notification-helpers"
import type {
  Notification,
  NotificationTriggerContext,
  NotificationSendResult,
  NotificationChannel,
  InAppNotification,
} from "@/lib/types/notifications"
import {
  sendSpacedRepetitionEmail,
  sendMilestoneEmail,
  sendInactivityEmail,
  sendInterviewCountdownEmail,
  sendDailyRoadmapEmail,
} from "@/lib/email/notifications"

// ============================================================================
// MESSAGE GENERATION
// ============================================================================

/**
 * Generate personalized notification message from template
 */
export function generateNotificationMessage(
  knowledge: NotificationKnowledge,
  variables: Record<string, string | number>,
  preferredTone:
    | "motivational"
    | "informative"
    | "urgent"
    | "celebratory"
    | "supportive" = "informative"
): { title: string; body: string } {
  // Find template with preferred tone, or fall back to first available
  const template =
    knowledge.messageTemplates.find((t) => t.tone === preferredTone) ||
    knowledge.messageTemplates[0]

  if (!template) {
    return {
      title: knowledge.name,
      body: knowledge.description,
    }
  }

  // Replace variables in template
  let body = template.template
  for (const [key, value] of Object.entries(variables)) {
    body = body.replace(new RegExp(`{${key}}`, "g"), String(value))
  }

  // Generate title based on type
  const titles: Record<NotificationType, string> = {
    welcome: "Welcome to CodeSparring!",
    spaced_repetition_review: "Time to Review",
    pattern_decay_alert: "Pattern Needs Attention",
    daily_practice_reminder: "Daily Practice",
    streak_maintenance: "Keep Your Streak!",
    interview_countdown: "Interview Countdown",
    milestone_celebration: "Achievement Unlocked!",
    weak_pattern_focus: "Focus Area",
    roadmap_behind: "Roadmap Update",
    optimal_review_time: "Perfect Timing",
    new_challenge_unlock: "New Challenge",
    rest_reminder: "Rest Reminder",
    mock_interview_due: "Mock Interview Due",
  }

  return {
    title: titles[knowledge.type] || knowledge.name,
    body,
  }
}

// ============================================================================
// TRIGGER EVALUATION
// ============================================================================

/**
 * Evaluate all triggers for a user and return notifications to send
 */
export async function evaluateTriggers(
  context: NotificationTriggerContext
): Promise<
  Array<{
    type: NotificationType
    variables: Record<string, any>
    priority: "critical" | "high" | "medium" | "low"
  }>
> {
  const notifications: Array<{
    type: NotificationType
    variables: Record<string, any>
    priority: "critical" | "high" | "medium" | "low"
  }> = []

  // 1. Check spaced repetition reviews
  if (context.dueReviews && context.dueReviews.length > 0) {
    const topReview = context.dueReviews[0]
    notifications.push({
      type: "spaced_repetition_review",
      variables: {
        problemName: topReview.problemName,
        pattern: topReview.pattern,
        daysSince: Math.floor(
          (Date.now() - new Date(topReview.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        ),
        retention: Math.round(topReview.estimatedRetention * 100),
      },
      priority: "high",
    })
  }

  // 2. Check pattern decay
  if (context.patternProficiencies) {
    for (const [pattern, data] of Object.entries(context.patternProficiencies)) {
      if (data.trend === "declining" && data.level !== "novice") {
        notifications.push({
          type: "pattern_decay_alert",
          variables: {
            pattern,
            previousLevel: data.level,
            daysSince: data.daysSincePractice,
          },
          priority: "high",
        })
        break // Only one decay alert at a time
      }
    }
  }

  // 3. Check daily practice
  if (!context.todayPracticed && context.streakDays && context.streakDays > 0) {
    notifications.push({
      type: "daily_practice_reminder",
      variables: {
        streakDays: context.streakDays,
        todayPattern: "your next pattern",
        problemCount: 3,
        estimatedTime: 30,
      },
      priority: "medium",
    })
  }

  // 4. Check streak at risk (evening only - checked by timing later)
  if (!context.todayPracticed && context.streakDays && context.streakDays >= 3) {
    const now = new Date()
    const hoursLeft = 24 - now.getHours()

    if (hoursLeft <= 4) {
      notifications.push({
        type: "streak_maintenance",
        variables: {
          streakDays: context.streakDays,
          hoursRemaining: hoursLeft,
        },
        priority: "medium",
      })
    }
  }

  // 5. Check interview countdown
  if (context.interviewDate) {
    const daysUntil = Math.ceil(
      (new Date(context.interviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    const milestones = [30, 14, 7, 3, 1]
    if (milestones.includes(daysUntil)) {
      notifications.push({
        type: "interview_countdown",
        variables: {
          daysRemaining: daysUntil,
          companyName: context.targetCompany || "your target company",
          progressPercent: Math.round((context.roadmapProgress || 0) * 100),
          recommendation: getInterviewRecommendation(daysUntil, context.roadmapProgress || 0),
        },
        priority: "critical",
      })
    }
  }

  // 6. Check roadmap behind schedule
  if (
    context.roadmapProgress !== undefined &&
    context.expectedProgress !== undefined &&
    context.interviewDate
  ) {
    const behindBy = context.expectedProgress - context.roadmapProgress
    const daysRemaining = Math.ceil(
      (new Date(context.interviewDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    if (behindBy >= 0.15 && daysRemaining > 7) {
      notifications.push({
        type: "roadmap_behind",
        variables: {
          behindPercent: Math.round(behindBy * 100),
          daysRemaining,
          extraProblemsPerDay: Math.ceil((behindBy * 100) / daysRemaining),
          priorityPatterns: "your weak patterns",
        },
        priority: "high",
      })
    }
  }

  // 7. Check weak patterns
  if (context.patternProficiencies) {
    for (const [pattern, data] of Object.entries(context.patternProficiencies)) {
      if (data.lastScore < 50 && data.daysSincePractice > 3) {
        notifications.push({
          type: "weak_pattern_focus",
          variables: {
            pattern,
            successRate: data.lastScore,
            companyFrequency: 25, // Would need company data
            companyName: context.targetCompany || "top companies",
            currentLevel: data.level,
            targetLevel: "Intermediate",
          },
          priority: "high",
        })
        break
      }
    }
  }

  // 8. Check rest reminder
  if (context.practiceHoursToday && context.practiceHoursToday >= 3) {
    notifications.push({
      type: "rest_reminder",
      variables: {
        consecutiveDays: context.consecutivePracticeDays || 1,
      },
      priority: "medium",
    })
  }

  if (context.consecutivePracticeDays && context.consecutivePracticeDays >= 7) {
    notifications.push({
      type: "rest_reminder",
      variables: {
        consecutiveDays: context.consecutivePracticeDays,
      },
      priority: "medium",
    })
  }

  return notifications
}

/**
 * Get recommendation text based on days until interview
 */
function getInterviewRecommendation(daysUntil: number, progress: number): string {
  if (daysUntil <= 1) {
    return "Rest well and stay confident. Light review only if needed."
  }
  if (daysUntil <= 3) {
    return "Focus on confidence. Review your strongest patterns."
  }
  if (daysUntil <= 7) {
    return progress >= 0.8
      ? "Great progress! Focus on weak areas now."
      : "Prioritize must-know problems in your weak patterns."
  }
  if (daysUntil <= 14) {
    return "Good time to tackle harder problems and mock interviews."
  }
  return "Building strong foundations. Consistency is key!"
}

// ============================================================================
// NOTIFICATION SENDING
// ============================================================================

/**
 * Send a notification to a user
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  variables: Record<string, any>,
  priority: "critical" | "high" | "medium" | "low" = "medium"
): Promise<NotificationSendResult> {
  try {
    // Get notification knowledge
    const knowledge = getNotificationByType(type)
    if (!knowledge) {
      return { success: false, error: "Unknown notification type", channels: {} }
    }

    // Check if we should send
    const { shouldSend, reason } = await shouldSendNotification(
      userId,
      type,
      knowledge.frequency.cooldownAfterDismiss,
      knowledge.frequency.maxPerDay
    )

    if (!shouldSend) {
      return { success: false, error: `Blocked: ${reason}`, channels: {} }
    }

    // Get user preferences
    const prefs = await getNotificationPreferences(userId)

    // Determine channels
    const typePref = prefs.typePreferences[type]
    const channels: NotificationChannel[] = typePref?.channels || ["in_app"]

    // Generate message
    const { title, body } = generateNotificationMessage(knowledge, variables)

    // Create notification record
    const notification = await createNotification({
      userId,
      type,
      title,
      body,
      data: variables,
      scheduledFor: new Date().toISOString(),
      priority,
      channels,
      status: "pending",
    })

    const result: NotificationSendResult = {
      success: true,
      notificationId: notification.id,
      channels: {},
    }

    // Send to each channel
    for (const channel of channels) {
      if (!prefs.channels[channel]) continue

      switch (channel) {
        case "in_app":
          await createInAppNotification({
            userId,
            type,
            title,
            body,
            link: getNotificationLink(type, variables),
            read: false,
          })
          result.channels.in_app = { success: true }
          break

        case "push":
          // FCM would be implemented here
          // For now, mark as pending integration
          if (prefs.fcmToken) {
            result.channels.push = { success: false, error: "FCM not yet integrated" }
          }
          break

        case "email":
          // Send email based on notification type
          try {
            const emailResult = await sendNotificationEmail(
              type,
              prefs.userId || userId,
              title,
              body,
              variables
            )
            result.channels.email = emailResult
          } catch (emailError: any) {
            result.channels.email = {
              success: false,
              error: emailError.message || "Email sending failed",
            }
          }
          break
      }
    }

    // Record analytics
    await recordNotificationSent(userId, type)

    return result
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unknown error",
      channels: {},
    }
  }
}

/**
 * Send email notification based on type
 * Routes to the appropriate email template and sender
 */
async function sendNotificationEmail(
  type: NotificationType,
  userId: string,
  title: string,
  body: string,
  variables: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Get user email from Firestore
  const { adminDb } = await import("@/lib/firebase-admin")
  const profileDoc = await adminDb.collection("profiles").doc(userId).get()

  if (!profileDoc.exists) {
    return { success: false, error: "User profile not found" }
  }

  const profile = profileDoc.data()
  const email = profile?.email
  const userName = profile?.full_name || ""

  if (!email) {
    return { success: false, error: "User has no email address" }
  }

  try {
    let result: { success: boolean; messageId?: string; error?: string }

    switch (type) {
      case "spaced_repetition_review":
        result = await sendSpacedRepetitionEmail(email, {
          userName,
          userEmail: email,
          topic: variables.problemName || "your problem",
          pattern: variables.pattern || "DSA",
          daysSinceReview: variables.daysSince || 0,
          lastScore: variables.retention || 70,
          reviewCount: variables.reviewCount || 1,
          scenarioId: variables.problemId,
        })
        break

      case "milestone_celebration":
        result = await sendMilestoneEmail(email, {
          userName,
          userEmail: email,
          milestoneType:
            (variables.milestoneType as
              | "problems_solved"
              | "streak"
              | "pattern_mastered"
              | "first_session") || "problems_solved",
          milestoneValue: variables.problemCount || variables.streakDays || variables.pattern || 0,
        })
        break

      case "interview_countdown":
        result = await sendInterviewCountdownEmail(email, {
          userName,
          userEmail: email,
          targetCompany: variables.companyName || "your target company",
          daysUntilInterview: variables.daysRemaining || 7,
          questionsCompleted: variables.questionsCompleted || 0,
          totalQuestions: variables.totalQuestions || 50,
          patternsToFocus: variables.patternsToFocus || [],
        })
        break

      case "daily_practice_reminder":
        result = await sendDailyRoadmapEmail(email, {
          userName,
          userEmail: email,
          targetCompany: variables.companyName || "your target company",
          daysUntilInterview: variables.daysRemaining || 14,
          todaysQuestions: [],
          questionsCompleted: variables.questionsCompleted || 0,
          totalQuestions: variables.totalQuestions || 50,
          isOnTrack: true,
        })
        break

      case "streak_maintenance":
      case "weak_pattern_focus":
      case "pattern_decay_alert":
      case "roadmap_behind":
        // These are primarily in-app notifications
        // Send a generic inactivity-style email as fallback
        result = await sendInactivityEmail(email, {
          userName,
          userEmail: email,
          hoursSinceLastSession: 24,
          lastTopic: variables.pattern || variables.todayPattern,
          streakDays: variables.streakDays || 0,
        })
        break

      default:
        // For other notification types, skip email
        return { success: true }
    }

    return result
  } catch (error: any) {
    return { success: false, error: error.message || "Email sending failed" }
  }
}

/**
 * Get deep link for notification
 */
function getNotificationLink(type: NotificationType, variables: Record<string, any>): string {
  switch (type) {
    case "spaced_repetition_review":
    case "optimal_review_time":
      return `/practice?problem=${variables.problemId || ""}`

    case "pattern_decay_alert":
    case "weak_pattern_focus":
      return `/practice?pattern=${variables.pattern || ""}`

    case "daily_practice_reminder":
    case "streak_maintenance":
      return "/practice"

    case "interview_countdown":
    case "roadmap_behind":
      return "/roadmap"

    case "milestone_celebration":
      return "/dashboard"

    case "rest_reminder":
      return "/"

    default:
      return "/dashboard"
  }
}

/**
 * Schedule notification for later
 */
export async function scheduleNotification(
  userId: string,
  type: NotificationType,
  variables: Record<string, any>,
  scheduledFor: Date,
  priority: "critical" | "high" | "medium" | "low" = "medium"
): Promise<{ success: boolean; queueItemId?: string; error?: string }> {
  try {
    const queueItem = await addToNotificationQueue({
      userId,
      type,
      triggerData: variables,
      scheduledFor: scheduledFor.toISOString(),
      priority,
      maxAttempts: 3,
    })

    return { success: true, queueItemId: queueItem.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Process user triggers and send applicable notifications
 * This should be called periodically (e.g., every hour via cron)
 */
export async function processUserNotifications(
  userId: string,
  context: NotificationTriggerContext
): Promise<{ processed: number; sent: number; errors: string[] }> {
  const triggers = await evaluateTriggers(context)

  let sent = 0
  const errors: string[] = []

  for (const trigger of triggers) {
    const result = await sendNotification(userId, trigger.type, trigger.variables, trigger.priority)

    if (result.success) {
      sent++
    } else if (result.error) {
      errors.push(`${trigger.type}: ${result.error}`)
    }
  }

  return {
    processed: triggers.length,
    sent,
    errors,
  }
}

// ============================================================================
// SPACED REPETITION SCHEDULING
// ============================================================================

/**
 * Calculate next review date based on spaced repetition schedule
 */
export function calculateNextReviewDate(
  lastAttemptDate: Date,
  attemptNumber: number,
  wasSuccessful: boolean,
  timeToSolve?: number, // in minutes
  usedHints?: boolean
): Date {
  // Determine scenario
  let scenario: "new_problem" | "struggling" | "moderate" | "mastered" = "moderate"

  if (attemptNumber === 1) {
    scenario = "new_problem"
  } else if (!wasSuccessful || (usedHints && attemptNumber <= 3)) {
    scenario = "struggling"
  } else if (attemptNumber >= 5 && wasSuccessful) {
    scenario = "mastered"
  }

  const schedule = getReviewSchedule(scenario)
  if (!schedule) {
    // Default: 3 days
    const next = new Date(lastAttemptDate)
    next.setDate(next.getDate() + 3)
    return next
  }

  // Get interval index (capped at max intervals)
  const intervalIndex = Math.min(attemptNumber - 1, schedule.intervals.length - 1)
  let intervalDays = schedule.intervals[intervalIndex]

  // Apply adaptive rules
  if (wasSuccessful && attemptNumber === 1 && !usedHints) {
    // Solved correctly on first attempt - skip first interval
    intervalDays = schedule.intervals[1] || intervalDays
  }

  if (usedHints) {
    // Needed hints - add extra review
    intervalDays = Math.max(1, Math.floor(intervalDays * 0.5))
  }

  if (timeToSolve && timeToSolve > 30) {
    // Took too long - review sooner
    intervalDays = Math.max(1, Math.floor(intervalDays * 0.7))
  }

  const nextReview = new Date(lastAttemptDate)
  nextReview.setDate(nextReview.getDate() + intervalDays)

  return nextReview
}

/**
 * Estimate retention based on time since last review
 * Uses Ebbinghaus forgetting curve approximation
 */
export function estimateRetention(
  daysSinceLastReview: number,
  reviewCount: number,
  wasLastSuccessful: boolean
): number {
  // Base retention at 100%, decays over time
  // Each successful review strengthens memory (slower decay)

  // Stability factor: increases with more successful reviews
  const stabilityFactor = 1 + Math.log2(Math.max(1, reviewCount)) * 0.5

  // If last attempt failed, memory is weaker
  const successMultiplier = wasLastSuccessful ? 1 : 0.7

  // Forgetting curve: R = e^(-t/S) where S is stability
  const effectiveStability = stabilityFactor * successMultiplier

  // Half-life in days (how long until 50% retention)
  const halfLife = effectiveStability * 7 // Base half-life of 7 days

  // Exponential decay
  const retention = Math.exp(-daysSinceLastReview / halfLife)

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, retention))
}

// ============================================================================
// MILESTONE DETECTION
// ============================================================================

/**
 * Check for milestone achievements
 */
export function detectMilestones(
  previousStats: {
    problemsSolved: number
    patternsCompleted: string[]
    streakDays: number
  },
  currentStats: {
    problemsSolved: number
    patternsCompleted: string[]
    streakDays: number
  }
): Array<{ type: string; value: any }> {
  const milestones: Array<{ type: string; value: any }> = []

  // Problem milestones
  const problemMilestones = [10, 25, 50, 100, 200, 500]
  for (const milestone of problemMilestones) {
    if (previousStats.problemsSolved < milestone && currentStats.problemsSolved >= milestone) {
      milestones.push({ type: "problems_solved", value: milestone })
    }
  }

  // Pattern mastery
  const newPatterns = currentStats.patternsCompleted.filter(
    (p) => !previousStats.patternsCompleted.includes(p)
  )
  for (const pattern of newPatterns) {
    milestones.push({ type: "pattern_mastered", value: pattern })
  }

  // Streak milestones
  const streakMilestones = [3, 7, 14, 30, 60, 100]
  for (const milestone of streakMilestones) {
    if (previousStats.streakDays < milestone && currentStats.streakDays >= milestone) {
      milestones.push({ type: "streak", value: milestone })
    }
  }

  return milestones
}
