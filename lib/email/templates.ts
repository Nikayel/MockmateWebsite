/**
 * Email templates for CodeSparring.
 *
 * Voice contract (2026-08-14 email council): sentence case, lowkey and direct, no hype,
 * no invented statistics, no emoji, no en/em dashes as punctuation. Claims come from the
 * pricing truth sheet only. The sender stays personal ("Nikayel from CodeSparring") for
 * Primary-inbox placement; the signature is a plain "Nikayel".
 *
 * Structure rules:
 * - Every template ships an HTML part and a matching plain-text part.
 * - Transactional emails (welcome, billing) carry no unsubscribe footer.
 * - Reminder emails carry a tokenized one-click unsubscribe plus a preferences link.
 * - User-controlled strings (names, topics, company names) are HTML-escaped at this
 *   boundary; they arrive from Firestore profiles and roadmaps, which users write.
 *
 * lib/email/__tests__/email-content-guard.test.ts enforces the banned-phrase list,
 * character rules, and text parity. Change copy here, run that test.
 */

import { getAppBaseUrl } from "../site-url"

// Email type determines footer behavior
type EmailType = "transactional" | "reminder"

export interface EmailRenderOptions {
  /** Tokenized no-login unsubscribe URL; reminder footers render it when present. */
  unsubscribeUrl?: string
  /** Hidden preview line shown by inbox list views; use sparingly. */
  preheader?: string
}

/** The preferences link every reminder email carries in its footer. */
function accountPreferencesUrl(): string {
  return `${getAppBaseUrl()}/account`
}

/** Escape user-controlled text before interpolating it into HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function firstNameOf(userName: string | undefined): string {
  return userName?.split(" ")[0] || "there"
}

// Clean email wrapper with minimal styling
const emailWrapper = (
  content: string,
  emailType: EmailType = "transactional",
  options: EmailRenderOptions = {}
) => {
  const preferencesUrl = accountPreferencesUrl()

  // Reminder emails must be trivially escapable without logging in. The tokenized
  // unsubscribe link works signed out; the preferences link covers finer control.
  // A postal address line belongs here once the owner supplies one (see the
  // launch checklist); never fabricate an address.
  const footer =
    emailType === "reminder"
      ? `<p style="margin-top: 32px; font-size: 13px; color: #666;">
        ${options.unsubscribeUrl ? `<a href="${options.unsubscribeUrl}" style="color: #666;">unsubscribe</a> &middot; ` : ""}<a href="${preferencesUrl}" style="color: #666;">email preferences</a>
       </p>`
      : ""

  const preheaderHtml = options.preheader
    ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(options.preheader)}</div>`
    : ""

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px 20px; background-color: #ffffff;">
  ${preheaderHtml}
  <!-- Subtle brand header -->
  <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;">
    <span style="font-size: 15px; font-weight: 600; color: #333;">CodeSparring</span>
  </div>

  <!-- Email content -->
  <div style="font-size: 15px;">
    ${content}
  </div>

  ${footer}
</body>
</html>
`
}

// Styled CTA button
const ctaButton = (text: string, url: string) => `
  <p style="margin: 24px 0;">
    <a href="${url}" style="display: inline-block; background-color: #0066cc; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">${text}</a>
  </p>
`

/** Plain-text footer for reminder emails; mirrors the HTML footer. */
function reminderTextFooter(options: EmailRenderOptions = {}): string {
  const lines = ["---"]
  if (options.unsubscribeUrl) lines.push(`unsubscribe: ${options.unsubscribeUrl}`)
  lines.push(`email preferences: ${accountPreferencesUrl()}`)
  return lines.join("\n")
}

// Signature block
const signature = (includeTitle = false) => `
  <p style="margin-top: 24px; color: #333;">
    Nikayel${includeTitle ? `<br><span style="color: #666; font-size: 14px;">founder, CodeSparring</span>` : ""}
  </p>
`

// WELCOME EMAIL (transactional)

export interface WelcomeEmailData {
  userName: string
  userEmail: string
  appUrl: string
}

export function getWelcomeEmailSubject(): string {
  return "Quick hello from Nikayel"
}

