/**
 * Email Notification Service
 *
 * Handles sending all types of notification emails:
 * - Welcome emails (on signup)
 * - Inactivity reminders (24h+)
 * - Spaced repetition reminders (based on forgetting curve)
 * - Milestone celebrations
 */

import { sendEmail, upsertContact, EmailResult } from "./brevo"
import { getAppBaseUrl } from "../site-url"
import { DEFAULT_TIMEZONE, getTodayInTimezone, getDateInTimezone } from "./timezone"
import {
  getWelcomeEmailSubject,
  getWelcomeEmailHtml,
  getWelcomeEmailText,
  WelcomeEmailData,
  getInactivityEmailSubject,
  getInactivityEmailHtml,
  getInactivityEmailText,
  InactivityEmailData,
  getSpacedRepetitionEmailSubject,
  getSpacedRepetitionEmailHtml,
  getSpacedRepetitionEmailText,
  SpacedRepetitionEmailData,
  getMilestoneEmailSubject,
  getMilestoneEmailHtml,
  MilestoneEmailData,
  getDailyRoadmapEmailSubject,
  getDailyRoadmapEmailHtml,
  getDailyRoadmapEmailText,
  DailyRoadmapEmailData,
  getInterviewCountdownEmailSubject,
  getInterviewCountdownEmailHtml,
  InterviewCountdownEmailData,
  getBehindScheduleEmailSubject,
  getBehindScheduleEmailHtml,
  BehindScheduleEmailData,
  getPaymentFailedEmailSubject,
  getPaymentFailedEmailHtml,
  getPaymentFailedEmailText,
  PaymentFailedEmailData,
  getSubscriptionConfirmationEmailSubject,
  getSubscriptionConfirmationEmailHtml,
  getSubscriptionConfirmationEmailText,
  SubscriptionConfirmationEmailData,
  getSubscriptionCancellationEmailSubject,
  getSubscriptionCancellationEmailHtml,
  getSubscriptionCancellationEmailText,
  SubscriptionCancellationEmailData,
  getTrialEndingEmailSubject,
  getTrialEndingEmailHtml,
  getTrialEndingEmailText,
  TrialEndingEmailData,
} from "./templates"

const APP_URL = getAppBaseUrl()

export async function sendWelcomeEmail(
  userId: string,
  email: string,
  displayName?: string
): Promise<EmailResult> {
  // Add to Brevo contacts list
  await upsertContact(email, {
    FIRSTNAME: displayName?.split(" ")[0] || "",
    LASTNAME: displayName?.split(" ").slice(1).join(" ") || "",
    USER_ID: userId,
    SIGNUP_DATE: new Date().toISOString(),
  })

  const data: WelcomeEmailData = {
    userName: displayName || "",
    userEmail: email,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: displayName }],
    subject: getWelcomeEmailSubject(),
    htmlContent: getWelcomeEmailHtml(data),
    textContent: getWelcomeEmailText(data),
    tags: ["welcome", "onboarding"],
  })
}

export async function sendInactivityEmail(
  email: string,
  data: Omit<InactivityEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: InactivityEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getInactivityEmailSubject(data.hoursSinceLastSession),
    htmlContent: getInactivityEmailHtml(emailData),
    textContent: getInactivityEmailText(emailData),
    tags: ["inactivity", "re-engagement"],
  })
}

// SPACED REPETITION REMINDER

export async function sendSpacedRepetitionEmail(
  email: string,
  data: Omit<SpacedRepetitionEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: SpacedRepetitionEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getSpacedRepetitionEmailSubject(emailData),
    htmlContent: getSpacedRepetitionEmailHtml(emailData),
    textContent: getSpacedRepetitionEmailText(emailData),
    tags: ["spaced-repetition", "learning"],
  })
}

// MILESTONE CELEBRATION

export async function sendMilestoneEmail(
  email: string,
  data: Omit<MilestoneEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: MilestoneEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getMilestoneEmailSubject(emailData),
    htmlContent: getMilestoneEmailHtml(emailData),
    tags: ["milestone", "celebration"],
  })
}

// ROADMAP: DAILY PRACTICE REMINDER

