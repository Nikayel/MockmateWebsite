/**
 * Email Templates for CodeSparring
 *
 * DELIVERABILITY OPTIMIZED: These templates are designed to land in Primary inbox.
 *
 * Strategy:
 * - Personal tone (from Nikayel, not "the team")
 * - Clean, minimal styling (not marketing-heavy)
 * - Single CTA per email
 * - Different footer strategies based on email type:
 *   - Transactional (welcome, payment, subscription): No unsubscribe needed
 *   - Reminder emails: Subtle preferences link
 */

import { calculateRetention } from "./brevo"

// Email type determines footer behavior
type EmailType = "transactional" | "reminder" | "marketing"

// Clean email wrapper with tasteful styling
const emailWrapper = (content: string, emailType: EmailType = "transactional") => {
  // Footer varies by email type
  const footer =
    emailType === "reminder"
      ? `<p style="margin-top: 32px; font-size: 13px; color: #888;">
        <a href="https://codesparring.dev/account" style="color: #888;">change email preferences</a>
       </p>`
      : emailType === "marketing"
        ? `<p style="margin-top: 32px; font-size: 13px; color: #888;">
        You signed up for CodeSparring updates.<br>
        <a href="https://codesparring.dev/account" style="color: #888;">unsubscribe</a>
       </p>`
        : "" // transactional emails don't need unsubscribe

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px 20px; background-color: #ffffff;">

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

// Styled CTA button - looks good but not overly promotional
const ctaButton = (text: string, url: string) => `
  <p style="margin: 24px 0;">
    <a href="${url}" style="display: inline-block; background-color: #0066cc; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">${text}</a>
  </p>
`

// Simple text link (less promotional)
const ctaLink = (text: string, url: string) => `
  <a href="${url}" style="color: #0066cc; text-decoration: none;">${text}</a>
`

// Signature block
const signature = (includeTitle = true) => `
  <p style="margin-top: 24px; color: #333;">
    – nikayel${includeTitle ? `<br><span style="color: #666; font-size: 14px;">founder, codesparring</span>` : ""}
  </p>
`

// WELCOME EMAIL (Transactional - no unsubscribe needed)

export interface WelcomeEmailData {
  userName: string
  userEmail: string
  appUrl: string
}

export function getWelcomeEmailSubject(): string {
  return "quick hello from nikayel"
}

export function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"

  const content = `
    <p>hey ${firstName},</p>

    <p>i'm nikayel – a cs senior at sac state who built codesparring because i kept bombing interviews even after grinding leetcode for months.</p>

    <p>turns out i was studying wrong. cramming doesn't work because your brain forgets 70% of what you learned within 24 hours. what works is short, spaced-out practice sessions.</p>

    <p>so i built this thing for myself, and it actually helped. now i want to share it.</p>

    <p><strong>here's what you can practice:</strong></p>
    <ul style="padding-left: 20px; color: #333;">
      <li style="margin-bottom: 6px;">dsa patterns (two pointers, sliding window, trees, dp)</li>
      <li style="margin-bottom: 6px;">system design for scale questions</li>
      <li style="margin-bottom: 6px;">debugging under pressure like a real interview</li>
    </ul>

    ${ctaButton("start practicing", `${data.appUrl}/dashboard`)}

    <p style="color: #666; font-size: 14px; margin-top: 20px;">
      <strong>tip:</strong> 15 mins a day beats 2-hour cram sessions. tried both. trust me.
    </p>

    <p>if you have questions, just reply – it goes straight to me.</p>

    ${signature(true)}
  `

  return emailWrapper(content, "transactional")
}

