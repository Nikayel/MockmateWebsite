/**
 * Content guard for everything a user receives from CodeSparring: emails and
 * notification strings.
 *
 * The 2026-08-14 email council removed a founder persona ("cs senior at sac state"),
 * invented statistics ("your brain forgets 70%"), hype ("crushing it"), dash-as-comma
 * punctuation, emoji, and two billing falsehoods (yearly one-time payments described
 * as auto-renewing). A rule in prose drifts, so this test makes the build fail when
 * any of it comes back.
 *
 * Comments are stripped before matching so the code may still DOCUMENT why a phrase
 * is banned without tripping the guard. Only block comments and whole-line // comments
 * are stripped: template strings here contain URLs ("https://...") that an inline //
 * strip would truncate, silently blinding every assertion after the scheme.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()

/** Every file whose string literals reach a user's inbox or notification tray. */
const USER_FACING_MESSAGE_FILES = [
  "lib/email/templates.ts",
  "lib/email/notifications.ts",
  "app/api/email/welcome/route.ts",
  "app/api/cron/email-notifications/route.ts",
  "lib/services/notification-service.ts",
  "lib/rag/knowledge-base/notification-knowledge.ts",
]

function codeWithoutComments(relativePath: string): string {
  const source = readFileSync(join(ROOT, relativePath), "utf8")
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "")
}

/**
 * Case-insensitive phrases that must never appear in user-facing message files.
 * Each entry names the failure it guards against.
 */
