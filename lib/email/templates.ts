/**
 * Email Templates for Skillon
 *
 * Science-backed email templates for:
 * - Welcome emails (63.9% open rate - highest engagement)
 * - Inactivity reminders (loss aversion psychology)
 * - Spaced repetition reminders (Ebbinghaus forgetting curve)
 */

import { calculateRetention } from "./brevo";

// Base styles for all emails
const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #e5e7eb;
    background-color: #0a0a0a;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 40px 20px;
  }
  .card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 16px;
    padding: 32px;
    border: 1px solid #374151;
  }
  .logo {
    text-align: center;
    margin-bottom: 24px;
  }
  .logo-text {
    font-size: 28px;
    font-weight: bold;
    color: #00d9ff;
  }
  h1 {
    color: #ffffff;
    font-size: 24px;
    margin: 0 0 16px 0;
  }
  h2 {
    color: #ffffff;
    font-size: 20px;
    margin: 0 0 12px 0;
  }
  p {
    color: #9ca3af;
    margin: 0 0 16px 0;
  }
  .highlight {
    color: #00d9ff;
    font-weight: 600;
  }
  .cta-button {
    display: inline-block;
    background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%);
    color: #000000 !important;
    text-decoration: none;
    padding: 14px 32px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    margin: 16px 0;
  }
  .cta-button:hover {
    opacity: 0.9;
  }
  .secondary-button {
    display: inline-block;
    background: transparent;
    color: #00d9ff !important;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    border: 1px solid #00d9ff;
    margin: 8px 0;
  }
  .tip-box {
    background: rgba(0, 217, 255, 0.1);
    border-left: 4px solid #00d9ff;
    padding: 16px;
    border-radius: 0 8px 8px 0;
    margin: 24px 0;
  }
  .tip-box p {
    color: #e5e7eb;
    margin: 0;
  }
  .retention-bar {
    background: #374151;
    border-radius: 8px;
    height: 24px;
    overflow: hidden;
    margin: 16px 0;
  }
  .retention-fill {
    background: linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%);
    height: 100%;
    border-radius: 8px;
    transition: width 0.3s ease;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin: 24px 0;
  }
  .stat-card {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-radius: 8px;
    text-align: center;
  }
  .stat-value {
    font-size: 28px;
    font-weight: bold;
    color: #00d9ff;
  }
  .stat-label {
    font-size: 12px;
    color: #9ca3af;
    text-transform: uppercase;
  }
  .footer {
    text-align: center;
    padding-top: 32px;
    border-top: 1px solid #374151;
    margin-top: 32px;
  }
  .footer p {
    font-size: 12px;
    color: #6b7280;
  }
  .footer a {
    color: #00d9ff;
    text-decoration: none;
  }
  .science-note {
    background: rgba(139, 92, 246, 0.1);
    border-left: 4px solid #8b5cf6;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin: 16px 0;
    font-size: 14px;
  }
  .science-note p {
    color: #c4b5fd;
    margin: 0;
  }
`;

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skillon</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">Skillon</span>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>
        <a href="{{unsubscribeUrl}}">Unsubscribe</a> |
        <a href="https://skillon.dev/account">Email Preferences</a>
      </p>
      <p>Skillon - AI-Powered Interview Practice</p>
    </div>
  </div>
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
  return "Welcome to Skillon - Let's ace your next interview";
}

export function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const content = `
    <h1>Welcome to Skillon, ${data.userName || "there"}!</h1>

    <p>You're one step closer to acing your next technical interview.</p>

    <p>Skillon is your AI-powered interview partner that helps you practice:</p>

    <ul style="color: #9ca3af; padding-left: 20px;">
      <li><strong style="color: #e5e7eb;">Data Structures & Algorithms</strong> - From Two Pointers to Dynamic Programming</li>
      <li><strong style="color: #e5e7eb;">System Design</strong> - Design scalable systems like the pros</li>
      <li><strong style="color: #e5e7eb;">Bug Fixing</strong> - Debug code under pressure</li>
    </ul>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/dashboard" class="cta-button">Start Your First Practice</a>
    </div>

    <div class="tip-box">
      <p><strong>Pro tip:</strong> 15 minutes of daily practice beats 2-hour cramming sessions. Consistency is the key to interview success.</p>
    </div>

    <div class="science-note">
      <p><strong>The Science:</strong> Research shows spaced practice improves retention by 200%. We'll send you smart reminders to help you remember what you've learned.</p>
    </div>

    <p>Ready to level up your interview skills?</p>

    <p style="color: #e5e7eb;">- The Skillon Team</p>
  `;

  return emailWrapper(content);
}

export function getWelcomeEmailText(data: WelcomeEmailData): string {
  return `