export function getWelcomeEmailText(data: WelcomeEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"

  return `
hey ${firstName},

i'm nikayel – a cs senior at sac state who built codesparring because i kept bombing interviews even after grinding leetcode for months.

turns out i was studying wrong. cramming doesn't work because your brain forgets 70% of what you learned within 24 hours. what works is short, spaced-out practice sessions.

so i built this thing for myself, and it actually helped. now i want to share it.

here's what you can practice:
- dsa patterns (two pointers, sliding window, trees, dp)
- system design for scale questions
- debugging under pressure like a real interview

start practicing: ${data.appUrl}/dashboard

tip: 15 mins a day beats 2-hour cram sessions. tried both. trust me.

if you have questions, just reply – it goes straight to me.

– nikayel
founder, codesparring
  `.trim()
}

// INACTIVITY REMINDER (Reminder - needs preferences link)

export interface InactivityEmailData {
  userName: string
  userEmail: string
  hoursSinceLastSession: number
  lastTopic?: string
  streakDays?: number
  appUrl: string
}

export function getInactivityEmailSubject(hours: number): string {
  if (hours < 48) {
    return "quick check in"
  } else if (hours < 72) {
    return "been a few days"
  } else {
    return "following up"
  }
}

export function getInactivityEmailHtml(data: InactivityEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const days = Math.floor(data.hoursSinceLastSession / 24)
  const retentionEstimate = calculateRetention(days, 70)
  const forgottenPercent = 100 - retentionEstimate

  // Only show specific percentage if it's meaningful (15%+), otherwise keep it general
  const forgettingMessage =
    forgottenPercent >= 15
      ? `not trying to nag, but there's science here – by day ${days} without review, you've likely forgotten around ${forgottenPercent}% of what you learned. it's called the forgetting curve.`
      : `not trying to nag, but there's science here – memory fades fast without review. even a quick session helps lock things in.`

  const content = `
    <p>hey ${firstName},</p>

    <p>noticed it's been ${days} day${days !== 1 ? "s" : ""} since your last practice session.</p>

    <p>${forgettingMessage}</p>

    ${data.lastTopic ? `<p>you were working on <strong>${data.lastTopic}</strong>. might be worth a quick 5-min review.</p>` : ""}

    ${data.streakDays && data.streakDays > 0 ? `<p>also, you had a <strong>${data.streakDays}-day streak</strong> going. just saying.</p>` : ""}

    ${ctaButton("do a quick session", `${data.appUrl}/dashboard`)}

    <p style="color: #666; font-size: 14px;">even 5 minutes helps more than you'd think.</p>

    ${signature(false)}
  `

  return emailWrapper(content, "reminder")
}

export function getInactivityEmailText(data: InactivityEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const days = Math.floor(data.hoursSinceLastSession / 24)
  const retentionEstimate = calculateRetention(days, 70)
  const forgottenPercent = 100 - retentionEstimate

  // Only show specific percentage if it's meaningful (15%+), otherwise keep it general
  const forgettingMessage =
    forgottenPercent >= 15
      ? `not trying to nag, but there's science here – by day ${days} without review, you've likely forgotten around ${forgottenPercent}% of what you learned. it's called the forgetting curve.`
      : `not trying to nag, but there's science here – memory fades fast without review. even a quick session helps lock things in.`

  return `
hey ${firstName},

noticed it's been ${days} day${days !== 1 ? "s" : ""} since your last practice session.

${forgettingMessage}

${data.lastTopic ? `you were working on ${data.lastTopic}. might be worth a quick 5-min review.` : ""}

${data.streakDays && data.streakDays > 0 ? `also, you had a ${data.streakDays}-day streak going. just saying.` : ""}

do a quick session: ${data.appUrl}/dashboard

even 5 minutes helps more than you'd think.

– nikayel

---
change email preferences: ${data.appUrl}/account
  `.trim()
}

// SPACED REPETITION REMINDER (Reminder)

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
  return `good time to review ${data.topic}`
}

