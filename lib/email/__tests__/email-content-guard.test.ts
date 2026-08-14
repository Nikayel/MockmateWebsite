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
})