Welcome to Skillon, ${data.userName || "there"}!

You're one step closer to acing your next technical interview.

Skillon is your AI-powered interview partner that helps you practice:
- Data Structures & Algorithms
- System Design
- Bug Fixing

Start your first practice: ${data.appUrl}/dashboard

Pro tip: 15 minutes of daily practice beats 2-hour cramming sessions.

- The Skillon Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
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
    return "Your interview skills are fading - here's the science";
  } else if (hours < 72) {
    return "We miss you! Your progress is slipping away";
  } else {
    return "Don't lose your hard work - quick 5-minute practice?";
  }
}

export function getInactivityEmailHtml(data: InactivityEmailData): string {
  const days = Math.floor(data.hoursSinceLastSession / 24);
  const retentionEstimate = calculateRetention(days, 70);

  const urgencyMessage = data.hoursSinceLastSession < 48
    ? "Research shows we forget <strong class='highlight'>33% of new skills</strong> within 24 hours without reinforcement."
    : data.hoursSinceLastSession < 72
    ? "It's been over 2 days. Your interview skills are <strong class='highlight'>rapidly declining</strong>."
    : "Don't let all your hard work go to waste. A quick session can bring it all back.";

  const content = `
    <h1>Hey ${data.userName || "there"}, your skills are fading</h1>

    <p>It's been <strong class="highlight">${days} day${days !== 1 ? "s" : ""}</strong> since your last practice session.</p>

    <p>${urgencyMessage}</p>

    <div class="retention-bar">
      <div class="retention-fill" style="width: ${retentionEstimate}%;"></div>
    </div>
    <p style="text-align: center; font-size: 14px;">
      Estimated skill retention: <strong class="highlight">${retentionEstimate}%</strong>
    </p>

    ${data.lastTopic ? `<p>You were working on <strong class="highlight">${data.lastTopic}</strong> - don't let that knowledge slip away.</p>` : ""}

    ${data.streakDays && data.streakDays > 0 ? `
    <div class="stat-card" style="text-align: center; margin: 24px 0;">
      <div class="stat-value">${data.streakDays}</div>
      <div class="stat-label">Day Streak at Risk!</div>
    </div>
    ` : ""}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/dashboard" class="cta-button">5-Minute Quick Practice</a>
    </div>

    <div class="science-note">
      <p><strong>Ebbinghaus Forgetting Curve:</strong> Even a 5-minute review resets your memory curve and doubles retention time. The best time to review is right before you forget!</p>
    </div>

    <p style="font-size: 14px; color: #6b7280;">Even 5 minutes can reset your learning curve. Your future self will thank you.</p>
  `;

  return emailWrapper(content);
}

export function getInactivityEmailText(data: InactivityEmailData): string {
  const days = Math.floor(data.hoursSinceLastSession / 24);
  const retentionEstimate = calculateRetention(days, 70);

  return `
Hey ${data.userName || "there"},

It's been ${days} day${days !== 1 ? "s" : ""} since your last practice session.

Research shows we forget 33% of new skills within 24 hours without reinforcement.

Estimated skill retention: ${retentionEstimate}%

${data.lastTopic ? `You were working on ${data.lastTopic} - don't let that knowledge slip away.` : ""}

Even 5 minutes can reset your learning curve.

Start a quick practice: ${data.appUrl}/dashboard

- The Skillon Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
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
  const retentionEstimate = calculateRetention(data.daysSinceReview, data.lastScore || 70);
  return `Time to review ${data.topic} (your memory is at ${retentionEstimate}%)`;
}