export function getSpacedRepetitionEmailHtml(data: SpacedRepetitionEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const retentionEstimate = calculateRetention(data.daysSinceReview, data.lastScore || 70)
  const reviewUrl = data.scenarioId
    ? `${data.appUrl}/interview/${data.scenarioId}`
    : `${data.appUrl}/dashboard`

  const content = `
    <p>hey ${firstName},</p>

    <p>you practiced <strong>${data.topic}</strong> ${data.daysSinceReview} days ago${data.lastScore ? ` and scored ${data.lastScore}%` : ""}.</p>

    <p>based on the forgetting curve, your retention is around <strong>${retentionEstimate}%</strong> right now. this is actually the optimal time to review – challenging enough to strengthen the memory, but not so late that you've forgotten everything.</p>

    ${data.pattern ? `<p style="color: #666;">pattern: ${data.pattern}</p>` : ""}

    ${ctaButton(`review ${data.topic}`, reviewUrl)}

    <p style="color: #666; font-size: 14px;">each review roughly doubles how long you remember it.</p>

    ${signature(false)}
  `

  return emailWrapper(content, "reminder")
}

export function getSpacedRepetitionEmailText(data: SpacedRepetitionEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const retentionEstimate = calculateRetention(data.daysSinceReview, data.lastScore || 70)

  return `
hey ${firstName},

you practiced ${data.topic} ${data.daysSinceReview} days ago${data.lastScore ? ` and scored ${data.lastScore}%` : ""}.

based on the forgetting curve, your retention is around ${retentionEstimate}% right now. this is the optimal time to review.

review now: ${data.appUrl}/dashboard

each review roughly doubles how long you remember it.

– nikayel

---
change email preferences: ${data.appUrl}/account
  `.trim()
}

// MILESTONE CELEBRATION (Transactional - triggered by their action)

export interface MilestoneEmailData {
  userName: string
  userEmail: string
  milestoneType: "problems_solved" | "streak" | "pattern_mastered" | "first_session"
  milestoneValue: number | string
  appUrl: string
}

export function getMilestoneEmailSubject(data: MilestoneEmailData): string {
  switch (data.milestoneType) {
    case "problems_solved":
      return `you hit ${data.milestoneValue} problems`
    case "streak":
      return `${data.milestoneValue} days in a row`
    case "pattern_mastered":
      return `you got ${data.milestoneValue} down`
    case "first_session":
      return "first one done"
    default:
      return "nice progress"
  }
}

export function getMilestoneEmailHtml(data: MilestoneEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  let milestoneContent = ""

  switch (data.milestoneType) {
    case "problems_solved":
      milestoneContent = `<p>just noticed you hit <strong>${data.milestoneValue} problems solved</strong>. that's solid progress.</p>`
      break
    case "streak":
      milestoneContent = `<p>you've been at it for <strong>${data.milestoneValue} days straight</strong>. consistency like that is what actually moves the needle.</p>`
      break
    case "pattern_mastered":
      milestoneContent = `<p>looks like you've got <strong>${data.milestoneValue}</strong> pretty locked in. that pattern should stick with you.</p>`
      break
    case "first_session":
      milestoneContent = `<p>you finished your first practice session. the hardest part is starting – you got that done.</p>`
      break
  }

  const content = `
    <p>hey ${firstName},</p>

    ${milestoneContent}

    <p>keep it up. you're building real skills here.</p>

    ${ctaButton("keep practicing", `${data.appUrl}/dashboard`)}

    ${signature(false)}
  `

  return emailWrapper(content, "transactional")
}

// ROADMAP: DAILY PRACTICE REMINDER (Reminder)

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
    return `${data.daysUntilInterview} days left – today's prep`
  }
  return `today's ${data.targetCompany} prep`
}

