/**
 * Email Templates for CodeSparring
 *
 * DELIVERABILITY OPTIMIZED: These templates are designed to land in Primary inbox,
 * not Promotions. Key principles:
 * - Minimal HTML styling (looks like a regular email)
 * - Personal tone (from Nikayel, not "the team")
 * - Simple subject lines (no emoji, no exclamation marks)
 * - One clear CTA per email
 * - High text-to-HTML ratio
 */

import { calculateRetention } from "./brevo";

// Simple email wrapper - minimal styling to avoid Promotions folder
const simpleEmailWrapper = (content: string, includeUnsubscribe = true) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${content}
  ${includeUnsubscribe ? `
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
    You're receiving this because you signed up for CodeSparring.<br>
    <a href="https://codesparring.dev/account" style="color: #666;">Manage email preferences</a>
  </p>
  ` : ''}
</body>
</html>
`;

// WELCOME EMAIL

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  appUrl: string;
}

export function getWelcomeEmailSubject(): string {
  return "quick hello from nikayel";
}

export function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';

  const content = `
    <p>hey ${firstName},</p>

    <p>i'm nikayel - a cs senior at sac state who built codesparring because i kept bombing interviews even after grinding leetcode for months.</p>

    <p>turns out i was studying wrong. cramming doesn't work because your brain forgets 70% of what you learned within 24 hours. what works is short, spaced-out practice sessions.</p>

    <p>so i built this thing for myself, and it actually helped. now i want to share it.</p>

    <p><strong>here's what you can practice:</strong></p>
    <ul>
      <li>dsa stuff (two pointers, sliding window, trees, dp, all of it)</li>
      <li>system design for when companies ask about scale</li>
      <li>debugging under pressure like a real interview</li>
    </ul>

    <p><a href="${data.appUrl}/dashboard" style="color: #0066cc;">jump in and try it</a></p>

    <p>one thing i learned: 15 mins a day beats 2 hour cram sessions. tried both. trust me.</p>

    <p>if you have questions, just reply to this email - it goes straight to me.</p>

    <p>good luck with your prep,<br>
    nikayel<br>
    <span style="color: #666; font-size: 14px;">cs senior @ sac state</span></p>
  `;

  return simpleEmailWrapper(content);
}

export function getWelcomeEmailText(data: WelcomeEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';

  return `
hey ${firstName},

i'm nikayel - a cs senior at sac state who built codesparring because i kept bombing interviews even after grinding leetcode for months.

turns out i was studying wrong. cramming doesn't work because your brain forgets 70% of what you learned within 24 hours. what works is short, spaced-out practice sessions.

so i built this thing for myself, and it actually helped. now i want to share it.

here's what you can practice:
- dsa stuff (two pointers, sliding window, trees, dp, all of it)
- system design for when companies ask about scale
- debugging under pressure like a real interview

jump in and try it: ${data.appUrl}/dashboard

one thing i learned: 15 mins a day beats 2 hour cram sessions. tried both. trust me.

if you have questions, just reply to this email - it goes straight to me.

good luck with your prep,
nikayel
cs senior @ sac state
  `.trim();
}

// INACTIVITY REMINDER (24h+)

export interface InactivityEmailData {
  userName: string;
  userEmail: string;
  hoursSinceLastSession: number;
  lastTopic?: string;
  streakDays?: number;
  appUrl: string;
}

export function getInactivityEmailSubject(hours: number): string {
  if (hours < 48) {
    return "quick check in";
  } else if (hours < 72) {
    return "been a few days";
  } else {
    return "just wanted to follow up";
  }
}

export function getInactivityEmailHtml(data: InactivityEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const days = Math.floor(data.hoursSinceLastSession / 24);
  const retentionEstimate = calculateRetention(days, 70);

  const content = `
    <p>hey ${firstName},</p>

    <p>noticed it's been ${days} day${days !== 1 ? 's' : ''} since your last practice session.</p>

    <p>not trying to be annoying here, but there's actual science behind this - we forget about ${100 - retentionEstimate}% of what we learned after ${days} days without review. it's called the forgetting curve.</p>

    ${data.lastTopic ? `<p>you were working on <strong>${data.lastTopic}</strong> last time. might be worth a quick 5-min review to keep it fresh.</p>` : ''}

    ${data.streakDays && data.streakDays > 0 ? `<p>also, you had a ${data.streakDays}-day streak going. just saying.</p>` : ''}

    <p><a href="${data.appUrl}/dashboard" style="color: #0066cc;">do a quick session</a></p>

    <p>even 5 minutes helps more than you'd think.</p>

    <p>- nikayel</p>
  `;

  return simpleEmailWrapper(content);
}

export function getInactivityEmailText(data: InactivityEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const days = Math.floor(data.hoursSinceLastSession / 24);
  const retentionEstimate = calculateRetention(days, 70);

  return `
