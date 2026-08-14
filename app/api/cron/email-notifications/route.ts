/**
 * Email Notifications Cron Job
 *
 * Consolidated cron job that handles:
 * 1. Welcome emails for new users
 * 2. Inactivity reminders (24h+)
 * 3. Spaced repetition reminders (topics due for review)
 * 4. Roadmap-based reminders (interview countdown, behind schedule, daily)
 * 5. Streak at-risk alerts (in-app)
 * 6. Subscription expiry checks
 *
 * IMPORTANT: This cron respects each user's timezone!
 * Emails are only sent during 9 AM - 9 PM in the USER'S local time.
 *
 * Runs every 3 hours to cover all timezones across 24 hours.
 *
 * Triggered externally via cron-job.org (Vercel Hobby plan only allows daily crons).
 * Configure at cron-job.org: POST to /api/cron/email-notifications with Bearer token.
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyCronRequest } from "@/lib/cron-auth"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import {
  sendInactivityEmail,
  sendSpacedRepetitionEmail,
  sendDailyRoadmapEmail,
  sendInterviewCountdownEmail,
  sendBehindScheduleEmail,
  sendWelcomeEmail,
  canSendEmail,
  isReasonableHourForUser,
  isInQuietHours,
  isToday,
  getTodayInTimezone,
  getDateInTimezone,
  DEFAULT_TIMEZONE,
} from "@/lib/email"
import type { Profile, UserLearningState, ProblemMasteryRecord } from "@/lib/types"
import { checkStreakAtRisk, sendDailyReminderIfNeeded } from "@/lib/services/session-notifications"

const db = adminDb

/** The subset of the run's result accumulator that failure reporting needs. */
interface CronErrorSink {
  errors: string[]
}

/**
 * Record a failed duplicate-prevention pre-fetch.
 *
 * Each `process*` function starts by querying `email_notifications` for everything it already sent
 * in the last 24 hours, so it can skip those users. When that query fails the run continues with an
 * EMPTY skip set, which means every eligible user looks like someone who has not been emailed yet.
 *
 * That was logged at `warn` with the message "index may be building", which describes a plausible
 * cause and says nothing about the consequence. The consequence is duplicate sends: the per-user
 * rate limiter still applies (3 per day, 4 hours apart) but the cron runs every 3 hours, so the same
 * reminder goes out up to three times a day instead of once, to the whole eligible population, every
 * day the query stays broken. For a product whose email templates are built around staying out of
 * the spam folder, that is a deliverability incident, not a warning.
 *
 * Escalated to `error` and pushed onto the run's error list so it also surfaces in the response body
 * rather than only in the log stream.
 */
function reportDedupFailure(emailKind: string, error: unknown, results: CronErrorSink): void {
  const detail = error instanceof Error ? error.message : String(error)
  logger.error(
    `[Cron Email] ${emailKind} dedup query failed; this run may re-send to every eligible user`,
    { emailKind, error }
  )
  results.errors.push(`${emailKind} dedup query failed (duplicate sends possible): ${detail}`)
}

/**
 * Record a single user's email failing to send.
 *
 * Every one of these sites incremented a counter and pushed a string onto `results.errors`, and
 * called nothing else. `results` is returned in the HTTP response body, and this cron is triggered
 * by cron-job.org, which does not read response bodies. So a Brevo outage, an expired API key, or a
 * malformed profile produced a run where every send failed and the only record of it was a JSON
 * document that went straight into the void.
 *
 * The counters and the strings are unchanged, because they are what a manual invocation reads. The
 * log line is what makes the same information reach Sentry, where a spike is actually visible.
 *
 * `reason` covers both shapes this is called with: a thrown error, and a provider result that
 * reported `success: false` without throwing. The second is the more dangerous of the two precisely
 * because nothing about it looks like an exception.
 */
function reportSendFailure(
  emailKind: string,
  userId: string,
  reason: unknown,
  results: CronErrorSink
): void {
  const detail = reason instanceof Error ? reason.message : String(reason)
  logger.error(`[Cron Email] ${emailKind} email failed to send`, { emailKind, userId, reason })
  results.errors.push(`${emailKind} email failed for ${userId}: ${detail}`)
}

/**
 * Check if we can send an email to a user based on their timezone
 * Returns false if it's outside 9 AM - 9 PM in their local time
 */