export function getDailyRoadmapEmailHtml(data: DailyRoadmapEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const progressPercent = Math.round((data.questionsCompleted / data.totalQuestions) * 100)

  const questionsHtml = data.todaysQuestions
    .map(
      (q) =>
        `<li style="margin-bottom: 8px;"><strong>${q.title}</strong><br><span style="color: #666; font-size: 13px;">${q.pattern} · ${q.difficulty}</span></li>`
    )
    .join("\n")

  const urgencyNote =
    data.daysUntilInterview <= 7
      ? `<p style="color: #c00; font-weight: 500;">${data.daysUntilInterview} day${data.daysUntilInterview !== 1 ? "s" : ""} until your ${data.targetCompany} interview.</p>`
      : ""

  const onTrackNote = !data.isOnTrack
    ? `<p style="color: #996600; font-size: 14px;">heads up: you're a bit behind schedule. try to knock these out today.</p>`
    : ""

  const content = `
    <p>hey ${firstName},</p>

    ${urgencyNote}

    <p>here's today's practice for your <strong>${data.targetCompany}</strong> roadmap:</p>

    <ul style="padding-left: 20px; margin: 16px 0;">
      ${questionsHtml}
    </ul>

    <p style="color: #666; font-size: 14px;">progress: ${data.questionsCompleted}/${data.totalQuestions} (${progressPercent}%)</p>

    ${onTrackNote}

    ${ctaButton("start today's practice", `${data.appUrl}/roadmap`)}

    ${signature(false)}
  `

  return emailWrapper(content, "reminder")
}

export function getDailyRoadmapEmailText(data: DailyRoadmapEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const questionsText = data.todaysQuestions
    .map((q, i) => `${i + 1}. ${q.title} (${q.pattern}, ${q.difficulty})`)
    .join("\n")

  return `
hey ${firstName},

${data.daysUntilInterview <= 7 ? `${data.daysUntilInterview} days until your ${data.targetCompany} interview.` : ""}

here's today's practice:

${questionsText}

progress: ${data.questionsCompleted}/${data.totalQuestions}

start practicing: ${data.appUrl}/roadmap

– nikayel

---
change email preferences: ${data.appUrl}/account
  `.trim()
}

// ROADMAP: INTERVIEW COUNTDOWN (Reminder)

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

export function getInterviewCountdownEmailHtml(data: InterviewCountdownEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const progressPercent = Math.round((data.questionsCompleted / data.totalQuestions) * 100)

  const focusPatterns =
    data.patternsToFocus.length > 0
      ? `<p><strong>focus areas:</strong></p><ul style="padding-left: 20px;">${data.patternsToFocus.map((p) => `<li>${p}</li>`).join("")}</ul>`
      : ""

  const finalTips =
    data.daysUntilInterview <= 3
      ? `
    <div style="background-color: #f8f8f8; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 500;">final stretch tips:</p>
      <ul style="padding-left: 20px; margin: 0; color: #666; font-size: 14px;">
        <li>review patterns you've solved – don't learn new ones now</li>
        <li>get good sleep – it consolidates memory</li>
        <li>practice explaining your approach out loud</li>
      </ul>
    </div>
  `
      : ""

  const content = `
    <p>hey ${firstName},</p>

    <p>your <strong>${data.targetCompany}</strong> interview is ${data.daysUntilInterview === 1 ? "tomorrow" : `in ${data.daysUntilInterview} days`}.</p>

    <p>you've completed <strong>${progressPercent}%</strong> of your roadmap (${data.questionsCompleted}/${data.totalQuestions}).</p>

    ${focusPatterns}

    ${finalTips}

    ${ctaButton("continue preparing", `${data.appUrl}/roadmap`)}

    <p style="color: #666; font-size: 14px;">you've put in the work. trust your prep.</p>

    ${signature(false)}
  `

  return emailWrapper(content, "reminder")
}

// ROADMAP: BEHIND SCHEDULE ALERT (Reminder)

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
  return `catching up on ${data.targetCompany} prep`
}

export function getBehindScheduleEmailHtml(data: BehindScheduleEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"

  const content = `
    <p>hey ${firstName},</p>

    <p>you're <strong>${data.questionsBehind} questions behind</strong> on your ${data.targetCompany} roadmap with ${data.daysUntilInterview} days left.</p>

    <p>no stress – here's how to catch up: aim for <strong>${data.suggestedDailyQuestions} questions per day</strong> from here on out.</p>

    <p style="color: #666; font-size: 14px;">don't try to do it all at once. consistent daily practice (even 1-2 problems) beats cramming.</p>

    ${ctaButton("start catching up", `${data.appUrl}/roadmap`)}

    <p style="color: #666; font-size: 14px;">every problem you solve increases your odds. progress over perfection.</p>

    ${signature(false)}
  `

  return emailWrapper(content, "reminder")
}