export function getSpacedRepetitionEmailHtml(data: SpacedRepetitionEmailData): string {
  const retentionEstimate = calculateRetention(data.daysSinceReview, data.lastScore || 70);

  // Calculate next interval based on SM-2 algorithm
  const intervals = [1, 3, 7, 14, 30, 60];
  const nextIntervalIndex = Math.min((data.reviewCount || 0), intervals.length - 1);
  const nextInterval = intervals[nextIntervalIndex];

  const reviewUrl = data.scenarioId
    ? `${data.appUrl}/interview/${data.scenarioId}`
    : `${data.appUrl}/dashboard`;

  const content = `
    <h1>Time to review: ${data.topic}</h1>

    <p>You practiced <strong class="highlight">${data.topic}</strong> ${data.daysSinceReview} days ago
    ${data.lastScore ? `and scored <strong class="highlight">${data.lastScore}%</strong>` : ""}.
    Based on the forgetting curve, your retention is now around <strong class="highlight">${retentionEstimate}%</strong>.</p>

    <div class="retention-bar">
      <div class="retention-fill" style="width: ${retentionEstimate}%;"></div>
    </div>
    <p style="text-align: center; font-size: 14px;">
      Memory retention: <strong class="highlight">${retentionEstimate}%</strong>
    </p>

    ${data.pattern ? `<p>Pattern: <strong>${data.pattern}</strong></p>` : ""}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${reviewUrl}" class="cta-button">Review ${data.topic} Now</a>
    </div>

    <div class="science-note">
      <p><strong>Why now?</strong> Reviewing at ~${retentionEstimate}% retention is optimal. It's challenging enough to strengthen the memory, but not so late that you've forgotten everything. This review will lock in your knowledge for ${nextInterval}+ more days!</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.reviewCount || 1}</div>
        <div class="stat-label">Reviews</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${nextInterval}d</div>
        <div class="stat-label">Next Interval</div>
      </div>
    </div>

    <p style="font-size: 14px; color: #6b7280;">Each review doubles how long you remember. You're building lasting knowledge!</p>
  `;

  return emailWrapper(content);
}

export function getSpacedRepetitionEmailText(data: SpacedRepetitionEmailData): string {
  const retentionEstimate = calculateRetention(data.daysSinceReview, data.lastScore || 70);

  return `
Time to review: ${data.topic}

You practiced ${data.topic} ${data.daysSinceReview} days ago${data.lastScore ? ` and scored ${data.lastScore}%` : ""}.

Based on the forgetting curve, your retention is now around ${retentionEstimate}%.

Reviewing now will double how long you remember this material.

Review now: ${data.appUrl}/dashboard

- The Skillon Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
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
      return `Congrats! You've solved ${data.milestoneValue} problems!`;
    case "streak":
      return `${data.milestoneValue}-day streak! You're on fire!`;
    case "pattern_mastered":
      return `You've mastered ${data.milestoneValue}!`;
    case "first_session":
      return "You completed your first practice session!";
    default:
      return "Congratulations on your achievement!";
  }
}

export function getMilestoneEmailHtml(data: MilestoneEmailData): string {
  let celebrationContent = "";

  switch (data.milestoneType) {
    case "problems_solved":
      celebrationContent = `
        <h1>Amazing! ${data.milestoneValue} Problems Solved!</h1>
        <p>You've solved <strong class="highlight">${data.milestoneValue}</strong> interview problems. That's incredible dedication!</p>
        <div class="stat-card" style="text-align: center; margin: 24px auto; max-width: 200px;">
          <div class="stat-value">${data.milestoneValue}</div>
          <div class="stat-label">Problems Solved</div>
        </div>
      `;
      break;
    case "streak":
      celebrationContent = `
        <h1>${data.milestoneValue}-Day Streak!</h1>
        <p>You've practiced for <strong class="highlight">${data.milestoneValue} days in a row</strong>. Consistency is the key to mastery!</p>
        <div class="stat-card" style="text-align: center; margin: 24px auto; max-width: 200px;">
          <div class="stat-value">${data.milestoneValue}</div>
          <div class="stat-label">Day Streak</div>
        </div>
      `;
      break;
    case "pattern_mastered":
      celebrationContent = `
        <h1>Pattern Mastered: ${data.milestoneValue}!</h1>
        <p>You've achieved mastery in <strong class="highlight">${data.milestoneValue}</strong>. This pattern is now locked in your long-term memory!</p>
      `;
      break;
    case "first_session":
      celebrationContent = `
        <h1>Your Journey Begins!</h1>
        <p>Congratulations on completing your <strong class="highlight">first practice session</strong>! You've taken the most important step.</p>
        <p>The best interviewers aren't born - they're made through consistent practice.</p>
      `;
      break;
  }

  const content = `
    ${celebrationContent}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/dashboard" class="cta-button">Keep the Momentum Going</a>
    </div>

    <div class="tip-box">
      <p><strong>Keep it up!</strong> Your consistency is building neural pathways that will serve you well in real interviews.</p>
    </div>
  `;

  return emailWrapper(content);
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
    return `${data.daysUntilInterview} days until ${data.targetCompany}! Here's today's prep`;
  }
  return `Your ${data.targetCompany} prep for today (${data.todaysQuestions.length} questions)`;
}

