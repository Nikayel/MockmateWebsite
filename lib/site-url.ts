/**
 * Base URL for links that LEAVE the app: referral share links and notification emails.
 *
 * The canonical public origin is `lib/seo/site.ts`, which is the only place the apex host is written
 * down. This module used to carry its own copy of that literal, which is how the site ended up with
 * four independent origin constants that could each drift on their own.
 *
 * It still exists rather than being deleted because `NEXT_PUBLIC_APP_URL` is a genuinely different
 * knob: it lets a deployment point outbound links at an app host that is not the marketing origin.
 * When it is unset (the normal case) this delegates, so a URL inside an email can never land on a
 * different host than the one every canonical tag and every sitemap entry uses.
 *
 * Any trailing slash is stripped, because every caller concatenates a leading-slash path.
 */
import { SITE_ORIGIN } from "./seo/site"

export function getAppBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl) return appUrl.replace(/\/+$/, "")
  return SITE_ORIGIN
}