hey ${firstName},

noticed it's been ${days} day${days !== 1 ? 's' : ''} since your last practice session.

not trying to be annoying here, but there's actual science behind this - we forget about ${100 - retentionEstimate}% of what we learned after ${days} days without review. it's called the forgetting curve.

${data.lastTopic ? `you were working on ${data.lastTopic} last time. might be worth a quick 5-min review to keep it fresh.` : ''}

${data.streakDays && data.streakDays > 0 ? `also, you had a ${data.streakDays}-day streak going. just saying.` : ''}

do a quick session: ${data.appUrl}/dashboard

even 5 minutes helps more than you'd think.

- nikayel
  `.trim();
}

// SPACED REPETITION REMINDER (3+ days)

export interface SpacedRepetitionEmailData {
  userName: string;
  userEmail: string;
  topic: string;
  pattern?: string;
  daysSinceReview: number;
  lastScore?: number;
  reviewCount?: number;
  appUrl: string;
  scenarioId?: string;
}

export function getSpacedRepetitionEmailSubject(data: SpacedRepetitionEmailData): string {
  return `good time to review ${data.topic}`;
}

export function getSpacedRepetitionEmailHtml(data: SpacedRepetitionEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const retentionEstimate = calculateRetention(data.daysSinceReview, data.lastScore || 70);
  const reviewUrl = data.scenarioId
    ? `${data.appUrl}/interview/${data.scenarioId}`
    : `${data.appUrl}/dashboard`;

  const content = `
    <p>hey ${firstName},</p>

    <p>you practiced <strong>${data.topic}</strong> ${data.daysSinceReview} days ago${data.lastScore ? ` and scored ${data.lastScore}%` : ''}.</p>

    <p>based on the forgetting curve, your retention is probably around ${retentionEstimate}% right now. this is actually the optimal time to review - challenging enough to strengthen the memory, but not so late that you've forgotten everything.</p>

    ${data.pattern ? `<p>pattern: ${data.pattern}</p>` : ''}

    <p><a href="${reviewUrl}" style="color: #0066cc;">review ${data.topic}</a></p>

    <p>a quick review now will lock this in for way longer. each review roughly doubles how long you remember it.</p>

    <p>- nikayel</p>
  `;

  return simpleEmailWrapper(content);
}

export function getSpacedRepetitionEmailText(data: SpacedRepetitionEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const retentionEstimate = calculateRetention(data.daysSinceReview, data.lastScore || 70);

  return `
hey ${firstName},

you practiced ${data.topic} ${data.daysSinceReview} days ago${data.lastScore ? ` and scored ${data.lastScore}%` : ''}.

based on the forgetting curve, your retention is probably around ${retentionEstimate}% right now. this is actually the optimal time to review.

review now: ${data.appUrl}/dashboard

each review roughly doubles how long you remember it.

- nikayel
  `.trim();
}

// MILESTONE CELEBRATION

export interface MilestoneEmailData {
  userName: string;
  userEmail: string;
  milestoneType: "problems_solved" | "streak" | "pattern_mastered" | "first_session";
  milestoneValue: number | string;
  appUrl: string;
}

export function getMilestoneEmailSubject(data: MilestoneEmailData): string {
  switch (data.milestoneType) {
    case "problems_solved":
      return `you hit ${data.milestoneValue} problems`;
    case "streak":
      return `${data.milestoneValue} days in a row`;
    case "pattern_mastered":
      return `you got ${data.milestoneValue} down`;
    case "first_session":
      return "first one done";
    default:
      return "nice progress";
  }
}

export function getMilestoneEmailHtml(data: MilestoneEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  let milestoneContent = "";

  switch (data.milestoneType) {
    case "problems_solved":
      milestoneContent = `<p>just noticed you hit <strong>${data.milestoneValue} problems solved</strong>. that's solid progress.</p>`;
      break;
    case "streak":
      milestoneContent = `<p>you've been at it for <strong>${data.milestoneValue} days straight</strong>. consistency like that is what actually moves the needle.</p>`;
      break;
    case "pattern_mastered":
      milestoneContent = `<p>looks like you've got <strong>${data.milestoneValue}</strong> pretty locked in. that pattern should stick with you.</p>`;
      break;
    case "first_session":
      milestoneContent = `<p>you finished your first practice session. the hardest part is starting - you got that done.</p>`;
      break;
  }

  const content = `
    <p>hey ${firstName},</p>

    ${milestoneContent}

    <p>keep it up. you're building real skills here.</p>

    <p><a href="${data.appUrl}/dashboard" style="color: #0066cc;">keep practicing</a></p>

    <p>- nikayel</p>
  `;

  return simpleEmailWrapper(content);
}

