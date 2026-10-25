/**
 * HMAC unsubscribe links. New tokens explicitly stop all optional email;
 * historical tokens preserve their original category-only scope.
 * Neither scope can read data or opt anyone back in. Signing uses
 * EMAIL_UNSUBSCRIBE_SECRET, falling back to CRON_SECRET. Optional reminders
 * fail closed when their unsubscribe headers cannot be configured.
 */

import { createHmac, timingSafeEqual } from "node:crypto"
import { getAppBaseUrl } from "../site-url"

/**
 * Reminder-email categories and the profile preference toggle each one flips.
 * The toggle names are the fields the cron checks before sending (the
 * profiles.notification_preferences map), so an unsubscribe here is honored by
 * every send path. The activation nudge and first-session feedback ask ride the
 * inactivity toggle by design: one "occasional nudges" switch, not a taxonomy.
 */
export const UNSUBSCRIBE_CATEGORIES = {
  inactivity: "inactivity_reminders",
  spaced_repetition: "spaced_repetition_reminders",
  roadmap: "roadmap_reminders",
  marketing: "marketing_emails",
} as const

export type UnsubscribeCategory = keyof typeof UNSUBSCRIBE_CATEGORIES

function unsubscribeSecret(): string | null {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || null
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function mintUnsubscribeToken(userId: string, category: UnsubscribeCategory): string | null {
  const secret = unsubscribeSecret()
  if (!secret || !userId) return null
  const payload = Buffer.from(JSON.stringify({ u: userId, c: category, s: "optional" })).toString(
    "base64url"
  )
  return `${payload}.${sign(payload, secret)}`
}

export function verifyUnsubscribeToken(
  token: string
): { userId: string; category: UnsubscribeCategory; scope: "optional" | "category" } | null {
  const secret = unsubscribeSecret()
  if (!secret) return null

  const dot = token.indexOf(".")
  if (dot <= 0) return null
  const payload = token.slice(0, dot)
  const providedSig = token.slice(dot + 1)

  const expectedSig = sign(payload, secret)
  const provided = Buffer.from(providedSig)
  const expected = Buffer.from(expectedSig)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (typeof parsed !== "object" || parsed === null) return null
    const { u, c, s } = parsed as { u?: unknown; c?: unknown; s?: unknown }
    if (typeof u !== "string" || u.length === 0) return null
    if (typeof c !== "string" || !Object.prototype.hasOwnProperty.call(UNSUBSCRIBE_CATEGORIES, c))
      return null
    if (s !== undefined && s !== "optional") return null
    return {
      userId: u,
      category: c as UnsubscribeCategory,
      scope: s === "optional" ? "optional" : "category",
    }
  } catch {
    return null
  }
}

/** Absolute unsubscribe URL for a reminder email, or undefined when unmintable. */
export function unsubscribeUrlFor(
  userId: string,
  category: UnsubscribeCategory
): string | undefined {
  const token = mintUnsubscribeToken(userId, category)
  if (!token) return undefined
  return `${getAppBaseUrl()}/api/email/unsubscribe?token=${encodeURIComponent(token)}`
}

/**
 * List-Unsubscribe headers for a reminder-class send (RFC 2369 + RFC 8058).
 * Returns undefined when no token can be minted; transactional emails never
 * call this.
 */
export function listUnsubscribeHeaders(
  userId: string,
  category: UnsubscribeCategory
): Record<string, string> | undefined {
  const url = unsubscribeUrlFor(userId, category)
  if (!url) return undefined
  return {
    "List-Unsubscribe": `<mailto:nikayel@codesparring.dev?subject=unsubscribe>, <${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}