export function getDailyRoadmapEmailHtml(data: DailyRoadmapEmailData): string {
  const progressPercent = Math.round((data.questionsCompleted / data.totalQuestions) * 100);

  const urgencyBanner = data.daysUntilInterview <= 7 ? `
    <div class="tip-box" style="background: rgba(239, 68, 68, 0.1); border-left-color: #ef4444;">
      <p style="color: #ef4444; margin: 0;">
        <strong>${data.daysUntilInterview} day${data.daysUntilInterview !== 1 ? 's' : ''} until your ${data.targetCompany} interview!</strong>
        Every practice session counts now.
      </p>
    </div>
  ` : '';

  const questionsHtml = data.todaysQuestions.map((q, i) => `
    <div style="background: rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 8px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: #fff;">${i + 1}. ${q.title}</strong>
          <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">
            ${q.pattern} • ${q.difficulty}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  const content = `
    <h1>Good morning, ${data.userName || 'there'}!</h1>

    ${urgencyBanner}

    <p>Here's your personalized practice plan for today based on your
    <strong class="highlight">${data.targetCompany}</strong> roadmap:</p>

    <h2 style="margin-top: 24px;">Today's Questions (${data.todaysQuestions.length})</h2>
    ${questionsHtml}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/roadmap" class="cta-button">Start Today's Practice</a>
    </div>

    <div class="retention-bar" style="margin-top: 24px;">
      <div class="retention-fill" style="width: ${progressPercent}%; background: linear-gradient(90deg, #00d9ff 0%, #10b981 100%);"></div>
    </div>
    <p style="text-align: center; font-size: 14px;">
      Roadmap progress: <strong class="highlight">${progressPercent}%</strong>
      (${data.questionsCompleted}/${data.totalQuestions} questions)
    </p>

    ${!data.isOnTrack ? `
    <div class="tip-box" style="background: rgba(251, 191, 36, 0.1); border-left-color: #fbbf24;">
      <p style="color: #fbbf24; margin: 0;">
        <strong>You're slightly behind schedule.</strong> Try to complete today's questions to get back on track!
      </p>
    </div>
    ` : `
    <div class="tip-box">
      <p><strong>You're on track!</strong> Keep up the great work. Consistency beats intensity.</p>
    </div>
    `}
  `;

  return emailWrapper(content);
}

export function getDailyRoadmapEmailText(data: DailyRoadmapEmailData): string {
  const questionsText = data.todaysQuestions.map((q, i) =>
    `${i + 1}. ${q.title} (${q.pattern}, ${q.difficulty})`
  ).join('\n');

  return `
Good morning, ${data.userName || 'there'}!

${data.daysUntilInterview <= 7 ? `${data.daysUntilInterview} days until your ${data.targetCompany} interview!` : ''}

Here's your practice plan for today:

${questionsText}

Progress: ${data.questionsCompleted}/${data.totalQuestions} questions (${Math.round((data.questionsCompleted / data.totalQuestions) * 100)}%)

Start practicing: ${data.appUrl}/roadmap

- The Skillon Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
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
    return `Tomorrow is your ${data.targetCompany} interview! Final prep tips`;
  }
  return `${data.daysUntilInterview} days until ${data.targetCompany} - Here's your focus`;
}