// ROADMAP: DAILY PRACTICE REMINDER

export interface DailyRoadmapEmailData {
  userName: string;
  userEmail: string;
  targetCompany: string;
  daysUntilInterview: number;
  todaysQuestions: Array<{
    title: string;
    pattern: string;
    difficulty: string;
    scenarioId?: string;
  }>;
  questionsCompleted: number;
  totalQuestions: number;
  isOnTrack: boolean;
  appUrl: string;
}

export function getDailyRoadmapEmailSubject(data: DailyRoadmapEmailData): string {
  if (data.daysUntilInterview <= 3) {
    return `${data.daysUntilInterview} days left - today's prep`;
  }
  return `today's ${data.targetCompany} prep`;
}

export function getDailyRoadmapEmailHtml(data: DailyRoadmapEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const progressPercent = Math.round((data.questionsCompleted / data.totalQuestions) * 100);

  const questionsHtml = data.todaysQuestions.map((q, i) =>
    `<li><strong>${q.title}</strong> - ${q.pattern}, ${q.difficulty}</li>`
  ).join('\n');

  const urgencyNote = data.daysUntilInterview <= 7
    ? `<p style="color: #c00;"><strong>${data.daysUntilInterview} day${data.daysUntilInterview !== 1 ? 's' : ''} until your ${data.targetCompany} interview.</strong></p>`
    : '';

  const onTrackNote = !data.isOnTrack
    ? `<p>heads up: you're a bit behind schedule. try to knock out today's questions to catch up.</p>`
    : '';

  const content = `
    <p>hey ${firstName},</p>

    ${urgencyNote}

    <p>here's today's practice for your ${data.targetCompany} roadmap:</p>

    <ul>
      ${questionsHtml}
    </ul>

    <p>progress: ${data.questionsCompleted}/${data.totalQuestions} (${progressPercent}%)</p>

    ${onTrackNote}

    <p><a href="${data.appUrl}/roadmap" style="color: #0066cc;">start today's practice</a></p>

    <p>- nikayel</p>
  `;

  return simpleEmailWrapper(content);
}

export function getDailyRoadmapEmailText(data: DailyRoadmapEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const questionsText = data.todaysQuestions.map((q, i) =>
    `${i + 1}. ${q.title} (${q.pattern}, ${q.difficulty})`
  ).join('\n');

  return `
hey ${firstName},

${data.daysUntilInterview <= 7 ? `${data.daysUntilInterview} days until your ${data.targetCompany} interview.` : ''}

here's today's practice:

${questionsText}

progress: ${data.questionsCompleted}/${data.totalQuestions}

start practicing: ${data.appUrl}/roadmap

- nikayel
  `.trim();
}

// ROADMAP: INTERVIEW COUNTDOWN

export interface InterviewCountdownEmailData {
  userName: string;
  userEmail: string;
  targetCompany: string;
  daysUntilInterview: number;
  questionsCompleted: number;
  totalQuestions: number;
  patternsToFocus: string[];
  appUrl: string;
}

export function getInterviewCountdownEmailSubject(data: InterviewCountdownEmailData): string {
  if (data.daysUntilInterview === 1) {
    return `${data.targetCompany} is tomorrow`;
  }
  return `${data.daysUntilInterview} days until ${data.targetCompany}`;
}

export function getInterviewCountdownEmailHtml(data: InterviewCountdownEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const progressPercent = Math.round((data.questionsCompleted / data.totalQuestions) * 100);

  const focusPatterns = data.patternsToFocus.length > 0
    ? `<p>focus areas for the final stretch:</p><ul>${data.patternsToFocus.map(p => `<li>${p}</li>`).join('')}</ul>`
    : '';

  const finalTips = data.daysUntilInterview <= 3 ? `
    <p><strong>final day tips:</strong></p>
    <ul>
      <li>review patterns you've already solved - don't learn new ones now</li>
      <li>get good sleep - it consolidates memory</li>
      <li>practice explaining your approach out loud</li>
    </ul>
  ` : '';

  const content = `
    <p>hey ${firstName},</p>

    <p>your ${data.targetCompany} interview is ${data.daysUntilInterview === 1 ? 'tomorrow' : `in ${data.daysUntilInterview} days`}.</p>

    <p>you've completed ${data.questionsCompleted}/${data.totalQuestions} (${progressPercent}%) of your roadmap.</p>

    ${focusPatterns}

    ${finalTips}

    <p><a href="${data.appUrl}/roadmap" style="color: #0066cc;">continue preparing</a></p>

    <p>you've put in the work. trust your prep.</p>

    <p>- nikayel</p>
  `;

  return simpleEmailWrapper(content);
}

