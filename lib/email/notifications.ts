/**
 * Email Notification Service
 *
 * The send functions for every email CodeSparring delivers:
 * - Welcome (on signup, with a cron fallback)
 * - Activation nudge (signed up, never ran a session)
 * - Inactivity, spaced repetition, and roadmap reminders (cron)
 * - First-session feedback ask (cron)
 * - Billing: payment failed, subscription confirm/cancel, trial ending,
 *   yearly expiry reminder, yearly expired
 *
 * Reminder-class senders take the userId so they can mint a tokenized no-login
 * unsubscribe link and the matching List-Unsubscribe headers. Transactional and
 * billing emails carry neither: they are triggered by the user's own account
 * activity and must always deliver.
 */

import { sendEmail, upsertContact, EmailResult } from "./brevo"
import { getAppBaseUrl } from "../site-url"
import { DEFAULT_TIMEZONE, getTodayInTimezone, getDateInTimezone } from "./timezone"
import { listUnsubscribeHeaders, unsubscribeUrlFor, type UnsubscribeCategory } from "./unsubscribe"
import type { EmailRenderOptions } from "./templates"
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
  getDailyRoadmapEmailSubject,
  getDailyRoadmapEmailHtml,
  getDailyRoadmapEmailText,
  DailyRoadmapEmailData,
  getInterviewCountdownEmailSubject,
  getInterviewCountdownEmailHtml,
  getInterviewCountdownEmailText,
  InterviewCountdownEmailData,
  getBehindScheduleEmailSubject,
  getBehindScheduleEmailHtml,
  getBehindScheduleEmailText,
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
  getYearlyExpiredEmailSubject,
  getYearlyExpiredEmailHtml,
  getYearlyExpiredEmailText,
  YearlyExpiredEmailData,
  getYearlyExpiryReminderEmailSubject,
  getYearlyExpiryReminderEmailHtml,
  getYearlyExpiryReminderEmailText,
  YearlyExpiryReminderEmailData,
  getActivationNudgeEmailSubject,
  getActivationNudgeEmailHtml,
  getActivationNudgeEmailText,
  ActivationNudgeEmailData,
  getFirstSessionFeedbackEmailSubject,
  getFirstSessionFeedbackEmailHtml,
  getFirstSessionFeedbackEmailText,
  FirstSessionFeedbackEmailData,
} from "./templates"

/** Unsubscribe link + headers for one reminder-class send. */
function reminderDelivery(
  userId: string,
  category: UnsubscribeCategory
): { renderOptions: EmailRenderOptions; headers?: Record<string, string> } {
  return {
    renderOptions: { unsubscribeUrl: unsubscribeUrlFor(userId, category) },
    headers: listUnsubscribeHeaders(userId, category),
  }
}

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
    appUrl: getAppBaseUrl(),
  }

  return sendEmail({
    to: [{ email, name: displayName }],
    subject: getWelcomeEmailSubject(),
    htmlContent: getWelcomeEmailHtml(data),
    textContent: getWelcomeEmailText(data),
    tags: ["welcome", "onboarding"],
  })
}

// ACTIVATION NUDGE (reminder; rides the inactivity unsubscribe category)

export async function sendActivationNudgeEmail(
  userId: string,
  email: string,
  data: Omit<ActivationNudgeEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: ActivationNudgeEmailData = { ...data, appUrl: getAppBaseUrl() }
  const delivery = reminderDelivery(userId, "inactivity")

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getActivationNudgeEmailSubject(),
    htmlContent: getActivationNudgeEmailHtml(emailData, delivery.renderOptions),
    textContent: getActivationNudgeEmailText(emailData, delivery.renderOptions),
    headers: delivery.headers,
    tags: ["activation-nudge", "onboarding"],
  })
}

// FIRST-SESSION FEEDBACK ASK (reminder; rides the inactivity unsubscribe category)

export async function sendFirstSessionFeedbackEmail(
  userId: string,
  email: string,
  data: Omit<FirstSessionFeedbackEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: FirstSessionFeedbackEmailData = { ...data, appUrl: getAppBaseUrl() }
  const delivery = reminderDelivery(userId, "inactivity")

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getFirstSessionFeedbackEmailSubject(),
    htmlContent: getFirstSessionFeedbackEmailHtml(emailData, delivery.renderOptions),
    textContent: getFirstSessionFeedbackEmailText(emailData, delivery.renderOptions),
    headers: delivery.headers,
    tags: ["first-session-feedback", "onboarding"],
  })
}

// INACTIVITY REMINDER

export async function sendInactivityEmail(
  userId: string,
  email: string,
  data: Omit<InactivityEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: InactivityEmailData = { ...data, appUrl: getAppBaseUrl() }
  const delivery = reminderDelivery(userId, "inactivity")

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getInactivityEmailSubject(data.hoursSinceLastSession, data.lastTopic),
    htmlContent: getInactivityEmailHtml(emailData, delivery.renderOptions),
    textContent: getInactivityEmailText(emailData, delivery.renderOptions),
    headers: delivery.headers,
    tags: ["inactivity", "re-engagement"],
  })
}

// SPACED REPETITION REMINDER