function canSendToUserTimezone(profile: Profile): {
  canSend: boolean
  reason?: string
  localHour?: number
} {
  // Get user's timezone from notification preferences or profile
  const timezone = profile.notification_preferences?.timezone || "America/Los_Angeles"

  // Check if it's a reasonable hour in user's timezone
  const { isReasonable, localHour } = isReasonableHourForUser(timezone)

  if (!isReasonable) {
    return {
      canSend: false,
      reason: `outside_reasonable_hours (${localHour}:00 in ${timezone})`,
      localHour,
    }
  }

  // Check quiet hours if configured
  const quietHours = profile.notification_preferences?.quietHours
  if (quietHours?.enabled && isInQuietHours(timezone, quietHours)) {
    return {
      canSend: false,
      reason: `quiet_hours (${localHour}:00 in ${timezone})`,
      localHour,
    }
  }

  return { canSend: true, localHour }
}

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron - ALWAYS require secret
    const auth = verifyCronRequest(request)
    if (!auth.ok) {
      if (auth.status === 500) {
        logger.error("[Cron Email] CRON_SECRET not configured - rejecting request")
      }
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const results = {
      welcomeEmails: { sent: 0, skipped: 0, failed: 0, skippedTimezone: 0 },
      inactivityEmails: { sent: 0, skipped: 0, failed: 0, skippedTimezone: 0 },
      spacedRepetitionEmails: { sent: 0, skipped: 0, failed: 0, skippedTimezone: 0 },
      roadmapEmails: { sent: 0, skipped: 0, failed: 0, skippedTimezone: 0 },
      subscriptionExpiry: { reminders7d: 0, reminders1d: 0, downgrades: 0 },
      streakAlerts: { sent: 0, skipped: 0 },
      errors: [] as string[],
    }

    // Get current time
    const now = new Date()

    // NOTE: We no longer skip based on UTC time!
    // Each user's timezone is checked individually before sending.

    // ============================================
    // 1. WELCOME EMAILS (for users who signed up but didn't receive email)
    // ============================================
    await processWelcomeEmails(now, results)

    // ============================================
    // 2. INACTIVITY REMINDERS
    // ============================================
    await processInactivityReminders(now, results)

    // ============================================
    // 3. SPACED REPETITION REMINDERS
    // ============================================
    await processSpacedRepetitionReminders(now, results)

    // ============================================
    // 4. ROADMAP-BASED REMINDERS
    // ============================================
    await processRoadmapReminders(now, results)

    // ============================================
    // 5. SUBSCRIPTION EXPIRY (consolidated from separate cron)
    // ============================================
    await processSubscriptionExpiry(now, results)

    // ============================================
    // 6. STREAK AT RISK ALERTS (in-app only)
    // Check based on user timezone - evening hours in their local time
    // ============================================
    await processStreakAlerts(results)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error: any) {
    logger.error("[Cron Email] Error", { error })
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 })
  }
}

async function processWelcomeEmails(now: Date, results: any): Promise<void> {
  // Find users who signed up in the last 24 hours but haven't received welcome email
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // Query profiles without welcome_email_sent (or where it's false)
    // Filter by created_at in memory to avoid composite index requirement
    const profilesSnap = await db.collection("profiles").limit(100).get()

    // Filter in memory for profiles created in last 24h without welcome email
    const eligibleProfiles = profilesSnap.docs
      .filter((doc) => {
        const profile = doc.data()
        // Skip if welcome email already sent
        if (profile.welcome_email_sent) return false
        // Check if created within last 24h
        const createdAt = profile.created_at
        if (!createdAt) return false
        const createdDate = new Date(createdAt)
        return createdDate >= twentyFourHoursAgo
      })
      .slice(0, 50) // Limit to 50

    for (const doc of eligibleProfiles) {
      const profile = doc.data() as Profile
      const userId = doc.id

      // Skip if welcome email already sent
      if (profile.welcome_email_sent) {
        results.welcomeEmails.skipped++
        continue
      }

      // Skip if no email
      if (!profile.email) {
        results.welcomeEmails.skipped++
        continue
      }

      // CHECK USER'S TIMEZONE - Only send during reasonable hours in their local time
      const timezoneCheck = canSendToUserTimezone(profile)
      if (!timezoneCheck.canSend) {
        results.welcomeEmails.skippedTimezone++
        continue
      }

      try {
        // Send welcome email
        logger.info("[Cron Email] Sending welcome email", { email: profile.email, userId })
        const result = await sendWelcomeEmail(userId, profile.email, profile.full_name)

        if (result.success) {
          results.welcomeEmails.sent++

          // Mark welcome email as sent
          await db
            .collection("profiles")
            .doc(userId)
            .update({
              welcome_email_sent: true,
              welcome_notification_sent: true,
              last_email_sent_at: now.toISOString(),
              emails_sent_today: (profile.emails_sent_today || 0) + 1,
              notification_preferences: {
                ...profile.notification_preferences,
                email_notifications_enabled: true,
                welcome_email: true,
              },
            })

          // Create in-app welcome notification
          try {
            const notificationRef = db.collection("in_app_notifications").doc()
            await notificationRef.set({
              id: notificationRef.id,
              userId,
              type: "welcome",
              title: "Welcome to CodeSparring",
              body: "You're set. Start your first practice session whenever you're ready.",
              link: "/practice",
              read: false,
              createdAt: now.toISOString(),
            })
          } catch (notifError) {
            logger.warn("[Cron Email] Failed to create in-app notification", {
              userId,
              error: notifError,
            })
          }

          // Log the notification
          await db.collection("email_notifications").add({
            user_id: userId,
            email_type: "welcome",
            status: "sent",
            scheduled_at: now.toISOString(),
            sent_at: now.toISOString(),
            created_at: now.toISOString(),
            source: "cron",
          })
        } else {
          results.welcomeEmails.failed++
          reportSendFailure("Welcome", userId, result.error, results)
        }
      } catch (error: any) {
        results.welcomeEmails.failed++
        reportSendFailure("Welcome", userId, error, results)
      }
    }
  } catch (error: any) {
    logger.error("[Cron Email] Error processing welcome emails", { error })
    results.errors.push(`Welcome email processing failed: ${error.message}`)
  }
}