export async function sendDailyRoadmapEmail(
  email: string,
  data: Omit<DailyRoadmapEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: DailyRoadmapEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getDailyRoadmapEmailSubject(emailData),
    htmlContent: getDailyRoadmapEmailHtml(emailData),
    textContent: getDailyRoadmapEmailText(emailData),
    tags: ["roadmap", "daily-reminder"],
  })
}

// ROADMAP: INTERVIEW COUNTDOWN

export async function sendInterviewCountdownEmail(
  email: string,
  data: Omit<InterviewCountdownEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: InterviewCountdownEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getInterviewCountdownEmailSubject(emailData),
    htmlContent: getInterviewCountdownEmailHtml(emailData),
    tags: ["roadmap", "interview-countdown"],
  })
}

// ROADMAP: BEHIND SCHEDULE ALERT

export async function sendBehindScheduleEmail(
  email: string,
  data: Omit<BehindScheduleEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: BehindScheduleEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getBehindScheduleEmailSubject(emailData),
    htmlContent: getBehindScheduleEmailHtml(emailData),
    tags: ["roadmap", "behind-schedule"],
  })
}

// PAYMENT FAILURE NOTIFICATION

export async function sendPaymentFailedEmail(
  email: string,
  data: Omit<PaymentFailedEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: PaymentFailedEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getPaymentFailedEmailSubject(),
    htmlContent: getPaymentFailedEmailHtml(emailData),
    textContent: getPaymentFailedEmailText(emailData),
    tags: ["payment", "payment-failed"],
  })
}

// SUBSCRIPTION CONFIRMATION

export async function sendSubscriptionConfirmationEmail(
  email: string,
  data: Omit<SubscriptionConfirmationEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: SubscriptionConfirmationEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getSubscriptionConfirmationEmailSubject(),
    htmlContent: getSubscriptionConfirmationEmailHtml(emailData),
    textContent: getSubscriptionConfirmationEmailText(emailData),
    tags: ["subscription", "subscription-confirmation"],
  })
}

// SUBSCRIPTION CANCELLATION CONFIRMATION

export async function sendSubscriptionCancellationEmail(
  email: string,
  data: Omit<SubscriptionCancellationEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: SubscriptionCancellationEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getSubscriptionCancellationEmailSubject(data.isImmediate),
    htmlContent: getSubscriptionCancellationEmailHtml(emailData),
    textContent: getSubscriptionCancellationEmailText(emailData),
    tags: ["subscription", "subscription-cancellation"],
  })
}

// TRIAL ENDING NOTIFICATION

export async function sendTrialEndingEmail(
  email: string,
  data: Omit<TrialEndingEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: TrialEndingEmailData = {
    ...data,
    appUrl: APP_URL,
  }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getTrialEndingEmailSubject(),
    htmlContent: getTrialEndingEmailHtml(emailData),
    textContent: getTrialEndingEmailText(emailData),
    tags: ["subscription", "trial-ending"],
  })
}

// NOTIFICATION PREFERENCES

export interface NotificationPreferences {
  email_notifications_enabled: boolean
  welcome_email: boolean
  inactivity_reminders: boolean
  spaced_repetition_reminders: boolean
  milestone_celebrations: boolean
  roadmap_reminders: boolean
  marketing_emails: boolean
  timezone?: string
  preferred_hours?: number[]
  last_email_sent_at?: string
  emails_sent_today?: number
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email_notifications_enabled: true,
  welcome_email: true,
  inactivity_reminders: true,
  spaced_repetition_reminders: true,
  milestone_celebrations: true,
  roadmap_reminders: true,
  marketing_emails: false,
  preferred_hours: [9, 10, 11, 14, 15, 19, 20],
}

// EMAIL RATE LIMITING

export interface EmailRateLimits {
  max_per_day: number
  min_interval_hours: number
  cooldown_after_dismiss_hours: number
}

export const EMAIL_RATE_LIMITS: EmailRateLimits = {
  max_per_day: 3,
  min_interval_hours: 4,
  cooldown_after_dismiss_hours: 24,
}