export function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const firstName = escapeHtml(firstNameOf(data.userName))

  const content = `
    <p>Hey ${firstName},</p>

    <p>Thanks for signing up. Quick orientation so you know what you have:</p>

    <ul style="padding-left: 20px; color: #333;">
      <li style="margin-bottom: 6px;">Interview practice with an AI interviewer: DSA (170+ scenarios across 18 patterns) and debugging. You code, it asks follow-ups, you get feedback at the end.</li>
      <li style="margin-bottom: 6px;">Free courses at <a href="${data.appUrl}/learn" style="color: #0066cc; text-decoration: none;">/learn</a>: Python, SQL and data engineering, system design, and applied JS and React. No paywall on any of them.</li>
    </ul>

    <p>Short, regular sessions beat cramming. That's the whole design.</p>

    ${ctaButton("Start practicing", `${data.appUrl}/dashboard`)}

    <p>If something is confusing or broken, reply to this email. It comes straight to me.</p>

    ${signature(true)}
  `

  return emailWrapper(content, "transactional")
}

export function getWelcomeEmailText(data: WelcomeEmailData): string {
  const firstName = firstNameOf(data.userName)

  return `
Hey ${firstName},

Thanks for signing up. Quick orientation so you know what you have:

- Interview practice with an AI interviewer: DSA (170+ scenarios across 18 patterns) and debugging. You code, it asks follow-ups, you get feedback at the end.
- Free courses at ${data.appUrl}/learn: Python, SQL and data engineering, system design, and applied JS and React. No paywall on any of them.

Short, regular sessions beat cramming. That's the whole design.

Start practicing: ${data.appUrl}/dashboard

If something is confusing or broken, reply to this email. It comes straight to me.

Nikayel
founder, CodeSparring
  `.trim()
}

// INACTIVITY REMINDER (reminder)

export interface InactivityEmailData {
  userName: string
  userEmail: string
  hoursSinceLastSession: number
  lastTopic?: string
  streakDays?: number
  appUrl: string
}

export function getInactivityEmailSubject(hours: number, lastTopic?: string): string {
  if (hours < 48) {
    return "Pick up where you left off"
  } else if (hours < 72) {
    return "Been a few days"
  }
  return lastTopic ? `Still on ${lastTopic}?` : "Pick up where you left off"
}

export function getInactivityEmailHtml(
  data: InactivityEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = escapeHtml(firstNameOf(data.userName))
  const days = Math.floor(data.hoursSinceLastSession / 24)

  const content = `
    <p>Hey ${firstName},</p>

    <p>It's been ${days} day${days !== 1 ? "s" : ""} since your last session.</p>

    ${data.lastTopic ? `<p>You were working on <strong>${escapeHtml(data.lastTopic)}</strong>. A short review now does more than a long session later.</p>` : ""}

    ${data.streakDays && data.streakDays > 0 ? `<p>You also had a <strong>${data.streakDays}-day streak</strong> going.</p>` : ""}

    <p>Even 10 minutes counts.</p>

    ${ctaButton("Do a quick session", `${data.appUrl}/dashboard`)}

    ${signature()}
  `

  return emailWrapper(content, "reminder", options)
}

export function getInactivityEmailText(
  data: InactivityEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = firstNameOf(data.userName)
  const days = Math.floor(data.hoursSinceLastSession / 24)

  return `
Hey ${firstName},

It's been ${days} day${days !== 1 ? "s" : ""} since your last session.

${data.lastTopic ? `You were working on ${data.lastTopic}. A short review now does more than a long session later.\n` : ""}${data.streakDays && data.streakDays > 0 ? `You also had a ${data.streakDays}-day streak going.\n` : ""}
Even 10 minutes counts.

Do a quick session: ${data.appUrl}/dashboard

Nikayel

${reminderTextFooter(options)}
  `.trim()
}

// SPACED REPETITION REMINDER (reminder)

export interface SpacedRepetitionEmailData {
  userName: string
  userEmail: string
  topic: string
  pattern?: string
  daysSinceReview: number
  lastScore?: number
  reviewCount?: number
  appUrl: string
  scenarioId?: string
}

export function getSpacedRepetitionEmailSubject(data: SpacedRepetitionEmailData): string {
  return `Good time to review ${data.topic}`
}

/** The one preheader in the system; inbox preview for the review nudge. */
export const SPACED_REPETITION_PREHEADER = "A short review beats a long cram session."