export function getInterviewCountdownEmailHtml(data: InterviewCountdownEmailData): string {
  const progressPercent = Math.round((data.questionsCompleted / data.totalQuestions) * 100);

  const focusPatterns = data.patternsToFocus.length > 0
    ? data.patternsToFocus.map(p => `<li>${p}</li>`).join('')
    : '<li>Review your completed problems</li>';

  const dayLabel = data.daysUntilInterview === 1 ? 'TOMORROW' :
                   data.daysUntilInterview === 7 ? '1 WEEK' :
                   `${data.daysUntilInterview} DAYS`;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 16px 32px; border-radius: 12px;">
        <div style="font-size: 14px; color: rgba(255,255,255,0.8); text-transform: uppercase;">Interview In</div>
        <div style="font-size: 36px; font-weight: bold; color: #fff;">${dayLabel}</div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.8);">${data.targetCompany}</div>
      </div>
    </div>

    <h1>Hey ${data.userName || 'there'}, you've got this!</h1>

    <p>Your ${data.targetCompany} interview is ${data.daysUntilInterview === 1 ? 'tomorrow' : `in ${data.daysUntilInterview} days`}.
    Here's where you stand:</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${progressPercent}%</div>
        <div class="stat-label">Roadmap Complete</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.questionsCompleted}</div>
        <div class="stat-label">Problems Solved</div>
      </div>
    </div>

    <h2 style="margin-top: 24px;">Focus Areas for Final Days:</h2>
    <ul style="color: #9ca3af; padding-left: 20px;">
      ${focusPatterns}
    </ul>

    ${data.daysUntilInterview <= 3 ? `
    <div class="science-note">
      <p><strong>Final day tips:</strong></p>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Review patterns you've already solved - don't learn new ones</li>
        <li>Get good sleep - it consolidates memory</li>
        <li>Practice explaining your thought process out loud</li>
      </ul>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/roadmap" class="cta-button">Continue Preparing</a>
    </div>

    <p style="text-align: center; color: #9ca3af; font-size: 14px;">
      You've put in the work. Trust your preparation!
    </p>
  `;

  return emailWrapper(content);
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
  return `You're ${data.questionsBehind} questions behind on your ${data.targetCompany} prep`;
}

export function getBehindScheduleEmailHtml(data: BehindScheduleEmailData): string {
  const content = `
    <h1>Hey ${data.userName || 'there'}, let's get you back on track!</h1>

    <div class="tip-box" style="background: rgba(251, 191, 36, 0.1); border-left-color: #fbbf24;">
      <p style="color: #fbbf24; margin: 0;">
        You're <strong>${data.questionsBehind} questions behind</strong> on your ${data.targetCompany} roadmap
        with <strong>${data.daysUntilInterview} days</strong> until your interview.
      </p>
    </div>

    <p style="margin-top: 24px;">Don't worry - you can catch up! Here's the plan:</p>

    <div class="stat-card" style="text-align: center; margin: 24px 0;">
      <div class="stat-value">${data.suggestedDailyQuestions}</div>
      <div class="stat-label">Questions per Day to Catch Up</div>
    </div>

    <div class="science-note">
      <p><strong>Psychology tip:</strong> Don't try to do it all at once. Consistent daily practice (even 1-2 problems) is more effective than cramming. Start with today's quota.</p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/roadmap" class="cta-button">Start Catching Up</a>
    </div>

    <p style="color: #9ca3af; font-size: 14px;">
      Remember: Every problem you solve increases your chances. Progress over perfection!
    </p>
  `;

  return emailWrapper(content);
}

// PAYMENT FAILURE NOTIFICATION

export interface PaymentFailedEmailData {
  userName: string;
  userEmail: string;
  failureReason?: string;
  appUrl: string;
}

export function getPaymentFailedEmailSubject(): string {
  return "Action required: Your Skillon payment failed";
}

export function getPaymentFailedEmailHtml(data: PaymentFailedEmailData): string {
  const content = `
    <h1>Hey ${data.userName || 'there'}, we had trouble processing your payment</h1>

    <div class="tip-box" style="background: rgba(239, 68, 68, 0.1); border-left-color: #ef4444;">
      <p style="color: #ef4444; margin: 0;">
        Your recent payment for Skillon Pro could not be processed.
        ${data.failureReason ? `<br/><strong>Reason:</strong> ${data.failureReason}` : ''}
      </p>
    </div>

    <p style="margin-top: 24px;">To keep your Pro access and continue your interview preparation without interruption, please update your payment method.</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/settings/billing" class="cta-button">Update Payment Method</a>
    </div>

    <div class="science-note">
      <p><strong>What happens next?</strong></p>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Your Pro access will remain active for a few more days while we retry</li>
        <li>We'll attempt to charge your card again automatically</li>
        <li>If payment continues to fail, your account will be downgraded to Free</li>
      </ul>
    </div>

    <p style="color: #9ca3af; font-size: 14px;">
      Need help? Reply to this email or contact us at support@skillon.ai
    </p>
  `;

  return emailWrapper(content);
}