// ROADMAP: BEHIND SCHEDULE ALERT

export interface BehindScheduleEmailData {
  userName: string;
  userEmail: string;
  targetCompany: string;
  daysUntilInterview: number;
  questionsBehind: number;
  suggestedDailyQuestions: number;
  appUrl: string;
}

export function getBehindScheduleEmailSubject(data: BehindScheduleEmailData): string {
  return `catching up on ${data.targetCompany} prep`;
}

export function getBehindScheduleEmailHtml(data: BehindScheduleEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';

  const content = `
    <p>hey ${firstName},</p>

    <p>you're ${data.questionsBehind} questions behind on your ${data.targetCompany} roadmap with ${data.daysUntilInterview} days left.</p>

    <p>no stress - here's how to catch up: aim for ${data.suggestedDailyQuestions} questions per day from here on out.</p>

    <p>don't try to do it all at once though. consistent daily practice (even just 1-2 problems) beats cramming.</p>

    <p><a href="${data.appUrl}/roadmap" style="color: #0066cc;">start catching up</a></p>

    <p>every problem you solve increases your odds. progress over perfection.</p>

    <p>- nikayel</p>
  `;

  return simpleEmailWrapper(content);
}

// PAYMENT FAILURE NOTIFICATION

export interface PaymentFailedEmailData {
  userName: string;
  userEmail: string;
  failureReason?: string;
  appUrl: string;
}

export function getPaymentFailedEmailSubject(): string {
  return "issue with your payment";
}

export function getPaymentFailedEmailHtml(data: PaymentFailedEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';

  const content = `
    <p>hey ${firstName},</p>

    <p>heads up - we had trouble processing your payment for CodeSparring Pro.${data.failureReason ? ` (${data.failureReason})` : ''}</p>

    <p>to keep your Pro access, you'll need to update your payment method.</p>

    <p><a href="${data.appUrl}/account" style="color: #0066cc;">update payment method</a></p>

    <p>we'll try again automatically in a few days. if the payment still fails, your account will be moved to the free plan.</p>

    <p>if you have any questions, just reply to this email.</p>

    <p>- nikayel</p>
  `;

  return simpleEmailWrapper(content);
}

export function getPaymentFailedEmailText(data: PaymentFailedEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';

  return `
hey ${firstName},

heads up - we had trouble processing your payment for CodeSparring Pro.${data.failureReason ? ` (${data.failureReason})` : ''}

to keep your Pro access, you'll need to update your payment method:
${data.appUrl}/account

we'll try again automatically in a few days. if the payment still fails, your account will be moved to the free plan.

if you have any questions, just reply to this email.

- nikayel
  `.trim();
}

// SUBSCRIPTION CONFIRMATION

export interface SubscriptionConfirmationEmailData {
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  currency: string;
  nextBillingDate?: string;
  appUrl: string;
}

export function getSubscriptionConfirmationEmailSubject(): string {
  return "you're all set with Pro";
}