export function getSpacedRepetitionEmailHtml(
  data: SpacedRepetitionEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = escapeHtml(firstNameOf(data.userName))
  const topic = escapeHtml(data.topic)
  const reviewUrl = data.scenarioId
    ? `${data.appUrl}/interview/${data.scenarioId}`
    : `${data.appUrl}/dashboard`

  const content = `
    <p>Hey ${firstName},</p>

    <p>You practiced <strong>${topic}</strong> ${data.daysSinceReview} days ago${data.lastScore ? ` and scored ${data.lastScore}%` : ""}.</p>

    <p>It just came up for review. The schedule is spaced repetition: reviewing right around the point you start to forget is what makes it stick, so now is a better time than later.</p>

    ${data.pattern ? `<p style="color: #666;">Pattern: ${escapeHtml(data.pattern)}</p>` : ""}

    ${ctaButton(`Review ${topic}`, reviewUrl)}

    ${signature()}
  `

  return emailWrapper(content, "reminder", {
    preheader: SPACED_REPETITION_PREHEADER,
    ...options,
  })
}

export function getSpacedRepetitionEmailText(
  data: SpacedRepetitionEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = firstNameOf(data.userName)
  const reviewUrl = data.scenarioId
    ? `${data.appUrl}/interview/${data.scenarioId}`
    : `${data.appUrl}/dashboard`

  return `
Hey ${firstName},

You practiced ${data.topic} ${data.daysSinceReview} days ago${data.lastScore ? ` and scored ${data.lastScore}%` : ""}.

It just came up for review. The schedule is spaced repetition: reviewing right around the point you start to forget is what makes it stick, so now is a better time than later.

${data.pattern ? `Pattern: ${data.pattern}\n` : ""}
Review now: ${reviewUrl}

Nikayel

${reminderTextFooter(options)}
  `.trim()
}

// ROADMAP: DAILY PRACTICE REMINDER (reminder)

export interface DailyRoadmapEmailData {
  userName: string
  userEmail: string
  targetCompany: string
  daysUntilInterview: number
  todaysQuestions: Array<{
    title: string
    pattern: string
    difficulty: string
    scenarioId?: string
  }>
  questionsCompleted: number
  totalQuestions: number
  isOnTrack: boolean
  appUrl: string
}

export function getDailyRoadmapEmailSubject(data: DailyRoadmapEmailData): string {
  if (data.daysUntilInterview <= 3) {
    return `${data.daysUntilInterview} days left: today's prep`
  }
  return `Today's ${data.targetCompany} prep`
}

export function getDailyRoadmapEmailHtml(
  data: DailyRoadmapEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = escapeHtml(firstNameOf(data.userName))
  const company = escapeHtml(data.targetCompany)
  const progressPercent = Math.round((data.questionsCompleted / data.totalQuestions) * 100)

  const questionsHtml = data.todaysQuestions
    .map(
      (q) =>
        `<li style="margin-bottom: 8px;"><strong>${escapeHtml(q.title)}</strong><br><span style="color: #666; font-size: 13px;">${escapeHtml(q.pattern)} &middot; ${escapeHtml(q.difficulty)}</span></li>`
    )
    .join("\n")

  const urgencyNote =
    data.daysUntilInterview <= 7
      ? `<p style="font-weight: 500;">${data.daysUntilInterview} day${data.daysUntilInterview !== 1 ? "s" : ""} until your ${company} interview.</p>`
      : ""

  const onTrackNote = !data.isOnTrack
    ? `<p style="color: #666; font-size: 14px;">Heads up: you're a bit behind schedule. Today's set gets you back on track.</p>`
    : ""

  const content = `
    <p>Hey ${firstName},</p>

    ${urgencyNote}

    <p>Here's today's practice for your <strong>${company}</strong> roadmap:</p>

    <ul style="padding-left: 20px; margin: 16px 0;">
      ${questionsHtml}
    </ul>

    <p style="color: #666; font-size: 14px;">Progress: ${data.questionsCompleted}/${data.totalQuestions} (${progressPercent}%)</p>

    ${onTrackNote}

    ${ctaButton("Start today's practice", `${data.appUrl}/roadmap`)}

    ${signature()}
  `

  return emailWrapper(content, "reminder", options)
}

