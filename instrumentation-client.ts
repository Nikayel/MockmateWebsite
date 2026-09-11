/**
 * PostHog client init. Next.js runs this file in the browser before the app
 * hydrates, so capture starts before React does.
 *
 * Privacy posture, mirroring the CookieConsent contract:
 *  - Before analytics consent: cookieless. `cookieless_mode: "on_reject"` (see
 *    lib/posthog-consent) hands identity to a hash computed on PostHog's
 *    servers, so no identifier is stored on the device; session replay stays
 *    off.
 *  - After consent: ConsentAnalytics opts in, which restores ordinary cookie
 *    persistence, and starts replay on the routes that allow it. See
 *    REPLAY_EXCLUDED_ROUTES there: replay never runs on the surfaces where the
 *    user writes code or talks to the AI.
 *  - Anonymous visitors stay anonymous events (`person_profiles:
 *    "identified_only"`); lib/auth-context identifies them on login.
 *
 * This used to run `persistence: "memory"` before consent. That did keep the
 * device clean, but memory persistence dies with the document, so every full
 * page load minted a fresh distinct_id AND a fresh session id while
 * client-side `<Link>` navigation kept the old one. The result was that one
 * human reading four pages could arrive as four "people", which made visitor
 * counts, retention and any funnel spanning a hard navigation meaningless.
 * Cookieless mode is the supported way to keep the device clean without
 * throwing identity away with it.
 *
 * Replay starts disabled here even for someone who already consented. Whether
 * it may run now depends on the route as well as consent, and the route changes
 * without this file running again, so ConsentAnalytics has to own that decision
 * anyway; it holds the exclusion list and starts the recorder itself. Leaving
 * the old `!consented` here would mean a consented visitor who loads /interview
 * directly gets recorded for the few hundred milliseconds before React hydrates,
 * and this file cannot ask ConsentAnalytics instead without pulling its Firebase
 * analytics dependency into the first client module every page evaluates. So
 * replay is off until ConsentAnalytics turns it on. Consent is still required,
 * and an allowed page still starts recording on its first render.
 *
 * Traffic goes through the first-party /ingest proxy (see next.config.mjs),
 * not *.posthog.com, so developer-audience ad blockers don't eat it.
 */
import posthog from "posthog-js"
import { hasAnalyticsConsent } from "@/components/CookieConsent"
import { COOKIELESS_UNTIL_CONSENT, applyPostHogConsent } from "@/lib/posthog-consent"
import { dropUnattributableExceptions } from "@/lib/posthog-exception-filter"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2025-05-24",
    person_profiles: "identified_only",
    // Only ever reached once the visitor has opted in; until then
    // cookieless_mode overrides it and nothing is written to the device.
    persistence: "localStorage+cookie",
    disable_session_recording: true,
    // Second line of defence behind the route exclusion: on the pages that do
    // record, rrweb masks every input value before the recording is sent.
    session_recording: { maskAllInputs: true },
    // Autocapture reports every uncaught browser error. Extensions and injected
    // third-party scripts throw on our pages too, so drop exceptions whose
    // frames we cannot attribute to our own code before they reach the inbox.
    before_send: dropUnattributableExceptions,
    ...COOKIELESS_UNTIL_CONSENT,
  })

  // Must run on every load, not just when the banner is answered: PostHog's own
  // consent state does not survive a reload in cookieless mode, and its default
  // is to write cookies.
  applyPostHogConsent(hasAnalyticsConsent())
}