// PAYMENT FAILURE (Transactional)

export interface PaymentFailedEmailData {
  userName: string
  userEmail: string
  failureReason?: string
  appUrl: string
}

export function getPaymentFailedEmailSubject(): string {
  return "issue with your payment"
}

export function getPaymentFailedEmailHtml(data: PaymentFailedEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"

  const content = `
    <p>hey ${firstName},</p>

    <p>heads up – we had trouble processing your payment for CodeSparring Pro.${data.failureReason ? ` (${data.failureReason})` : ""}</p>

    <p>to keep your Pro access, you'll need to update your payment method.</p>

    ${ctaButton("update payment method", `${data.appUrl}/account`)}

    <p style="color: #666; font-size: 14px;">we'll retry automatically in a few days. if it still fails, your account will move to the free plan.</p>

    <p>questions? just reply to this email.</p>

    ${signature(false)}
  `

  return emailWrapper(content, "transactional")
}

export function getPaymentFailedEmailText(data: PaymentFailedEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"

  return `
hey ${firstName},

heads up – we had trouble processing your payment for CodeSparring Pro.${data.failureReason ? ` (${data.failureReason})` : ""}

to keep your Pro access, update your payment method:
${data.appUrl}/account

we'll retry automatically in a few days. if it still fails, your account will move to the free plan.

questions? just reply to this email.

– nikayel
  `.trim()
}

// SUBSCRIPTION CONFIRMATION (Transactional)

export interface SubscriptionConfirmationEmailData {
  userName: string
  userEmail: string
  planName: string
  amount: number
  currency: string
  nextBillingDate?: string
  appUrl: string
}

export function getSubscriptionConfirmationEmailSubject(): string {
  return "you're all set with Pro"
}

export function getSubscriptionConfirmationEmailHtml(
  data: SubscriptionConfirmationEmailData
): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const formattedDate = data.nextBillingDate
    ? new Date(data.nextBillingDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A"

  const content = `
    <p>hey ${firstName},</p>

    <p>thanks for upgrading to Pro. your subscription is now active.</p>

    <div style="background-color: #f8f8f8; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 500;">subscription details</p>
      <p style="margin: 0; color: #666; font-size: 14px;">
        plan: ${data.planName}<br>
        amount: ${data.currency} ${data.amount.toFixed(2)}<br>
        next billing: ${formattedDate}
      </p>
    </div>

    <p><strong>with Pro you get:</strong></p>
    <ul style="padding-left: 20px; color: #333;">
      <li>35 interview sessions per month</li>
      <li>unlimited code execution</li>
      <li>advanced AI feedback</li>
      <li>priority support (just reply to any email)</li>
    </ul>

    ${ctaButton("start practicing", `${data.appUrl}/dashboard`)}

    ${signature(false)}
  `

  return emailWrapper(content, "transactional")
}

export function getSubscriptionConfirmationEmailText(
  data: SubscriptionConfirmationEmailData
): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const formattedDate = data.nextBillingDate
    ? new Date(data.nextBillingDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A"

  return `
hey ${firstName},

thanks for upgrading to Pro. your subscription is now active.

subscription details:
- plan: ${data.planName}
- amount: ${data.currency} ${data.amount.toFixed(2)}
- next billing: ${formattedDate}

with Pro you get:
- 35 interview sessions per month
- unlimited code execution
- advanced AI feedback
- priority support

start practicing: ${data.appUrl}/dashboard

– nikayel
  `.trim()
}

// SUBSCRIPTION CANCELLATION (Transactional)

export interface SubscriptionCancellationEmailData {
  userName: string
  userEmail: string
  accessUntil?: string
  isImmediate: boolean
  appUrl: string
}