export function getDailyRoadmapEmailText(
  data: DailyRoadmapEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = firstNameOf(data.userName)
  const questionsText = data.todaysQuestions
    .map((q, i) => `${i + 1}. ${q.title} (${q.pattern}, ${q.difficulty})`)
    .join("\n")

  return `
Hey ${firstName},

${data.daysUntilInterview <= 7 ? `${data.daysUntilInterview} day${data.daysUntilInterview !== 1 ? "s" : ""} until your ${data.targetCompany} interview.\n` : ""}
Here's today's practice:

${questionsText}

Progress: ${data.questionsCompleted}/${data.totalQuestions}

Start today's practice: ${data.appUrl}/roadmap

Nikayel

${reminderTextFooter(options)}
  `.trim()
}

// ROADMAP: INTERVIEW COUNTDOWN (reminder)

export interface InterviewCountdownEmailData {
  userName: string
  userEmail: string
  targetCompany: string
  daysUntilInterview: number
  questionsCompleted: number
  totalQuestions: number
  patternsToFocus: string[]
  appUrl: string
}

export function getInterviewCountdownEmailSubject(data: InterviewCountdownEmailData): string {
  if (data.daysUntilInterview === 1) {
    return `${data.targetCompany} is tomorrow`
  }
  return `${data.daysUntilInterview} days until ${data.targetCompany}`
}