async function processInactivityReminders(now: Date, results: any): Promise<void> {
  // Find users who haven't practiced in 24+ hours
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

  // DUPLICATE PREVENTION: Pre-fetch all inactivity emails sent in last 24 hours
  // This prevents sending multiple inactivity reminders within a 24-hour window
  let usersWithRecentInactivityEmail = new Set<string>()
  try {
    const recentInactivityEmailsSnap = await db
      .collection("email_notifications")
      .where("email_type", "in", ["inactivity_24h", "inactivity_48h"])
      .where("created_at", ">=", twentyFourHoursAgo.toISOString())
      .get()

    usersWithRecentInactivityEmail = new Set(
      recentInactivityEmailsSnap.docs.map((doc) => doc.data().user_id)
    )
  } catch (indexError) {
    reportDedupFailure("Inactivity", indexError, results)
  }

  // Get learning states where last_session_at is before 24h ago
  // Filter for 72h in memory to avoid composite index requirement
  let learningStatesSnap
  try {
    learningStatesSnap = await db
      .collection("user_learning_state")
      .where("last_session_at", "<=", twentyFourHoursAgo.toISOString())
      .limit(100)
      .get()
  } catch (queryError: any) {
    logger.error("[Cron Email] Firestore query failed", { error: queryError.message })
    results.errors.push(`Firestore query failed: ${queryError.message}`)
    return
  }

  // Filter in memory to only include sessions within 72h (not too old)
  const filteredDocs = learningStatesSnap.docs
    .filter((doc) => {
      const data = doc.data()
      const lastSession = data.last_session_at
      if (!lastSession) return false
      return lastSession >= seventyTwoHoursAgo.toISOString()
    })
    .slice(0, 50)

  for (const doc of filteredDocs) {
    const learningState = doc.data() as UserLearningState
    const userId = learningState.user_id

    // DUPLICATE PREVENTION: Skip if user already received inactivity email in last 24 hours
    if (usersWithRecentInactivityEmail.has(userId)) {
      results.inactivityEmails.skipped++
      continue
    }

    try {
      // Get user profile
      const profileSnap = await db.collection("profiles").doc(userId).get()
      if (!profileSnap.exists) continue

      const profile = profileSnap.data() as Profile

      // Check if user has email notifications enabled
      // Use ?? true to default to enabled for users without explicit preferences
      if (!(profile.notification_preferences?.inactivity_reminders ?? true)) {
        results.inactivityEmails.skipped++
        continue
      }

      if (!(profile.notification_preferences?.email_notifications_enabled ?? true)) {
        results.inactivityEmails.skipped++
        continue
      }

      // CHECK USER'S TIMEZONE - Only send during reasonable hours in their local time
      const timezoneCheck = canSendToUserTimezone(profile)
      if (!timezoneCheck.canSend) {
        results.inactivityEmails.skippedTimezone++
        continue
      }

      // Check rate limits (pass user's timezone for accurate daily counter)
      const userTimezone = profile.notification_preferences?.timezone || "America/Los_Angeles"
      const rateCheck = canSendEmail(
        profile.last_email_sent_at,
        profile.emails_sent_today,
        userTimezone
      )
      if (!rateCheck.allowed) {
        results.inactivityEmails.skipped++
        continue
      }

      // Calculate hours since last session
      const lastSessionAt = new Date(learningState.last_session_at || now.toISOString())
      const hoursSinceLastSession = Math.floor(
        (now.getTime() - lastSessionAt.getTime()) / (1000 * 60 * 60)
      )

      // Get last practiced topic
      let lastTopic: string | undefined
      let latestTopicTime = 0
      for (const topicId in learningState.topics) {
        const topic = learningState.topics[topicId]
        const topicTime = new Date(topic.last_practiced_at).getTime()
        if (topicTime > latestTopicTime) {
          latestTopicTime = topicTime
          lastTopic = topic.topic_name
        }
      }

      // Send inactivity email
      const result = await sendInactivityEmail(userId, profile.email, {
        userName: profile.full_name || "",
        userEmail: profile.email,
        hoursSinceLastSession,
        lastTopic,
        streakDays: learningState.streak_days,
      })

      if (result.success) {
        results.inactivityEmails.sent++

        // Update profile with email tracking
        await db
          .collection("profiles")
          .doc(userId)
          .update({
            last_email_sent_at: now.toISOString(),
            emails_sent_today: (profile.emails_sent_today || 0) + 1,
          })

        // Log the notification
        await db.collection("email_notifications").add({
          user_id: userId,
          email_type: hoursSinceLastSession < 48 ? "inactivity_24h" : "inactivity_48h",
          status: "sent",
          scheduled_at: now.toISOString(),
          sent_at: now.toISOString(),
          created_at: now.toISOString(),
        })
      } else {
        results.inactivityEmails.failed++
        reportSendFailure("Inactivity", userId, result.error, results)
      }
    } catch (error: any) {
      results.inactivityEmails.failed++
      reportSendFailure("Inactivity", userId, error, results)
    }
  }
}