const BANNED_PHRASES: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /sac state/i, reason: "founder persona removed by the email council" },
  { pattern: /sacramento/i, reason: "founder persona removed by the email council" },
  { pattern: /cs senior/i, reason: "founder persona removed by the email council" },
  { pattern: /trust me/i, reason: "fake-casual filler" },
  { pattern: /just saying/i, reason: "fake-casual filler" },
  { pattern: /crush/i, reason: "hype verb (covers crushed/crushing)" },
  { pattern: /70% of what you learned/i, reason: "invented statistic" },
  { pattern: /your brain forgets/i, reason: "invented statistic" },
  { pattern: /there'?s science here/i, reason: "condescending framing" },
  { pattern: /leetcode/i, reason: "competitor name-drop in the founder story" },
  { pattern: /moves the needle/i, reason: "startup cliche" },
  { pattern: /you'?re on fire/i, reason: "hype" },
  { pattern: /achievement unlocked/i, reason: "gamification hype" },
  { pattern: /amazing!/i, reason: "hype" },
  { pattern: /keep it up\b/i, reason: "filler encouragement" },
  { pattern: /unlimited code execution/i, reason: "claim not on the pricing truth sheet" },
  { pattern: /advanced ai feedback/i, reason: "claim not on the pricing truth sheet" },
  { pattern: /quick check in/i, reason: "vague subject replaced by the council" },
  { pattern: /"following up"/i, reason: "vague subject replaced by the council" },
  { pattern: /issue with your payment/i, reason: "vague subject replaced by the council" },
  { pattern: /will be charged automatically/i, reason: "false for one-time yearly payments" },
  { pattern: /next billing/i, reason: "false for one-time yearly payments" },
  { pattern: /\bmaster (the|your|it)\b/i, reason: "hype verb from the site voice contract" },
  { pattern: /\bunlock/i, reason: "hype verb from the site voice contract" },
]

/**
 * En dash and em dash are banned as prose punctuation in user-facing strings
 * (site-wide voice contract). Use a comma, colon, or period instead.
 */
const DASH_PATTERN = /[–—]/

/**
 * Emoji are banned in email and notification strings. Covers the main emoji
 * blocks plus the legacy misc-symbols range (2600-27BF) where 🎉-adjacent
 * symbols and ✅/❌ live, and the variation selector that turns text glyphs
 * into emoji presentation.
 */
const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u

describe("user-facing message content guard", () => {
  it.each(USER_FACING_MESSAGE_FILES)("%s contains no banned phrases", (path) => {
    const code = codeWithoutComments(path)
    for (const { pattern, reason } of BANNED_PHRASES) {
      expect(pattern.test(code), `${path} matches ${pattern} (${reason})`).toBe(false)
    }
  })

  it.each(USER_FACING_MESSAGE_FILES)("%s uses no en/em dashes as punctuation", (path) => {
    const code = codeWithoutComments(path)
    expect(
      DASH_PATTERN.test(code),
      `${path} contains an en/em dash; use a comma, colon, or period`
    ).toBe(false)
  })

  it.each(USER_FACING_MESSAGE_FILES)("%s contains no emoji", (path) => {
    const code = codeWithoutComments(path)
    const match = code.match(EMOJI_PATTERN)
    expect(match, `${path} contains emoji ${match?.[0] ?? ""}`).toBeNull()
  })

  // The dead-code deletions must not regress: the milestone email path and the
  // pseudo-scientific retention estimate were removed, not relocated.
  it("the milestone email path and calculateRetention stay deleted", () => {
    for (const path of [
      "lib/email/templates.ts",
      "lib/email/notifications.ts",
      "lib/email/brevo.ts",
    ]) {
      const code = codeWithoutComments(path)
      expect(code, `${path} must not resurrect sendMilestoneEmail`).not.toContain(
        "sendMilestoneEmail"
      )
      expect(code, `${path} must not resurrect calculateRetention`).not.toContain(
        "calculateRetention"
      )
    }
  })

  // Every email ships an HTML part and a matching plain-text part. The senders in
  // notifications.ts are the chokepoint: count the pairings there.
  it("every sendEmail call in notifications.ts passes both htmlContent and textContent", () => {
    const code = codeWithoutComments("lib/email/notifications.ts")
    const htmlCount = (code.match(/htmlContent:/g) ?? []).length
    const textCount = (code.match(/textContent:/g) ?? []).length
    expect(htmlCount).toBeGreaterThan(0)
    expect(textCount, "every htmlContent needs a textContent sibling (plain-text parity)").toBe(
      htmlCount
    )
  })

  // Reminder-class senders must carry the unsubscribe delivery (link + headers).
  it("every reminder sender wires unsubscribe headers", () => {
    const code = codeWithoutComments("lib/email/notifications.ts")
    const reminderSends = (code.match(/reminderDelivery\(userId/g) ?? []).length
    const headerWirings = (code.match(/headers: delivery\.headers/g) ?? []).length
    expect(reminderSends).toBeGreaterThanOrEqual(7)
    expect(headerWirings, "a reminderDelivery() without headers wiring").toBe(reminderSends)
  })
})

describe("rendered email output", async () => {
  const t = await import("../templates")
  const base = {
    userName: "Jordan Smith",
    userEmail: "jordan@example.com",
    appUrl: "https://www.codesparring.dev",
  }

  const subjects: Array<[string, string]> = [
    ["welcome", t.getWelcomeEmailSubject()],
    ["inactivity <48h", t.getInactivityEmailSubject(30)],
    ["inactivity <72h", t.getInactivityEmailSubject(60)],
    ["inactivity 72h+ with topic", t.getInactivityEmailSubject(90, "Two Pointers")],
    ["inactivity 72h+ no topic", t.getInactivityEmailSubject(90)],
    [
      "spaced repetition",
      t.getSpacedRepetitionEmailSubject({ ...base, topic: "Two Pointers", daysSinceReview: 4 }),
    ],
    [
      "daily roadmap",
      t.getDailyRoadmapEmailSubject({
        ...base,
        targetCompany: "Google",
        daysUntilInterview: 10,
        todaysQuestions: [],
        questionsCompleted: 1,
        totalQuestions: 10,
        isOnTrack: true,
      }),
    ],
    [
      "countdown",
      t.getInterviewCountdownEmailSubject({
        ...base,
        targetCompany: "Google",
        daysUntilInterview: 3,
        questionsCompleted: 1,
        totalQuestions: 10,
        patternsToFocus: [],
      }),
    ],
    [
      "behind schedule",
      t.getBehindScheduleEmailSubject({
        ...base,
        targetCompany: "Google",
        daysUntilInterview: 5,
        questionsBehind: 4,
        suggestedDailyQuestions: 2,
      }),
    ],
    ["payment failed", t.getPaymentFailedEmailSubject()],
    ["confirmation", t.getSubscriptionConfirmationEmailSubject()],
    ["cancellation immediate", t.getSubscriptionCancellationEmailSubject(true)],
    ["cancellation scheduled", t.getSubscriptionCancellationEmailSubject(false)],
    ["yearly expired", t.getYearlyExpiredEmailSubject()],
    [
      "yearly expiry reminder",
      t.getYearlyExpiryReminderEmailSubject({ ...base, expiryDate: "2027-08-14T00:00:00.000Z" }),
    ],
    [
      "trial ending",
      t.getTrialEndingEmailSubject({ ...base, trialEndDate: "2026-09-01T00:00:00.000Z" }),
    ],
    ["activation nudge", t.getActivationNudgeEmailSubject()],
    ["feedback ask", t.getFirstSessionFeedbackEmailSubject()],
  ]

  it.each(subjects)("subject (%s) does not start lowercase", (_label, subject) => {
    expect(subject).toBeTruthy()
    expect(subject, `subject "${subject}" starts with a lowercase letter`).not.toMatch(/^[a-z]/)
  })

  it("the yearly confirmation says one-time and never promises a renewal", () => {
    const data = {
      ...base,
      planName: "Pro (Yearly)",
      amount: 225,
      currency: "USD",
      nextBillingDate: "2027-08-14T00:00:00.000Z",
      isOneTime: true,
    }
    for (const rendered of [
      t.getSubscriptionConfirmationEmailHtml(data),
      t.getSubscriptionConfirmationEmailText(data),
    ]) {
      expect(rendered).toContain("one-time")
      expect(rendered).toContain("Access until")
      expect(rendered).not.toContain("Renews")
    }
  })

  it("the monthly confirmation shows a renewal date", () => {
    const data = {
      ...base,
      planName: "Pro (Monthly)",
      amount: 25,
      currency: "USD",
      nextBillingDate: "2026-09-14T00:00:00.000Z",
    }
    expect(t.getSubscriptionConfirmationEmailHtml(data)).toContain("Renews")
    expect(t.getSubscriptionConfirmationEmailText(data)).toContain("Renews")
  })

  it("the yearly expiry reminder never says trial", () => {
    const data = { ...base, expiryDate: "2027-08-14T00:00:00.000Z" }
    for (const rendered of [
      t.getYearlyExpiryReminderEmailSubject(data),
      t.getYearlyExpiryReminderEmailHtml(data),
      t.getYearlyExpiryReminderEmailText(data),
    ]) {
      expect(rendered.toLowerCase()).not.toContain("trial")
    }
  })

  it("the welcome email points at the free /learn courses", () => {
    const data = { ...base }
    expect(t.getWelcomeEmailHtml(data)).toContain("/learn")
    expect(t.getWelcomeEmailText(data)).toContain("/learn")
  })

  it("reminder emails render the tokenized unsubscribe link when provided", () => {
    const options = {
      unsubscribeUrl: "https://www.codesparring.dev/api/email/unsubscribe?token=abc",
    }
    const data = { ...base, hoursSinceLastSession: 48 }
    expect(t.getInactivityEmailHtml(data, options)).toContain(options.unsubscribeUrl)
    expect(t.getInactivityEmailText(data, options)).toContain(options.unsubscribeUrl)
  })

  it("user-controlled strings are HTML-escaped at the template boundary", () => {
    const hostile = { ...base, userName: `<script>alert(1)</script>` }
    expect(t.getWelcomeEmailHtml(hostile)).not.toContain("<script>")
    const hostileTopic = {
      ...base,
      topic: `<img src=x onerror=alert(1)>`,
      daysSinceReview: 3,
    }
    expect(t.getSpacedRepetitionEmailHtml(hostileTopic)).not.toContain("<img")
  })
})