export function getInterviewCountdownEmailHtml(
  data: InterviewCountdownEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = escapeHtml(firstNameOf(data.userName))
  const company = escapeHtml(data.targetCompany)
  const progressPercent = Math.round((data.questionsCompleted / data.totalQuestions) * 100)

  const focusPatterns =
    data.patternsToFocus.length > 0
      ? `<p><strong>Focus areas:</strong></p><ul style="padding-left: 20px;">${data.patternsToFocus.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
      : ""

  const finalTips =
    data.daysUntilInterview <= 3
      ? `
    <div style="background-color: #f8f8f8; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 500;">Final stretch:</p>
      <ul style="padding-left: 20px; margin: 0; color: #666; font-size: 14px;">
        <li>Review patterns you've solved; don't learn new ones now</li>
        <li>Get good sleep; it consolidates memory</li>
        <li>Practice explaining your approach out loud</li>
      </ul>
    </div>
  `
      : ""

  const content = `
    <p>Hey ${firstName},</p>

    <p>Your <strong>${company}</strong> interview is ${data.daysUntilInterview === 1 ? "tomorrow" : `in ${data.daysUntilInterview} days`}.</p>

    <p>You've completed <strong>${progressPercent}%</strong> of your roadmap (${data.questionsCompleted}/${data.totalQuestions}).</p>

    ${focusPatterns}

    ${finalTips}

    ${ctaButton("Continue preparing", `${data.appUrl}/roadmap`)}

    <p style="color: #666; font-size: 14px;">You've put in the work.</p>

    ${signature()}
  `

  return emailWrapper(content, "reminder", options)
}

export function getInterviewCountdownEmailText(
  data: InterviewCountdownEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = firstNameOf(data.userName)
  const progressPercent = Math.round((data.questionsCompleted / data.totalQuestions) * 100)
  const focusText =
    data.patternsToFocus.length > 0
      ? `\nFocus areas:\n${data.patternsToFocus.map((p) => `- ${p}`).join("\n")}\n`
      : ""
  const tipsText =
    data.daysUntilInterview <= 3
      ? `
Final stretch:
- Review patterns you've solved; don't learn new ones now
- Get good sleep; it consolidates memory
- Practice explaining your approach out loud
`
      : ""

  return `
Hey ${firstName},

Your ${data.targetCompany} interview is ${data.daysUntilInterview === 1 ? "tomorrow" : `in ${data.daysUntilInterview} days`}.

You've completed ${progressPercent}% of your roadmap (${data.questionsCompleted}/${data.totalQuestions}).
${focusText}${tipsText}
Continue preparing: ${data.appUrl}/roadmap

You've put in the work.

Nikayel

${reminderTextFooter(options)}
  `.trim()
}

// ROADMAP: BEHIND SCHEDULE ALERT (reminder)

export interface BehindScheduleEmailData {
  userName: string
  userEmail: string
  targetCompany: string
  daysUntilInterview: number
  questionsBehind: number
  suggestedDailyQuestions: number
  appUrl: string
}

export function getBehindScheduleEmailSubject(data: BehindScheduleEmailData): string {
  return `Catching up on ${data.targetCompany} prep`
}

export function getBehindScheduleEmailHtml(
  data: BehindScheduleEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = escapeHtml(firstNameOf(data.userName))
  const company = escapeHtml(data.targetCompany)

  const content = `
    <p>Hey ${firstName},</p>

    <p>You're <strong>${data.questionsBehind} questions behind</strong> on your ${company} roadmap with ${data.daysUntilInterview} days left.</p>

    <p>Here's the catch-up math: aim for <strong>${data.suggestedDailyQuestions} questions per day</strong> from here on out.</p>

    <p style="color: #666; font-size: 14px;">Don't try to do it all at once. Consistent daily practice, even 1 or 2 problems, beats cramming.</p>

    ${ctaButton("Start catching up", `${data.appUrl}/roadmap`)}

    ${signature()}
  `

  return emailWrapper(content, "reminder", options)
}

export function getBehindScheduleEmailText(
  data: BehindScheduleEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = firstNameOf(data.userName)

  return `
Hey ${firstName},

You're ${data.questionsBehind} questions behind on your ${data.targetCompany} roadmap with ${data.daysUntilInterview} days left.

Here's the catch-up math: aim for ${data.suggestedDailyQuestions} questions per day from here on out.

Don't try to do it all at once. Consistent daily practice, even 1 or 2 problems, beats cramming.

Start catching up: ${data.appUrl}/roadmap

Nikayel

${reminderTextFooter(options)}
  `.trim()
}

// PAYMENT FAILURE (transactional)

export interface PaymentFailedEmailData {
  userName: string
  userEmail: string
  failureReason?: string
  appUrl: string
}

export function getPaymentFailedEmailSubject(): string {
  return "Your CodeSparring payment didn't go through"
}

export function getPaymentFailedEmailHtml(data: PaymentFailedEmailData): string {
  const firstName = escapeHtml(firstNameOf(data.userName))

  const content = `
    <p>Hey ${firstName},</p>

    <p>Heads up: we had trouble processing your payment for CodeSparring Pro.${data.failureReason ? ` (${escapeHtml(data.failureReason)})` : ""}</p>

    <p>To keep your Pro access, you'll need to update your payment method.</p>

    ${ctaButton("Update payment method", `${data.appUrl}/account`)}

    <p style="color: #666; font-size: 14px;">We'll retry in a few days. If it still fails, your account moves to the free plan.</p>

    <p>Questions? Just reply to this email.</p>

    ${signature()}
  `

  return emailWrapper(content, "transactional")
}

export function getPaymentFailedEmailText(data: PaymentFailedEmailData): string {
  const firstName = firstNameOf(data.userName)

  return `
Hey ${firstName},

Heads up: we had trouble processing your payment for CodeSparring Pro.${data.failureReason ? ` (${data.failureReason})` : ""}

To keep your Pro access, update your payment method:
${data.appUrl}/account

We'll retry in a few days. If it still fails, your account moves to the free plan.

Questions? Just reply to this email.

Nikayel
  `.trim()
}

// SUBSCRIPTION CONFIRMATION (transactional)

export interface SubscriptionConfirmationEmailData {
  userName: string
  userEmail: string
  planName: string
  amount: number
  currency: string
  /**
   * Monthly plans: the renewal date. One-time yearly plans: the access-until date.
   * The isOneTime flag decides which framing renders; yearly must NEVER read as
   * auto-renewing (the cron downgrades yearly at period end, nothing is charged).
   */
  nextBillingDate?: string
  isOneTime?: boolean
  appUrl: string
}

function formatBillingDate(iso: string | undefined): string {
  if (!iso) return "N/A"
  const parsed = new Date(iso)
  if (isNaN(parsed.getTime())) return "N/A"
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export function getSubscriptionConfirmationEmailSubject(): string {
  return "You're set with Pro"
}

export function getSubscriptionConfirmationEmailHtml(
  data: SubscriptionConfirmationEmailData
): string {
  const firstName = escapeHtml(firstNameOf(data.userName))
  const formattedDate = formatBillingDate(data.nextBillingDate)

  const planBlock = data.isOneTime
    ? `
      <p style="margin: 0; color: #666; font-size: 14px;">
        Plan: ${escapeHtml(data.planName)}<br>
        Amount: ${escapeHtml(data.currency)} ${data.amount.toFixed(2)}, one-time payment<br>
        Access until: ${formattedDate}
      </p>`
    : `
      <p style="margin: 0; color: #666; font-size: 14px;">
        Plan: ${escapeHtml(data.planName)}<br>
        Amount: ${escapeHtml(data.currency)} ${data.amount.toFixed(2)}<br>
        Renews: ${formattedDate}
      </p>`

  const oneTimeNote = data.isOneTime
    ? `<p>This is a one-time payment, not an auto-renewing subscription. Nothing else gets charged. We'll email you before your year is up.</p>`
    : ""

  const content = `
    <p>Hey ${firstName},</p>

    <p>Thanks for upgrading. Pro is active on your account.</p>

    <div style="background-color: #f8f8f8; padding: 16px; border-radius: 6px; margin: 16px 0;">
      ${planBlock}
    </div>

    ${oneTimeNote}

    <p>Pro gives you 35 interview sessions a month, spaced repetition scheduling, and a personalized study roadmap.</p>

    ${ctaButton("Start practicing", `${data.appUrl}/dashboard`)}

    <p>Questions or anything broken, just reply.</p>

    ${signature()}
  `

  return emailWrapper(content, "transactional")
}