export async function sendSpacedRepetitionEmail(
  userId: string,
  email: string,
  data: Omit<SpacedRepetitionEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: SpacedRepetitionEmailData = { ...data, appUrl: getAppBaseUrl() }
  const delivery = reminderDelivery(userId, "spaced_repetition")

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getSpacedRepetitionEmailSubject(emailData),
    htmlContent: getSpacedRepetitionEmailHtml(emailData, delivery.renderOptions),
    textContent: getSpacedRepetitionEmailText(emailData, delivery.renderOptions),
    headers: delivery.headers,
    tags: ["spaced-repetition", "learning"],
  })
}

// ROADMAP: DAILY PRACTICE REMINDER

export async function sendDailyRoadmapEmail(
  userId: string,
  email: string,
  data: Omit<DailyRoadmapEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: DailyRoadmapEmailData = { ...data, appUrl: getAppBaseUrl() }
  const delivery = reminderDelivery(userId, "roadmap")

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getDailyRoadmapEmailSubject(emailData),
    htmlContent: getDailyRoadmapEmailHtml(emailData, delivery.renderOptions),
    textContent: getDailyRoadmapEmailText(emailData, delivery.renderOptions),
    headers: delivery.headers,
    tags: ["roadmap", "daily-reminder"],
  })
}

// ROADMAP: INTERVIEW COUNTDOWN

export async function sendInterviewCountdownEmail(
  userId: string,
  email: string,
  data: Omit<InterviewCountdownEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: InterviewCountdownEmailData = { ...data, appUrl: getAppBaseUrl() }
  const delivery = reminderDelivery(userId, "roadmap")

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getInterviewCountdownEmailSubject(emailData),
    htmlContent: getInterviewCountdownEmailHtml(emailData, delivery.renderOptions),
    textContent: getInterviewCountdownEmailText(emailData, delivery.renderOptions),
    headers: delivery.headers,
    tags: ["roadmap", "interview-countdown"],
  })
}

// ROADMAP: BEHIND SCHEDULE ALERT

export async function sendBehindScheduleEmail(
  userId: string,
  email: string,
  data: Omit<BehindScheduleEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: BehindScheduleEmailData = { ...data, appUrl: getAppBaseUrl() }
  const delivery = reminderDelivery(userId, "roadmap")

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getBehindScheduleEmailSubject(emailData),
    htmlContent: getBehindScheduleEmailHtml(emailData, delivery.renderOptions),
    textContent: getBehindScheduleEmailText(emailData, delivery.renderOptions),
    headers: delivery.headers,
    tags: ["roadmap", "behind-schedule"],
  })
}

// PAYMENT FAILURE NOTIFICATION

export async function sendPaymentFailedEmail(
  email: string,
  data: Omit<PaymentFailedEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: PaymentFailedEmailData = { ...data, appUrl: getAppBaseUrl() }

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
  const emailData: SubscriptionConfirmationEmailData = { ...data, appUrl: getAppBaseUrl() }

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
  const emailData: SubscriptionCancellationEmailData = { ...data, appUrl: getAppBaseUrl() }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getSubscriptionCancellationEmailSubject(data.isImmediate),
    htmlContent: getSubscriptionCancellationEmailHtml(emailData),
    textContent: getSubscriptionCancellationEmailText(emailData),
    tags: ["subscription", "subscription-cancellation"],
  })
}

// YEARLY PLAN EXPIRED (downgrade-day goodbye; one-time payment, nothing charged)

export async function sendYearlyExpiredEmail(
  email: string,
  data: Omit<YearlyExpiredEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: YearlyExpiredEmailData = { ...data, appUrl: getAppBaseUrl() }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getYearlyExpiredEmailSubject(),
    htmlContent: getYearlyExpiredEmailHtml(emailData),
    textContent: getYearlyExpiredEmailText(emailData),
    tags: ["subscription", "yearly-expired"],
  })
}

// YEARLY EXPIRY REMINDER (7-day and 1-day marks before a one-time yearly plan ends)

export async function sendYearlyExpiryReminderEmail(
  email: string,
  data: Omit<YearlyExpiryReminderEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: YearlyExpiryReminderEmailData = { ...data, appUrl: getAppBaseUrl() }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getYearlyExpiryReminderEmailSubject(emailData),
    htmlContent: getYearlyExpiryReminderEmailHtml(emailData),
    textContent: getYearlyExpiryReminderEmailText(emailData),
    tags: ["subscription", "yearly-expiry-reminder"],
  })
}

// TRIAL ENDING NOTIFICATION (Stripe trial_will_end only: a real auto-charge is coming)

export async function sendTrialEndingEmail(
  email: string,
  data: Omit<TrialEndingEmailData, "appUrl">
): Promise<EmailResult> {
  const emailData: TrialEndingEmailData = { ...data, appUrl: getAppBaseUrl() }

  return sendEmail({
    to: [{ email, name: data.userName }],
    subject: getTrialEndingEmailSubject(emailData),
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
  /** Deprecated: milestone emails were removed 2026-08-14; field kept because stored docs carry it. */
  milestone_celebrations?: boolean
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
