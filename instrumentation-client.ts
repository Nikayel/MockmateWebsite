/**
 * PostHog client init. Next.js runs this file in the browser before the app
 * hydrates, so capture starts before React does.
 *
 * Privacy posture, mirroring the CookieConsent contract:
 *  - Before analytics consent: cookieless. `persistence: "memory"` writes
 *    nothing to the device and dies with the tab; session replay stays off.
 *  - After consent: ConsentAnalytics upgrades persistence and starts replay.
 *  - Anonymous visitors stay anonymous events (`person_profiles:
 *    "identified_only"`); lib/auth-context identifies them on login.
 *
 * Traffic goes through the first-party /ingest proxy (see next.config.mjs),
 * not *.posthog.com, so developer-audience ad blockers don't eat it.
 */
import posthog from "posthog-js"
import { hasAnalyticsConsent } from "@/components/CookieConsent"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (POSTHOG_KEY) {
  const consented = hasAnalyticsConsent()
  posthog.init(POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    persistence: consented ? "localStorage+cookie" : "memory",
    disable_session_recording: !consented,
  })
}