export function getSubscriptionConfirmationEmailText(
  data: SubscriptionConfirmationEmailData
): string {
  const firstName = firstNameOf(data.userName)
  const formattedDate = formatBillingDate(data.nextBillingDate)

  const planBlock = data.isOneTime
    ? `Plan: ${data.planName}
Amount: ${data.currency} ${data.amount.toFixed(2)}, one-time payment
Access until: ${formattedDate}

This is a one-time payment, not an auto-renewing subscription. Nothing else gets charged. We'll email you before your year is up.`
    : `Plan: ${data.planName}
Amount: ${data.currency} ${data.amount.toFixed(2)}
Renews: ${formattedDate}`

  return `
Hey ${firstName},

Thanks for upgrading. Pro is active on your account.

${planBlock}

Pro gives you 35 interview sessions a month, spaced repetition scheduling, and a personalized study roadmap.

Start practicing: ${data.appUrl}/dashboard

Questions or anything broken, just reply.

Nikayel
  `.trim()
}

// SUBSCRIPTION CANCELLATION (transactional)

export interface SubscriptionCancellationEmailData {
  userName: string
  userEmail: string
  accessUntil?: string
  isImmediate: boolean
  appUrl: string
}

export function getSubscriptionCancellationEmailSubject(isImmediate: boolean): string {
  return isImmediate ? "Your Pro access has ended" : "Confirming your cancellation"
}

export function getSubscriptionCancellationEmailHtml(
  data: SubscriptionCancellationEmailData
): string {
  const firstName = escapeHtml(firstNameOf(data.userName))
  const formattedDate = data.accessUntil ? formatBillingDate(data.accessUntil) : "today"

  if (data.isImmediate) {
    return emailWrapper(
      `
      <p>Hey ${firstName},</p>

      <p>Your CodeSparring Pro subscription has ended. You're now on the free plan (8 sessions per month).</p>

      <p>Your progress and history are still here if you want to come back.</p>

      ${ctaButton("Resubscribe anytime", `${data.appUrl}/pricing`)}

      <p>If there's anything that would've made it better, reply and tell me.</p>

      ${signature()}
    `,
      "transactional"
    )
  }

  return emailWrapper(
    `
    <p>Hey ${firstName},</p>

    <p>Got your cancellation request. Your Pro subscription is set to end on <strong>${formattedDate}</strong>.</p>

    <p>You'll have full Pro access until then, so make the most of it.</p>

    <p>Changed your mind?</p>

    ${ctaButton("Reactivate subscription", `${data.appUrl}/account`)}

    <p>If there's anything that would've made it better, reply and tell me.</p>

    ${signature()}
  `,
    "transactional"
  )
}

export function getSubscriptionCancellationEmailText(
  data: SubscriptionCancellationEmailData
): string {
  const firstName = firstNameOf(data.userName)
  const formattedDate = data.accessUntil ? formatBillingDate(data.accessUntil) : "today"

  if (data.isImmediate) {
    return `
Hey ${firstName},

Your CodeSparring Pro subscription has ended. You're now on the free plan (8 sessions per month).

Your progress and history are still here if you want to come back.

Resubscribe anytime: ${data.appUrl}/pricing

If there's anything that would've made it better, reply and tell me.

Nikayel
    `.trim()
  }

  return `
Hey ${firstName},

Got your cancellation request. Your Pro subscription is set to end on ${formattedDate}.

You'll have full Pro access until then, so make the most of it.

Changed your mind? Reactivate: ${data.appUrl}/account

If there's anything that would've made it better, reply and tell me.

Nikayel
  `.trim()
}