/**
 * Check if we can send an email to a user based on rate limits
 *
 * IMPORTANT: Uses timezone-aware date comparison for the daily counter.
 * This ensures the counter resets at midnight in the user's timezone,
 * not UTC. Pass the user's timezone for accurate rate limiting.
 */
export function canSendEmail(
  lastEmailSentAt: string | undefined,
  emailsSentToday: number | undefined,
  userTimezone?: string
): { allowed: boolean; reason?: string } {
  const now = new Date()
  const timezone = userTimezone || DEFAULT_TIMEZONE

  // Calculate effective emails sent today
  // If last email was on a different day (in user's timezone), the counter is stale - treat as 0
  let effectiveEmailsToday = emailsSentToday || 0
  if (lastEmailSentAt) {
    const lastSentDate = getDateInTimezone(lastEmailSentAt, timezone)
    const todayDate = getTodayInTimezone(timezone)
    if (lastSentDate !== todayDate) {
      effectiveEmailsToday = 0 // New day in user's timezone, reset counter
    }
  }

  // Check daily limit
  if (effectiveEmailsToday >= EMAIL_RATE_LIMITS.max_per_day) {
    return { allowed: false, reason: "Daily email limit reached" }
  }

  // Check minimum interval
  if (lastEmailSentAt) {
    const lastSent = new Date(lastEmailSentAt)
    const hoursSinceLastEmail = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLastEmail < EMAIL_RATE_LIMITS.min_interval_hours) {
      return {
        allowed: false,
        reason: `Minimum interval not met (${EMAIL_RATE_LIMITS.min_interval_hours}h required)`,
      }
    }
  }

  return { allowed: true }
}

// LEARNING STATE TRACKING

export interface UserLearningState {
  user_id: string
  topics: {
    [topic_id: string]: TopicLearningState
  }
  last_session_at?: string
  streak_days: number
  updated_at: string
}

export interface TopicLearningState {
  topic_name: string
  pattern?: string
  scenario_id?: string
  last_practiced_at: string
  performance_score: number
  review_count: number
  next_review_at: string
  interval_days: number
  ease_factor: number // SM-2 algorithm ease factor (default 2.5)
}

/**
 * Calculate next review date using SM-2 spaced repetition algorithm
 *
 * SM-2 Algorithm:
 * - If quality >= 3: interval = previous_interval * ease_factor
 * - If quality < 3: reset interval to 1 day
 * - Ease factor adjusts based on performance
 */
export function calculateNextReview(
  previousInterval: number,
  easeFactor: number,
  qualityScore: number // 0-5 scale (0-2 fail, 3+ pass)
): { nextIntervalDays: number; newEaseFactor: number } {
  // Convert 0-100 score to 0-5 quality
  const quality = Math.round((qualityScore / 100) * 5)

  let nextInterval: number
  let newEaseFactor = easeFactor

  if (quality < 3) {
    // Failed review - reset to beginning
    nextInterval = 1
  } else {
    // Successful review - increase interval
    if (previousInterval === 0) {
      nextInterval = 1
    } else if (previousInterval === 1) {
      nextInterval = 3
    } else {
      nextInterval = Math.round(previousInterval * easeFactor)
    }

    // Adjust ease factor
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    // Minimum ease factor is 1.3
    newEaseFactor = Math.max(1.3, newEaseFactor)
  }

  // Cap at 180 days
  nextInterval = Math.min(nextInterval, 180)

  return {
    nextIntervalDays: nextInterval,
    newEaseFactor: newEaseFactor,
  }
}

/**
 * Get topics that are due for review
 */
export function getTopicsDueForReview(learningState: UserLearningState): TopicLearningState[] {
  const now = new Date()
  const dueTopics: TopicLearningState[] = []

  for (const topicId in learningState.topics) {
    const topic = learningState.topics[topicId]
    const nextReview = new Date(topic.next_review_at)

    if (nextReview <= now) {
      dueTopics.push(topic)
    }
  }

  // Sort by urgency (most overdue first)
  return dueTopics.sort((a, b) => {
    const aOverdue = now.getTime() - new Date(a.next_review_at).getTime()
    const bOverdue = now.getTime() - new Date(b.next_review_at).getTime()
    return bOverdue - aOverdue
  })
}