export function getPaymentFailedEmailText(data: PaymentFailedEmailData): string {
  return `
Hey ${data.userName || 'there'},

We had trouble processing your payment for Skillon Pro.
${data.failureReason ? `Reason: ${data.failureReason}` : ''}

To keep your Pro access, please update your payment method:
${data.appUrl}/settings/billing

What happens next:
- Your Pro access will remain active for a few more days while we retry
- We'll attempt to charge your card again automatically
- If payment continues to fail, your account will be downgraded to Free

Need help? Contact us at support@skillon.ai

- The Skillon Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
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
  return "Welcome to Skillon Pro - Your subscription is active!";
}

export function getSubscriptionConfirmationEmailHtml(data: SubscriptionConfirmationEmailData): string {
  const formattedDate = data.nextBillingDate
    ? new Date(data.nextBillingDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const content = `
    <h1>Welcome to Skillon Pro, ${data.userName || 'there'}!</h1>

    <p>Thank you for upgrading to <strong class="highlight">Pro</strong>! Your subscription is now active.</p>

    <div class="stat-card" style="text-align: center; margin: 24px 0;">
      <div class="stat-value">${data.planName}</div>
      <div class="stat-label">Your Plan</div>
    </div>

    <div class="tip-box">
      <p><strong>Subscription Details:</strong></p>
      <ul style="margin: 8px 0; padding-left: 20px;">
        <li>Plan: ${data.planName}</li>
        <li>Amount: ${data.currency} ${data.amount.toFixed(2)}</li>
        <li>Next billing date: ${formattedDate}</li>
      </ul>
    </div>

    <p style="margin-top: 24px;">With Pro, you now have access to:</p>
    <ul style="color: #9ca3af; padding-left: 20px;">
      <li><strong style="color: #e5e7eb;">35 interview sessions per month</strong></li>
      <li><strong style="color: #e5e7eb;">Unlimited code execution</strong></li>
      <li><strong style="color: #e5e7eb;">Advanced AI feedback</strong></li>
      <li><strong style="color: #e5e7eb;">Priority support</strong></li>
    </ul>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/dashboard" class="cta-button">Start Practicing</a>
    </div>

    <p style="color: #9ca3af; font-size: 14px;">
      Manage your subscription anytime at <a href="${data.appUrl}/settings/billing" style="color: #00d9ff;">${data.appUrl}/settings/billing</a>
    </p>
  `;

  return emailWrapper(content);
}

export function getSubscriptionConfirmationEmailText(data: SubscriptionConfirmationEmailData): string {
  const formattedDate = data.nextBillingDate
    ? new Date(data.nextBillingDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return `
Welcome to Skillon Pro, ${data.userName || 'there'}!

Thank you for upgrading to Pro! Your subscription is now active.

Subscription Details:
- Plan: ${data.planName}
- Amount: ${data.currency} ${data.amount.toFixed(2)}
- Next billing date: ${formattedDate}

With Pro, you now have access to:
- 35 interview sessions per month
- Unlimited code execution
- Advanced AI feedback
- Priority support

Start practicing: ${data.appUrl}/dashboard

Manage your subscription: ${data.appUrl}/settings/billing

- The Skillon Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
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
    ? "Your Skillon Pro subscription has ended"
    : "Your Skillon Pro cancellation is confirmed";
}