// YEARLY PLAN EXPIRED (transactional; sent by the cron on downgrade day)

export interface YearlyExpiredEmailData {
  userName: string
  userEmail: string
  appUrl: string
}

export function getYearlyExpiredEmailSubject(): string {
  return "Your year of Pro has ended"
}

export function getYearlyExpiredEmailHtml(data: YearlyExpiredEmailData): string {
  const firstName = escapeHtml(firstNameOf(data.userName))

  const content = `
    <p>Hey ${firstName},</p>

    <p>Your year of Pro ended today. Yearly Pro is a one-time payment, so nothing was charged.</p>

    <p>Your account is now on the free plan: 8 interview sessions a month. Your progress, history, and reviews all stay put.</p>

    <p>If you want Pro again, it's at <a href="${data.appUrl}/pricing" style="color: #0066cc; text-decoration: none;">${data.appUrl}/pricing</a>.</p>

    <p>Thanks for being a customer this year.</p>

    ${signature()}
  `

  return emailWrapper(content, "transactional")
}

export function getYearlyExpiredEmailText(data: YearlyExpiredEmailData): string {
  const firstName = firstNameOf(data.userName)

  return `
Hey ${firstName},

Your year of Pro ended today. Yearly Pro is a one-time payment, so nothing was charged.

Your account is now on the free plan: 8 interview sessions a month. Your progress, history, and reviews all stay put.

If you want Pro again, it's at ${data.appUrl}/pricing.

Thanks for being a customer this year.

Nikayel
  `.trim()
}

// YEARLY EXPIRY REMINDER (transactional billing notice; 7-day and 1-day marks)

export interface YearlyExpiryReminderEmailData {
  userName: string
  userEmail: string
  expiryDate: string
  appUrl: string
}

export function getYearlyExpiryReminderEmailSubject(data: YearlyExpiryReminderEmailData): string {
  return `Your Pro access ends ${formatBillingDate(data.expiryDate)}`
}

export function getYearlyExpiryReminderEmailHtml(data: YearlyExpiryReminderEmailData): string {
  const firstName = escapeHtml(firstNameOf(data.userName))
  const formattedDate = formatBillingDate(data.expiryDate)

  const content = `
    <p>Hey ${firstName},</p>

    <p>Heads up: your year of Pro ends on <strong>${formattedDate}</strong>. Yearly Pro is a one-time payment, so nothing gets charged automatically.</p>

    <p>If you want to keep Pro, you can renew at <a href="${data.appUrl}/pricing" style="color: #0066cc; text-decoration: none;">${data.appUrl}/pricing</a>. Otherwise your account moves to the free plan (8 sessions a month) and all your progress and history stay put.</p>

    ${signature()}
  `

  return emailWrapper(content, "transactional")
}

export function getYearlyExpiryReminderEmailText(data: YearlyExpiryReminderEmailData): string {
  const firstName = firstNameOf(data.userName)
  const formattedDate = formatBillingDate(data.expiryDate)

  return `
Hey ${firstName},

Heads up: your year of Pro ends on ${formattedDate}. Yearly Pro is a one-time payment, so nothing gets charged automatically.

If you want to keep Pro, you can renew at ${data.appUrl}/pricing. Otherwise your account moves to the free plan (8 sessions a month) and all your progress and history stay put.

Nikayel
  `.trim()
}

// TRIAL ENDING (transactional; the Stripe trial_will_end path ONLY, where a real
// auto-charge is coming. Yearly expiry uses the reminder template above instead.)

export interface TrialEndingEmailData {
  userName: string
  userEmail: string
  trialEndDate?: string
  appUrl: string
}

export function getTrialEndingEmailSubject(data: TrialEndingEmailData): string {
  return `Your Pro trial ends ${formatBillingDate(data.trialEndDate)}`
}