export function getSubscriptionConfirmationEmailHtml(data: SubscriptionConfirmationEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const formattedDate = data.nextBillingDate
    ? new Date(data.nextBillingDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const content = `
    <p>hey ${firstName},</p>

    <p>thanks for upgrading to Pro. your subscription is now active.</p>

    <p><strong>details:</strong></p>
    <ul>
      <li>plan: ${data.planName}</li>
      <li>amount: ${data.currency} ${data.amount.toFixed(2)}</li>
      <li>next billing: ${formattedDate}</li>
    </ul>

    <p>with Pro you get:</p>
    <ul>
      <li>35 interview sessions per month</li>
      <li>unlimited code execution</li>
      <li>advanced AI feedback</li>
      <li>priority support (just reply to any email)</li>
    </ul>

    <p><a href="${data.appUrl}/dashboard" style="color: #0066cc;">start practicing</a></p>

    <p>let me know if you have any questions.</p>

    <p>- nikayel</p>
  `;

  return simpleEmailWrapper(content);
}

export function getSubscriptionConfirmationEmailText(data: SubscriptionConfirmationEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const formattedDate = data.nextBillingDate
    ? new Date(data.nextBillingDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return `
hey ${firstName},

thanks for upgrading to Pro. your subscription is now active.

details:
- plan: ${data.planName}
- amount: ${data.currency} ${data.amount.toFixed(2)}
- next billing: ${formattedDate}

with Pro you get:
- 35 interview sessions per month
- unlimited code execution
- advanced AI feedback
- priority support

start practicing: ${data.appUrl}/dashboard

let me know if you have any questions.

- nikayel
  `.trim();
}

// SUBSCRIPTION CANCELLATION CONFIRMATION

export interface SubscriptionCancellationEmailData {
  userName: string;
  userEmail: string;
  accessUntil?: string;
  isImmediate: boolean;
  appUrl: string;
}

export function getSubscriptionCancellationEmailSubject(isImmediate: boolean): string {
  return isImmediate
    ? "your Pro access has ended"
    : "confirming your cancellation";
}

export function getSubscriptionCancellationEmailHtml(data: SubscriptionCancellationEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const formattedDate = data.accessUntil
    ? new Date(data.accessUntil).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'today';

  if (data.isImmediate) {
    return simpleEmailWrapper(`
      <p>hey ${firstName},</p>

      <p>your CodeSparring Pro subscription has ended. you're now on the free plan (5 sessions per month).</p>

      <p>if you ever want to come back, your progress and history will be here waiting.</p>

      <p><a href="${data.appUrl}/pricing" style="color: #0066cc;">resubscribe anytime</a></p>

      <p>if there's anything we could've done better, i'd genuinely love to hear it - just reply to this email.</p>

      <p>- nikayel</p>
    `);
  }

  return simpleEmailWrapper(`
    <p>hey ${firstName},</p>

    <p>got your cancellation request. your Pro subscription is set to end on ${formattedDate}.</p>

    <p>you'll have full Pro access until then, so make the most of it.</p>

    <p>changed your mind? you can reactivate anytime before it expires:</p>

    <p><a href="${data.appUrl}/account" style="color: #0066cc;">reactivate subscription</a></p>

    <p>if there's anything we could've done better, i'd genuinely love to hear it - just reply to this email.</p>

    <p>- nikayel</p>
  `);
}

export function getSubscriptionCancellationEmailText(data: SubscriptionCancellationEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const formattedDate = data.accessUntil
    ? new Date(data.accessUntil).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'today';

  if (data.isImmediate) {
    return `
hey ${firstName},

your CodeSparring Pro subscription has ended. you're now on the free plan (5 sessions per month).

if you ever want to come back, your progress and history will be here waiting.

resubscribe anytime: ${data.appUrl}/pricing

if there's anything we could've done better, i'd genuinely love to hear it - just reply to this email.

- nikayel
    `.trim();
  }

  return `
hey ${firstName},

got your cancellation request. your Pro subscription is set to end on ${formattedDate}.

you'll have full Pro access until then, so make the most of it.

changed your mind? reactivate anytime: ${data.appUrl}/account

if there's anything we could've done better, i'd genuinely love to hear it - just reply to this email.

- nikayel
  `.trim();
}

// TRIAL ENDING NOTIFICATION

export interface TrialEndingEmailData {
  userName: string;
  userEmail: string;
  trialEndDate?: string;
  appUrl: string;
}

export function getTrialEndingEmailSubject(): string {
  return "your trial ends in 3 days";
}

export function getTrialEndingEmailHtml(data: TrialEndingEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const formattedDate = data.trialEndDate
    ? new Date(data.trialEndDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'soon';

  const content = `
    <p>hey ${firstName},</p>

    <p>heads up - your Pro trial ends on ${formattedDate}.</p>

    <p>after that, your payment method will be charged automatically. if you don't want to continue, you can cancel before then.</p>

    <p>with Pro you get:</p>
    <ul>
      <li>35 interview sessions per month</li>
      <li>unlimited code execution</li>
      <li>advanced AI feedback</li>
    </ul>

    <p><a href="${data.appUrl}/account" style="color: #0066cc;">manage subscription</a></p>

    <p>have questions? just reply to this email.</p>

    <p>- nikayel</p>
  `;

  return simpleEmailWrapper(content);
}

export function getTrialEndingEmailText(data: TrialEndingEmailData): string {
  const firstName = data.userName?.split(' ')[0] || 'there';
  const formattedDate = data.trialEndDate
    ? new Date(data.trialEndDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'soon';

  return `
hey ${firstName},

heads up - your Pro trial ends on ${formattedDate}.

after that, your payment method will be charged automatically. if you don't want to continue, you can cancel before then.

with Pro you get:
- 35 interview sessions per month
- unlimited code execution
- advanced AI feedback

manage subscription: ${data.appUrl}/account

have questions? just reply to this email.

- nikayel
  `.trim();
}