export function getSubscriptionCancellationEmailHtml(data: SubscriptionCancellationEmailData): string {
  const formattedDate = data.accessUntil
    ? new Date(data.accessUntil).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'today';

  const content = data.isImmediate
    ? `
      <h1>Your subscription has ended</h1>

      <p>Hey ${data.userName || 'there'},</p>

      <p>Your Skillon Pro subscription has ended. You've been moved to our Free plan.</p>

      <div class="tip-box" style="background: rgba(251, 191, 36, 0.1); border-left-color: #fbbf24;">
        <p style="color: #fbbf24; margin: 0;">
          <strong>Your account has been downgraded to Free.</strong>
          You now have access to 5 interview sessions per month.
        </p>
      </div>

      <p style="margin-top: 24px;">We're sorry to see you go! If you ever want to come back, your progress and history will be waiting for you.</p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.appUrl}/pricing" class="cta-button">Resubscribe to Pro</a>
      </div>

      <div class="science-note">
        <p><strong>We'd love to hear from you!</strong> If there's anything we could have done better, please reply to this email and let us know.</p>
      </div>
    `
    : `
      <h1>Your cancellation is confirmed</h1>

      <p>Hey ${data.userName || 'there'},</p>

      <p>We've received your cancellation request. Your Pro subscription has been set to cancel at the end of your billing period.</p>

      <div class="stat-card" style="text-align: center; margin: 24px 0;">
        <div class="stat-value">${formattedDate}</div>
        <div class="stat-label">Pro Access Until</div>
      </div>

      <div class="tip-box">
        <p><strong>Good news!</strong> You'll keep full Pro access until ${formattedDate}. Make the most of it!</p>
      </div>

      <p style="margin-top: 24px;">Changed your mind? You can reactivate your subscription anytime before it expires:</p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.appUrl}/settings/billing" class="cta-button">Reactivate Subscription</a>
      </div>

      <div class="science-note">
        <p><strong>We'd love to hear from you!</strong> If there's anything we could have done better, please reply to this email and let us know.</p>
      </div>
    `;

  return emailWrapper(content);
}

export function getSubscriptionCancellationEmailText(data: SubscriptionCancellationEmailData): string {
  const formattedDate = data.accessUntil
    ? new Date(data.accessUntil).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'today';

  if (data.isImmediate) {
    return `
Your subscription has ended

Hey ${data.userName || 'there'},

Your Skillon Pro subscription has ended. You've been moved to our Free plan.

You now have access to 5 interview sessions per month.

We're sorry to see you go! If you ever want to come back, your progress and history will be waiting for you.

Resubscribe to Pro: ${data.appUrl}/pricing

- The Skillon Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
    `.trim();
  }

  return `
Your cancellation is confirmed

Hey ${data.userName || 'there'},

We've received your cancellation request. Your Pro subscription has been set to cancel at the end of your billing period.

Pro Access Until: ${formattedDate}

Good news! You'll keep full Pro access until ${formattedDate}. Make the most of it!

Changed your mind? Reactivate your subscription:
${data.appUrl}/settings/billing

- The Skillon Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
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
  return "Your Skillon Pro trial ends in 3 days";
}

export function getTrialEndingEmailHtml(data: TrialEndingEmailData): string {
  const formattedDate = data.trialEndDate
    ? new Date(data.trialEndDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'soon';

  const content = `
    <h1>Your Pro trial ends soon!</h1>

    <p>Hey ${data.userName || 'there'},</p>

    <p>Your Skillon Pro trial is ending on <strong class="highlight">${formattedDate}</strong>.</p>

    <div class="stat-card" style="text-align: center; margin: 24px 0;">
      <div class="stat-value">3</div>
      <div class="stat-label">Days Remaining</div>
    </div>

    <div class="tip-box">
      <p><strong>What happens next?</strong> After your trial ends, your payment method will be charged automatically. If you don't want to continue, you can cancel before ${formattedDate}.</p>
    </div>

    <p style="margin-top: 24px;">With Pro, you get:</p>
    <ul style="color: #9ca3af; padding-left: 20px;">
      <li><strong style="color: #e5e7eb;">35 interview sessions per month</strong></li>
      <li><strong style="color: #e5e7eb;">Unlimited code execution</strong></li>
      <li><strong style="color: #e5e7eb;">Advanced AI feedback</strong></li>
      <li><strong style="color: #e5e7eb;">Priority support</strong></li>
    </ul>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/settings/billing" class="cta-button">Manage Subscription</a>
    </div>

    <p style="color: #9ca3af; font-size: 14px;">
      Have questions? Reply to this email and we'll be happy to help!
    </p>
  `;

  return emailWrapper(content);
}

export function getTrialEndingEmailText(data: TrialEndingEmailData): string {
  const formattedDate = data.trialEndDate
    ? new Date(data.trialEndDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'soon';

  return `
Your Pro trial ends soon!

Hey ${data.userName || 'there'},

Your Skillon Pro trial is ending on ${formattedDate}.

What happens next?
After your trial ends, your payment method will be charged automatically. If you don't want to continue, you can cancel before ${formattedDate}.

With Pro, you get:
- 35 interview sessions per month
- Unlimited code execution
- Advanced AI feedback
- Priority support

Manage your subscription: ${data.appUrl}/settings/billing

Have questions? Reply to this email and we'll be happy to help!

- The Skillon Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
  `.trim();
}