export function getTrialEndingEmailHtml(data: TrialEndingEmailData): string {
  const firstName = escapeHtml(firstNameOf(data.userName))
  const formattedDate = formatBillingDate(data.trialEndDate)

  const content = `
    <p>Hey ${firstName},</p>

    <p>Your Pro trial ends on <strong>${formattedDate}</strong>. After that, your payment method is charged for Pro ($25/month) unless you cancel first.</p>

    ${ctaButton("Manage subscription", `${data.appUrl}/account`)}

    <p>Questions, just reply.</p>

    ${signature()}
  `

  return emailWrapper(content, "transactional")
}

export function getTrialEndingEmailText(data: TrialEndingEmailData): string {
  const firstName = firstNameOf(data.userName)
  const formattedDate = formatBillingDate(data.trialEndDate)

  return `
Hey ${firstName},

Your Pro trial ends on ${formattedDate}. After that, your payment method is charged for Pro ($25/month) unless you cancel first.

Manage subscription: ${data.appUrl}/account

Questions, just reply.

Nikayel
  `.trim()
}

// ACTIVATION NUDGE (reminder; signed up 2-4 days ago, never ran a session)

export interface ActivationNudgeEmailData {
  userName: string
  userEmail: string
  appUrl: string
}

export function getActivationNudgeEmailSubject(): string {
  return "A 10-minute first session"
}

export function getActivationNudgeEmailHtml(
  data: ActivationNudgeEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = escapeHtml(firstNameOf(data.userName))

  const content = `
    <p>Hey ${firstName},</p>

    <p>You signed up a couple of days ago but haven't run a session yet. Fair enough, starting is the hard part.</p>

    <p>Two low-pressure ways in:</p>

    <ul style="padding-left: 20px; color: #333;">
      <li style="margin-bottom: 6px;">Pick a DSA scenario and try it with the AI interviewer. Ten minutes is enough to see how it works.</li>
      <li style="margin-bottom: 6px;">Or skip interviews entirely and start a free course at <a href="${data.appUrl}/learn" style="color: #0066cc; text-decoration: none;">/learn</a>: Python, SQL, system design, or JS and React. No paywall.</li>
    </ul>

    ${ctaButton("Try a first session", `${data.appUrl}/dashboard`)}

    <p>If something put you off or confused you, reply and tell me. I read everything.</p>

    ${signature()}
  `

  return emailWrapper(content, "reminder", options)
}

export function getActivationNudgeEmailText(
  data: ActivationNudgeEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = firstNameOf(data.userName)

  return `
Hey ${firstName},

You signed up a couple of days ago but haven't run a session yet. Fair enough, starting is the hard part.

Two low-pressure ways in:

- Pick a DSA scenario and try it with the AI interviewer. Ten minutes is enough to see how it works.
- Or skip interviews entirely and start a free course at ${data.appUrl}/learn: Python, SQL, system design, or JS and React. No paywall.

Try a first session: ${data.appUrl}/dashboard

If something put you off or confused you, reply and tell me. I read everything.

Nikayel

${reminderTextFooter(options)}
  `.trim()
}

// FIRST-SESSION FEEDBACK ASK (reminder; one lifetime send after the first session)

export interface FirstSessionFeedbackEmailData {
  userName: string
  userEmail: string
  appUrl: string
}

export function getFirstSessionFeedbackEmailSubject(): string {
  return "How was your first session?"
}

export function getFirstSessionFeedbackEmailHtml(
  data: FirstSessionFeedbackEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = escapeHtml(firstNameOf(data.userName))

  const content = `
    <p>Hey ${firstName},</p>

    <p>You finished your first practice session. Quick question: how was it?</p>

    <p>I'm the founder and I read every reply. What felt off, what was confusing, what almost made you close the tab. One sentence is plenty.</p>

    <p>Nothing to click, just hit reply.</p>

    ${signature()}
  `

  return emailWrapper(content, "reminder", options)
}

export function getFirstSessionFeedbackEmailText(
  data: FirstSessionFeedbackEmailData,
  options: EmailRenderOptions = {}
): string {
  const firstName = firstNameOf(data.userName)

  return `
Hey ${firstName},

You finished your first practice session. Quick question: how was it?

I'm the founder and I read every reply. What felt off, what was confusing, what almost made you close the tab. One sentence is plenty.

Nothing to click, just hit reply.

Nikayel

${reminderTextFooter(options)}
  `.trim()
}
