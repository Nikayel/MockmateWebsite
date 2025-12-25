/**
 * Email Templates for Mockmate
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
  <title>Mockmate</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <span class="logo-text">Mockmate</span>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>
        <a href="{{unsubscribeUrl}}">Unsubscribe</a> |
        <a href="https://mockmate.dev/settings/notifications">Email Preferences</a>
      </p>
      <p>Mockmate - AI-Powered Interview Practice</p>
    </div>
  </div>
</body>
</html>
`;

// ============================================
// WELCOME EMAIL
// ============================================

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  appUrl: string;
}

export function getWelcomeEmailSubject(): string {
  return "Welcome to Mockmate - Let's ace your next interview";
}

export function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const content = `
    <h1>Welcome to Mockmate, ${data.userName || "there"}!</h1>

    <p>You're one step closer to acing your next technical interview.</p>

    <p>Mockmate is your AI-powered interview partner that helps you practice:</p>

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

    <p style="color: #e5e7eb;">- The Mockmate Team</p>
  `;

  return emailWrapper(content);
}

export function getWelcomeEmailText(data: WelcomeEmailData): string {
  return `
Welcome to Mockmate, ${data.userName || "there"}!

You're one step closer to acing your next technical interview.

Mockmate is your AI-powered interview partner that helps you practice:
- Data Structures & Algorithms
- System Design
- Bug Fixing

Start your first practice: ${data.appUrl}/dashboard

Pro tip: 15 minutes of daily practice beats 2-hour cramming sessions.

- The Mockmate Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
  `.trim();
}

// ============================================
// INACTIVITY REMINDER (24h+)
// ============================================

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

- The Mockmate Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
  `.trim();
}

// ============================================
// SPACED REPETITION REMINDER (3+ days)
// ============================================

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

- The Mockmate Team

---
Unsubscribe: ${data.appUrl}/settings/notifications
  `.trim();
}

// ============================================
// MILESTONE CELEBRATION
// ============================================

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