export function getSubscriptionCancellationEmailSubject(isImmediate: boolean): string {
  return isImmediate ? "your Pro access has ended" : "confirming your cancellation"
}

export function getSubscriptionCancellationEmailHtml(
  data: SubscriptionCancellationEmailData
): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const formattedDate = data.accessUntil
    ? new Date(data.accessUntil).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "today"

  if (data.isImmediate) {
    return emailWrapper(
      `
      <p>hey ${firstName},</p>

      <p>your CodeSparring Pro subscription has ended. you're now on the free plan (5 sessions per month).</p>

      <p>your progress and history are still here if you want to come back.</p>

      ${ctaButton("resubscribe anytime", `${data.appUrl}/pricing`)}

      <p>if there's anything we could've done better, i'd genuinely love to hear it – just reply.</p>

      ${signature(false)}
    `,
      "transactional"
    )
  }

  return emailWrapper(
    `
    <p>hey ${firstName},</p>

    <p>got your cancellation request. your Pro subscription is set to end on <strong>${formattedDate}</strong>.</p>

    <p>you'll have full Pro access until then, so make the most of it.</p>

    <p>changed your mind?</p>

    ${ctaButton("reactivate subscription", `${data.appUrl}/account`)}

    <p>if there's anything we could've done better, i'd genuinely love to hear it – just reply.</p>

    ${signature(false)}
  `,
    "transactional"
  )
}

export function getSubscriptionCancellationEmailText(
  data: SubscriptionCancellationEmailData
): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const formattedDate = data.accessUntil
    ? new Date(data.accessUntil).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "today"

  if (data.isImmediate) {
    return `
hey ${firstName},

your CodeSparring Pro subscription has ended. you're now on the free plan (5 sessions per month).

your progress and history are still here if you want to come back.

resubscribe anytime: ${data.appUrl}/pricing

if there's anything we could've done better, i'd genuinely love to hear it – just reply.

– nikayel
    `.trim()
  }

  return `
hey ${firstName},

got your cancellation request. your Pro subscription is set to end on ${formattedDate}.

you'll have full Pro access until then, so make the most of it.

changed your mind? reactivate: ${data.appUrl}/account

if there's anything we could've done better, i'd genuinely love to hear it – just reply.

– nikayel
  `.trim()
}

// TRIAL ENDING (Transactional - billing notification)

export interface TrialEndingEmailData {
  userName: string
  userEmail: string
  trialEndDate?: string
  appUrl: string
}

export function getTrialEndingEmailSubject(): string {
  return "your trial ends in 3 days"
}

export function getTrialEndingEmailHtml(data: TrialEndingEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const formattedDate = data.trialEndDate
    ? new Date(data.trialEndDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "soon"

  const content = `
    <p>hey ${firstName},</p>

    <p>heads up – your Pro trial ends on <strong>${formattedDate}</strong>.</p>

    <p>after that, your payment method will be charged automatically. if you don't want to continue, you can cancel before then.</p>

    <p><strong>with Pro you get:</strong></p>
    <ul style="padding-left: 20px; color: #333;">
      <li>35 interview sessions per month</li>
      <li>unlimited code execution</li>
      <li>advanced AI feedback</li>
    </ul>

    ${ctaButton("manage subscription", `${data.appUrl}/account`)}

    <p>have questions? just reply.</p>

    ${signature(false)}
  `

  return emailWrapper(content, "transactional")
}

export function getTrialEndingEmailText(data: TrialEndingEmailData): string {
  const firstName = data.userName?.split(" ")[0] || "there"
  const formattedDate = data.trialEndDate
    ? new Date(data.trialEndDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "soon"

  return `
hey ${firstName},

heads up – your Pro trial ends on ${formattedDate}.

after that, your payment method will be charged automatically. if you don't want to continue, you can cancel before then.

with Pro you get:
- 35 interview sessions per month
- unlimited code execution
- advanced AI feedback

manage subscription: ${data.appUrl}/account

have questions? just reply.

– nikayel
  `.trim()
}