async function processSpacedRepetitionReminders(now: Date, results: any): Promise<void> {
  // DUPLICATE PREVENTION: Pre-fetch all spaced repetition emails sent in last 24 hours
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  let usersWithRecentSREmail = new Set<string>()
  try {
    const recentSREmailsSnap = await db
      .collection("email_notifications")
      .where("email_type", "==", "spaced_repetition")
      .where("created_at", ">=", twentyFourHoursAgo.toISOString())
      .get()

    usersWithRecentSREmail = new Set(recentSREmailsSnap.docs.map((doc) => doc.data().user_id))
  } catch (indexError) {
    reportDedupFailure("Spaced repetition", indexError, results)
  }

  // Find users with problem mastery data (new system)
  const problemMasteryUsersSnap = await db.collection("problem_mastery").limit(100).get()

  const processedUsers = new Set<string>()

  // Process problem-level mastery (new system)
  for (const userDoc of problemMasteryUsersSnap.docs) {
    const userId = userDoc.id
    processedUsers.add(userId)

    // DUPLICATE PREVENTION: Skip if user already received SR email in last 24 hours
    if (usersWithRecentSREmail.has(userId)) {
      results.spacedRepetitionEmails.skipped++
      continue
    }

    try {
      // Get problems due for this user
      const problemsSnap = await db
        .collection("problem_mastery")
        .doc(userId)
        .collection("problems")
        .where("next_review_at", "<=", now.toISOString())
        .limit(10)
        .get()

      if (problemsSnap.empty) continue

      // Calculate problems due with days overdue
      const problemsDue = problemsSnap.docs
        .map((doc) => {
          const problem = doc.data() as ProblemMasteryRecord
          const nextReviewAt = new Date(problem.next_review_at)
          const daysOverdue = Math.floor(
            (now.getTime() - nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)
          )
          return { ...problem, daysOverdue }
        })
        .filter((p) => p.daysOverdue >= 1) // At least 1 day overdue

      if (problemsDue.length === 0) continue

      // Get user profile
      const profileSnap = await db.collection("profiles").doc(userId).get()
      if (!profileSnap.exists) continue

      const profile = profileSnap.data() as Profile

      // Check if user has email notifications enabled
      // Use ?? true to default to enabled for users without explicit preferences
      if (!(profile.notification_preferences?.spaced_repetition_reminders ?? true)) {
        results.spacedRepetitionEmails.skipped++
        continue
      }

      if (!(profile.notification_preferences?.email_notifications_enabled ?? true)) {
        results.spacedRepetitionEmails.skipped++
        continue
      }

      // CHECK USER'S TIMEZONE - Only send during reasonable hours in their local time
      const timezoneCheck = canSendToUserTimezone(profile)
      if (!timezoneCheck.canSend) {
        results.spacedRepetitionEmails.skippedTimezone++
        continue
      }

      // Check rate limits (pass user's timezone for accurate daily counter)
      const userTimezone = profile.notification_preferences?.timezone || "America/Los_Angeles"
      const rateCheck = canSendEmail(
        profile.last_email_sent_at,
        profile.emails_sent_today,
        userTimezone
      )
      if (!rateCheck.allowed) {
        results.spacedRepetitionEmails.skipped++
        continue
      }

      // Send reminder for the most overdue problem
      const mostOverdue = problemsDue.sort((a, b) => b.daysOverdue - a.daysOverdue)[0]

      const result = await sendSpacedRepetitionEmail(userId, profile.email, {
        userName: profile.full_name || "",
        userEmail: profile.email,
        topic: mostOverdue.title,
        pattern: mostOverdue.pattern,
        daysSinceReview: mostOverdue.daysOverdue,
        lastScore: mostOverdue.last_score,
        reviewCount: mostOverdue.review_count,
        scenarioId: mostOverdue.scenario_id,
      })

      if (result.success) {
        results.spacedRepetitionEmails.sent++

        // Update profile with email tracking
        await db
          .collection("profiles")
          .doc(userId)
          .update({
            last_email_sent_at: now.toISOString(),
            emails_sent_today: (profile.emails_sent_today || 0) + 1,
          })

        // Log the notification
        await db.collection("email_notifications").add({
          user_id: userId,
          email_type: "spaced_repetition",
          status: "sent",
          scheduled_at: now.toISOString(),
          sent_at: now.toISOString(),
          metadata: {
            topic: mostOverdue.title,
            problem_id: mostOverdue.problem_id,
            mastery_level: mostOverdue.mastery_level,
          },
          created_at: now.toISOString(),
        })
      } else {
        results.spacedRepetitionEmails.failed++
        reportSendFailure("Spaced repetition", userId, result.error, results)
      }
    } catch (error: any) {
      results.spacedRepetitionEmails.failed++
      reportSendFailure("Spaced repetition (problem mastery)", userId, error, results)
    }
  }

  // Also process legacy topic-level data for users not in new system
  const learningStatesSnap = await db.collection("user_learning_state").limit(100).get()

  for (const doc of learningStatesSnap.docs) {
    const learningState = doc.data() as UserLearningState
    const userId = learningState.user_id

    // Skip if already processed via problem_mastery
    if (processedUsers.has(userId)) continue

    // DUPLICATE PREVENTION: Skip if user already received SR email in last 24 hours
    if (usersWithRecentSREmail.has(userId)) {
      results.spacedRepetitionEmails.skipped++
      continue
    }

    // Find topics due for review
    const topicsDue: Array<{
      topicId: string
      topic: any
      daysSinceReview: number
    }> = []

    for (const topicId in learningState.topics) {
      const topic = learningState.topics[topicId]
      const nextReviewAt = new Date(topic.next_review_at)

      if (nextReviewAt <= now) {
        const daysSinceReview = Math.floor(
          (now.getTime() - new Date(topic.last_practiced_at).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Only remind for topics 3+ days old
        if (daysSinceReview >= 3) {
          topicsDue.push({ topicId, topic, daysSinceReview })
        }
      }
    }

    if (topicsDue.length === 0) continue

    try {
      // Get user profile
      const profileSnap = await db.collection("profiles").doc(userId).get()
      if (!profileSnap.exists) continue

      const profile = profileSnap.data() as Profile

      // Check if user has email notifications enabled
      // Use ?? true to default to enabled for users without explicit preferences
      if (!(profile.notification_preferences?.spaced_repetition_reminders ?? true)) {
        results.spacedRepetitionEmails.skipped++
        continue
      }

      if (!(profile.notification_preferences?.email_notifications_enabled ?? true)) {
        results.spacedRepetitionEmails.skipped++
        continue
      }

      // CHECK USER'S TIMEZONE - Only send during reasonable hours in their local time
      const timezoneCheck = canSendToUserTimezone(profile)
      if (!timezoneCheck.canSend) {
        results.spacedRepetitionEmails.skippedTimezone++
        continue
      }

      // Check rate limits (pass user's timezone for accurate daily counter)
      const userTimezone = profile.notification_preferences?.timezone || "America/Los_Angeles"
      const rateCheck = canSendEmail(
        profile.last_email_sent_at,
        profile.emails_sent_today,
        userTimezone
      )
      if (!rateCheck.allowed) {
        results.spacedRepetitionEmails.skipped++
        continue
      }

      // Send reminder for the most overdue topic
      const mostOverdue = topicsDue.sort((a, b) => b.daysSinceReview - a.daysSinceReview)[0]

      const result = await sendSpacedRepetitionEmail(userId, profile.email, {
        userName: profile.full_name || "",
        userEmail: profile.email,
        topic: mostOverdue.topic.topic_name,
        pattern: mostOverdue.topic.pattern,
        daysSinceReview: mostOverdue.daysSinceReview,
        lastScore: mostOverdue.topic.performance_score,
        reviewCount: mostOverdue.topic.review_count,
        scenarioId: mostOverdue.topic.scenario_id,
      })

      if (result.success) {
        results.spacedRepetitionEmails.sent++

        // Update profile with email tracking
        await db
          .collection("profiles")
          .doc(userId)
          .update({
            last_email_sent_at: now.toISOString(),
            emails_sent_today: (profile.emails_sent_today || 0) + 1,
          })

        // Log the notification
        await db.collection("email_notifications").add({
          user_id: userId,
          email_type: "spaced_repetition",
          status: "sent",
          scheduled_at: now.toISOString(),
          sent_at: now.toISOString(),
          metadata: {
            topic: mostOverdue.topic.topic_name,
          },
          created_at: now.toISOString(),
        })
      } else {
        results.spacedRepetitionEmails.failed++
        reportSendFailure("Spaced repetition", userId, result.error, results)
      }
    } catch (error: any) {
      results.spacedRepetitionEmails.failed++
      reportSendFailure("Spaced repetition (legacy topics)", userId, error, results)
    }
  }
}

async function processRoadmapReminders(now: Date, results: any): Promise<void> {
  // DUPLICATE PREVENTION: Pre-fetch all roadmap emails sent in last 24 hours
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  let usersWithRecentRoadmapEmail = new Set<string>()
  try {
    const recentRoadmapEmailsSnap = await db
      .collection("email_notifications")
      .where("email_type", "in", ["daily_roadmap", "interview_countdown", "behind_schedule"])
      .where("created_at", ">=", twentyFourHoursAgo.toISOString())
      .get()

    usersWithRecentRoadmapEmail = new Set(
      recentRoadmapEmailsSnap.docs.map((doc) => doc.data().user_id)
    )
  } catch (indexError) {
    reportDedupFailure("Roadmap", indexError, results)
  }

  // Get all active roadmaps
  const roadmapsSnap = await db
    .collection("user_roadmaps")
    .where("status", "==", "active")
    .limit(100)
    .get()

  for (const doc of roadmapsSnap.docs) {
    const roadmap = doc.data()
    const userId = roadmap.userId

    // DUPLICATE PREVENTION: Skip if user already received roadmap email in last 24 hours
    if (usersWithRecentRoadmapEmail.has(userId)) {
      results.roadmapEmails.skipped++
      continue
    }

    try {
      // Get user profile
      const profileSnap = await db.collection("profiles").doc(userId).get()
      if (!profileSnap.exists) continue

      const profile = profileSnap.data() as Profile

      // Check if user has email notifications enabled
      // Use ?? true to default to enabled for users without explicit preferences
      if (!(profile.notification_preferences?.roadmap_reminders ?? true)) {
        results.roadmapEmails.skipped++
        continue
      }

      if (!(profile.notification_preferences?.email_notifications_enabled ?? true)) {
        results.roadmapEmails.skipped++
        continue
      }

      // CHECK USER'S TIMEZONE - Only send during reasonable hours in their local time
      const timezoneCheck = canSendToUserTimezone(profile)
      if (!timezoneCheck.canSend) {
        results.roadmapEmails.skippedTimezone++
        continue
      }

      // Check rate limits (pass user's timezone for accurate daily counter)
      const userTimezone = profile.notification_preferences?.timezone || DEFAULT_TIMEZONE
      const rateCheck = canSendEmail(
        profile.last_email_sent_at,
        profile.emails_sent_today,
        userTimezone
      )
      if (!rateCheck.allowed) {
        results.roadmapEmails.skipped++
        continue
      }

      // Calculate days until interview - handle various date formats safely
      let interviewDate: Date
      try {
        if (roadmap.interviewDate?.toDate) {
          interviewDate = roadmap.interviewDate.toDate()
        } else if (roadmap.interviewDate) {
          interviewDate = new Date(roadmap.interviewDate)
        } else {
          // No interview date - skip this roadmap
          continue
        }
        // Validate the date is valid
        if (isNaN(interviewDate.getTime())) {
          logger.warn("[Cron Email] Invalid interviewDate for user", { userId })
          continue
        }
      } catch {
        logger.warn("[Cron Email] Failed to parse interviewDate for user", { userId })
        continue
      }

      const daysUntilInterview = Math.ceil(
        (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Skip if interview has passed
      if (daysUntilInterview <= 0) continue

      // Get today's questions from dailyPlans
      // userTimezone already defined above for rate limiting
      const todaysQuestions: Array<{
        title: string
        pattern: string
        difficulty: string
        scenarioId?: string
      }> = []

      // Get today's date in user's timezone (YYYY-MM-DD format)
      const todayInUserTz = getTodayInTimezone(userTimezone)

      for (const plan of roadmap.dailyPlans || []) {
        // Safely parse plan date
        let planDate: Date
        try {
          if (plan.date?.toDate) {
            planDate = plan.date.toDate()
          } else if (plan.date) {
            planDate = new Date(plan.date)
          } else {
            continue
          }
          if (isNaN(planDate.getTime())) continue
        } catch (planDateError) {
          // Dropping a plan day silently means the user's daily roadmap email either goes out with
          // the wrong questions or does not go out at all, and the roadmap looks empty for that day
          // with nothing anywhere explaining why. The `continue` stays, so one bad day cannot break
          // the rest of the roadmap, but it no longer happens invisibly.
          logger.warn("[Cron Email] Skipping a roadmap day with an unparseable date", {
            userId,
            error: planDateError,
          })
          continue
        }

        // Compare plan date with user's local "today"
        const planDateStr = getDateInTimezone(planDate.toISOString(), userTimezone)
        if (planDateStr === todayInUserTz) {
          for (const q of plan.questions || []) {
            if (q.status !== "completed") {
              todaysQuestions.push({
                title: q.title || q.scenarioTitle || "Practice Problem",
                pattern: q.pattern || "DSA",
                difficulty: q.difficulty || "Medium",
                scenarioId: q.scenarioId,
              })
            }
          }
        }
      }

      // Calculate progress
      const questionsCompleted = roadmap.questionsCompleted || 0
      const totalQuestions = roadmap.totalQuestions || 1
      const isOnTrack = roadmap.isOnTrack !== false

      // Determine which type of email to send

      // 1. Interview countdown (at 7, 3, 1 days)
      if ([7, 3, 1].includes(daysUntilInterview)) {
        // Find patterns that need focus (incomplete or low scoring)
        const patternsToFocus: string[] = []
        for (const plan of roadmap.dailyPlans || []) {
          for (const q of plan.questions || []) {
            if (q.status !== "completed" && q.pattern && !patternsToFocus.includes(q.pattern)) {
              patternsToFocus.push(q.pattern)
              if (patternsToFocus.length >= 3) break
            }
          }
          if (patternsToFocus.length >= 3) break
        }

        const result = await sendInterviewCountdownEmail(userId, profile.email, {
          userName: profile.full_name || "",
          userEmail: profile.email,
          targetCompany:
            roadmap.assessment?.targetCompany || roadmap.targetCompany || "your target company",
          daysUntilInterview,
          questionsCompleted,
          totalQuestions,
          patternsToFocus,
        })

        if (result.success) {
          results.roadmapEmails.sent++
          await updateEmailTracking(userId, profile, now)
          await logEmailNotification(userId, "interview_countdown", now)
        } else {
          results.roadmapEmails.failed++
          reportSendFailure("Interview countdown", userId, result.error, results)
        }
        continue
      }

      // 2. Behind schedule alert (if significantly behind)
      if (!isOnTrack && daysUntilInterview > 3) {
        // Calculate how many questions behind
        const expectedProgress =
          ((roadmap.dailyPlans?.length || 1) - daysUntilInterview) /
          (roadmap.dailyPlans?.length || 1)
        const actualProgress = questionsCompleted / totalQuestions
        const questionsBehind = Math.round((expectedProgress - actualProgress) * totalQuestions)

        if (questionsBehind > 2) {
          const suggestedDaily = Math.ceil(
            (totalQuestions - questionsCompleted) / daysUntilInterview
          )

          const result = await sendBehindScheduleEmail(userId, profile.email, {
            userName: profile.full_name || "",
            userEmail: profile.email,
            targetCompany:
              roadmap.assessment?.targetCompany || roadmap.targetCompany || "your target company",
            daysUntilInterview,
            questionsBehind,
            suggestedDailyQuestions: Math.max(1, suggestedDaily),
          })

          if (result.success) {
            results.roadmapEmails.sent++
            await updateEmailTracking(userId, profile, now)
            await logEmailNotification(userId, "behind_schedule", now)
          } else {
            results.roadmapEmails.failed++
            reportSendFailure("Behind schedule", userId, result.error, results)
          }
          continue
        }
      }

      // 3. Daily roadmap reminder (if there are questions for today)
      if (todaysQuestions.length > 0) {
        const result = await sendDailyRoadmapEmail(userId, profile.email, {
          userName: profile.full_name || "",
          userEmail: profile.email,
          targetCompany:
            roadmap.assessment?.targetCompany || roadmap.targetCompany || "your target company",
          daysUntilInterview,
          todaysQuestions,
          questionsCompleted,
          totalQuestions,
          isOnTrack,
        })

        if (result.success) {
          results.roadmapEmails.sent++
          await updateEmailTracking(userId, profile, now)
          await logEmailNotification(userId, "daily_roadmap", now)
        } else {
          results.roadmapEmails.failed++
          reportSendFailure("Daily roadmap", userId, result.error, results)
        }
      }
    } catch (error: any) {
      results.roadmapEmails.failed++
      reportSendFailure("Roadmap", userId, error, results)
    }
  }
}

// Helper to update email tracking on profile
async function updateEmailTracking(userId: string, profile: Profile, now: Date): Promise<void> {
  await db
    .collection("profiles")
    .doc(userId)
    .update({
      last_email_sent_at: now.toISOString(),
      emails_sent_today: (profile.emails_sent_today || 0) + 1,
    })
}

// Helper to log email notification
async function logEmailNotification(userId: string, emailType: string, now: Date): Promise<void> {
  await db.collection("email_notifications").add({
    user_id: userId,
    email_type: emailType,
    status: "sent",
    scheduled_at: now.toISOString(),
    sent_at: now.toISOString(),
    created_at: now.toISOString(),
  })
}

/**
 * Process streak at risk alerts (in-app notifications)
 * Finds users with 3+ day streaks who haven't practiced today and sends them an alert
 *
 * IMPORTANT: Uses timezone-aware "today" check. A user's session at 11 PM local time
 * should count as "today" even if it's already tomorrow in UTC.
 */
async function processStreakAlerts(results: {
  streakAlerts: { sent: number; skipped: number }
}): Promise<void> {
  try {
    // Find users with streaks >= 3 days
    const learningStatesSnap = await db
      .collection("user_learning_state")
      .where("streak_days", ">=", 3)
      .limit(100)
      .get()

    for (const doc of learningStatesSnap.docs) {
      const userId = doc.id
      const learningState = doc.data()

      // Get user's timezone from their profile for accurate "today" check
      let userTimezone = DEFAULT_TIMEZONE
      try {
        const profileDoc = await db.collection("profiles").doc(userId).get()
        if (profileDoc.exists) {
          const profile = profileDoc.data() as Profile
          userTimezone = profile.notification_preferences?.timezone || DEFAULT_TIMEZONE
        }
      } catch (timezoneError) {
        // Falling back to America/Los_Angeles is the right behaviour, but it is not free: this
        // timezone decides whether the user "already practiced today". For someone far enough east
        // the fallback puts them on the wrong calendar day, so they get a streak-at-risk alert on a
        // day they already practiced, or none on a day they did not. Silently guessing at a user's
        // timezone is worth a log line.
        logger.warn("[Cron Email] Timezone read failed; falling back to the default timezone", {
          userId,
          fallback: DEFAULT_TIMEZONE,
          error: timezoneError,
        })
      }

      // Skip if they already practiced today (in THEIR timezone)
      // Use last_session_at (correct field name) with timezone-aware check
      const lastSessionAt = learningState.last_session_at
      if (isToday(lastSessionAt, userTimezone)) {
        results.streakAlerts.skipped++
        continue
      }

      try {
        const sent = await checkStreakAtRisk(userId)
        if (sent) {
          results.streakAlerts.sent++
        } else {
          results.streakAlerts.skipped++
        }
      } catch (err) {
        logger.error("[Cron] Error checking streak", { userId, error: err })
        results.streakAlerts.skipped++
      }
    }
  } catch (error) {
    logger.error("[Cron] Error processing streak alerts", { error })
  }
}

/**
 * Process subscription expiry (consolidated from /api/cron/subscription-expiry)
 * Handles: expired subscriptions, 7-day reminders, 1-day reminders
 */
async function processSubscriptionExpiry(now: Date, results: any): Promise<void> {
  // Yearly Pro is a ONE-TIME payment: the trial-ending template ("your payment
  // method is charged") is false for this audience, so expiry uses its own
  // templates that say what actually happens (downgrade, nothing charged).
  const { sendYearlyExpiredEmail, sendYearlyExpiryReminderEmail } = await import("@/lib/email")

  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

  try {
    // 1. Downgrade expired yearly subscriptions
    const expiredQuery = await db
      .collection("profiles")
      .where("subscription_type", "==", "yearly")
      .where("subscription_tier", "==", "pro")
      .where("subscription_current_period_end", "<=", now.toISOString())
      .limit(100)
      .get()

    for (const doc of expiredQuery.docs) {
      const userId = doc.id
      const profile = doc.data() as Profile

      try {
        await db.collection("profiles").doc(userId).update({
          subscription_tier: "free",
          subscription_status: "expired",
          subscription_expired_at: now.toISOString(),
          updated_at: now.toISOString(),
        })

        results.subscriptionExpiry.downgrades++
        logger.info("[Cron] Downgraded user - yearly plan expired", { userId })

        // Send the goodbye email. Transactional: the downgrade happens exactly once,
        // so skipping on the local-hours window would drop this email forever.
        if (profile.email) {
          try {
            await sendYearlyExpiredEmail(profile.email, {
              userName: profile.full_name || "",
              userEmail: profile.email,
            })
          } catch (emailError) {
            logger.error("[Cron] Failed to send expiry email", { userId, error: emailError })
          }
        }
      } catch (error) {
        logger.error("[Cron] Failed to downgrade user", { userId, error })
      }
    }

    // 2. Send 7-day expiry reminders
    const sevenDayQuery = await db
      .collection("profiles")
      .where("subscription_type", "==", "yearly")
      .where("subscription_tier", "==", "pro")
      .where("subscription_current_period_end", "<=", sevenDaysFromNow.toISOString())
      .where("subscription_current_period_end", ">", now.toISOString())
      .limit(100)
      .get()

    for (const doc of sevenDayQuery.docs) {
      const userId = doc.id
      const profile = doc.data() as Profile

      if (profile.yearly_expiry_reminder_7day_sent) continue

      const expiryDate = new Date(profile.subscription_current_period_end as string)
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilExpiry <= 7 && daysUntilExpiry > 1 && profile.email) {
        // Check timezone before sending
        const timezoneCheck = canSendToUserTimezone(profile)
        if (!timezoneCheck.canSend) continue

        try {
          await sendYearlyExpiryReminderEmail(profile.email, {
            userName: profile.full_name || "",
            userEmail: profile.email,
            expiryDate: profile.subscription_current_period_end as string,
          })

          await db.collection("profiles").doc(userId).update({
            yearly_expiry_reminder_7day_sent: true,
            updated_at: now.toISOString(),
          })

          results.subscriptionExpiry.reminders7d++
        } catch (error) {
          logger.error("[Cron] Failed to send 7-day reminder", { userId, error })
        }
      }
    }

    // 3. Send 1-day expiry reminders
    const oneDayQuery = await db
      .collection("profiles")
      .where("subscription_type", "==", "yearly")
      .where("subscription_tier", "==", "pro")
      .where("subscription_current_period_end", "<=", oneDayFromNow.toISOString())
      .where("subscription_current_period_end", ">", now.toISOString())
      .limit(100)
      .get()

    for (const doc of oneDayQuery.docs) {
      const userId = doc.id
      const profile = doc.data() as Profile

      if (profile.yearly_expiry_reminder_1day_sent) continue

      if (profile.email) {
        // Check timezone before sending
        const timezoneCheck = canSendToUserTimezone(profile)
        if (!timezoneCheck.canSend) continue

        try {
          await sendYearlyExpiryReminderEmail(profile.email, {
            userName: profile.full_name || "",
            userEmail: profile.email,
            expiryDate: profile.subscription_current_period_end as string,
          })

          await db.collection("profiles").doc(userId).update({
            yearly_expiry_reminder_1day_sent: true,
            updated_at: now.toISOString(),
          })

          results.subscriptionExpiry.reminders1d++
        } catch (error) {
          logger.error("[Cron] Failed to send 1-day reminder", { userId, error })
        }
      }
    }
  } catch (error) {
    logger.error("[Cron] Error in subscription expiry processing", { error })
    results.errors.push(`Subscription expiry error: ${error}`)
  }
}

// Support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
