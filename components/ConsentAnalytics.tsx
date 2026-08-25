"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import posthog from "posthog-js"
import { getConsentState, type ConsentState } from "@/components/CookieConsent"
import { syncAnalyticsConsent } from "@/lib/analytics"
import { applyPostHogConsent } from "@/lib/posthog-consent"

/**
 * Routes where session replay never runs.
 *
 * Replay records the screen, not just form fields, so on these surfaces it
 * would capture the code the user is writing and the conversation they are
 * having with the AI interviewer. That is their work, not a usage signal, and
 * it would land in PostHog against a named person: lib/auth-context calls
 * `posthog.identify(uid, { email })` as soon as they log in. Masking would not
 * have saved it either, since the editor is CodeMirror and renders a
 * contenteditable div rather than an `<input>`.
 *
 * What is left recording is the marketing surface: the home page, pricing, the
 * comparison and blog pages, sign-up, and the user's own account pages. That is
 * the funnel we actually want to watch, and it is what /legal describes.
 *
 * Two entries below are deliberately broader than the editor they name. Only
 * `/labs/[labId]` mounts the Build station, and within `/learn` only the
 * `workspace` leaf mounts a lesson editor; the parent routes are public SEO
 * pages with no editor at all,
 * so excluding the whole subtree costs us replay on real entry pages. We take
 * that trade knowingly. Getting the boundary wrong in the other direction means
 * silently recording someone's code, and a lost funnel recording is a cheaper
 * mistake than that. Narrow these only with a test pinning every editor route.
 *
 * Matching is per path segment, so "/interview" excludes the live interview and
 * leaves the "/interview-prep" landing pages recording.
 */
const REPLAY_EXCLUDED_ROUTES = [
  "/interview", // the interviewer chat and the CodeMirror editor
  "/labs", // subtree: /labs/[labId] mounts the Case Lab chat and Build editor
  "/learn", // subtree: the workspace leaf mounts exercise and free-response editors
  "/practice", // the review queue over problems the user has already attempted
  "/python-executor", // the free scratchpad is a bare editor
  "/sessions", // a finished session renders its final code and its transcript
  "/admin", // renders OTHER users' emails as text, which input masking never covers
]

/**
 * Whether replay must stay off on this path. A null pathname means we cannot
 * tell where we are, and the safe answer to that is not to record.
 */
export function isReplayExcludedPath(pathname: string | null): boolean {
  if (!pathname) return true
  return REPLAY_EXCLUDED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

/**
 * Single mount point for every optional analytics vendor.
 *
 * Vercel Analytics and Speed Insights are gated by simply not rendering their
 * components. Firebase Analytics (GA4) has no component to withhold, so it is
 * gated imperatively through `syncAnalyticsConsent()`, driven by the exact same
 * `hasConsent` signal and the same `consentUpdated` / `storage` listeners. Both
 * vendors therefore turn on and off together, which is what /legal promises.
 */
export function ConsentAnalytics() {
  /**
   * `null` means "we have not read the stored preference yet", and it is a
   * third state rather than a falsy boolean because the two are different
   * instructions to PostHog. `false` means "opt this visitor out", and
   * opt_out_capturing() clears persistence as well as capture. Seeding this
   * `false` therefore told PostHog to wipe the device on every single page
   * load, including for visitors who had already consented: the effect below
   * ran once with the seeded value, cleared persistence, and then ran again
   * with the real value and minted a fresh distinct_id.
   *
   * That cost us both halves of the analytics. Identity fragmented, so one
   * human reading one page arrived as several people, and replay never
   * survived, because wiping persistence between stop and start hands the
   * recorder a new session id and leaves orphan fragments with no full
   * snapshot to render from. We cannot seed from localStorage either, since
   * this component server-renders and reading it during render is a hydration
   * mismatch. So the state stays unknown until an effect can read it, and
   * everything that talks to PostHog no-ops while it is unknown.
   */
  const [consentState, setConsentState] = useState<ConsentState | null>(null)

  /**
   * `null` and `"unanswered"` are NOT the same and must not be merged. `null`
   * is "we have not read the stored preference yet" and is the only one that
   * means we must not talk to PostHog at all. `"unanswered"` is a read result:
   * the visitor has been offered the banner and has not chosen.
   */
  const hasConsent = consentState === "granted"
  const pathname = usePathname()

  /** The consent value last pushed into PostHog, so we push only on change. */
  const appliedConsent = useRef<boolean | null>(null)

  useEffect(() => {
    setConsentState(getConsentState())

    /**
     * The banner ships the visitor's choice in `event.detail`, and that is what
     * we act on when it is there. Re-reading storage instead would discard the
     * choice whenever the write failed, because storage in that case still says
     * "unanswered" and we would answer a click with silence. The `storage`
     * event carries no detail and correctly falls through to a read: it fires
     * for the OTHER tab, whose write did land.
     */
    const handleConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<{ analytics?: boolean }>).detail
      if (detail && typeof detail.analytics === "boolean") {
        setConsentState(detail.analytics ? "granted" : "declined")
        return
      }
      setConsentState(getConsentState())
    }

    window.addEventListener("consentUpdated", handleConsentChange)
    window.addEventListener("storage", handleConsentChange)

    return () => {
      window.removeEventListener("consentUpdated", handleConsentChange)
      window.removeEventListener("storage", handleConsentChange)
    }
  }, [])

  // Runs on mount and on every consent change. Starting GA4 here (rather than
  // waiting for the first trackEvent call) preserves the automatic page_view
  // that getAnalytics fires, which is the app's only page-view signal since
  // trackPageView has no call sites.
  useEffect(() => {
    if (consentState === null) return
    syncAnalyticsConsent()
  }, [consentState])

  // PostHog rides the same consent switch. Before consent it runs cookieless
  // (see lib/posthog-consent, nothing written to the device); consent upgrades
  // it to ordinary cookie persistence and starts session replay, and
  // withdrawing consent reverts both mid-session.
  //
  // Replay also rides the route, and `pathname` is a dependency so this is the
  // one place that starts or stops it. Every client-side navigation re-runs
  // this, which is what stops a recorder that was already running when the user
  // walked from an allowed page into an excluded one. Nothing starts replay at
  // init, so a direct load of an excluded route never records either.
  //
  // ORDER MATTERS, and getting it wrong is not a theoretical risk: 15 of the
  // first 18 recordings this project captured began on an excluded route
  // (/admin, /labs, /learn), which is the opposite of what /legal promises.
  // This version closes that by flipping the hard `disable_session_recording`
  // config flag FIRST. posthog-js re-evaluates recorder state inside
  // `set_config` and when consent changes, so a start/stop call alone is a race
  // against the library; a config flag it checks internally is not. Only after
  // the route is locked down do we touch consent, and only then do we ask the
  // recorder to start.
  useEffect(() => {
    if (!posthog.__loaded) return
    // Unknown consent is not "no consent". Acting on the seeded value here is
    // what cleared persistence on every load; see the useState comment above.
    if (consentState === null) return

    const mayRecord = hasConsent && !isReplayExcludedPath(pathname)

    posthog.set_config({ disable_session_recording: !mayRecord })

    // Only when the answer actually changes. This effect also re-runs on every
    // client-side navigation, and opt_out_capturing() clears persistence each
    // time it is called, so re-applying an unchanged decision on every route
    // change mints a new distinct_id per navigation for visitors who have not
    // consented. instrumentation-client.ts has already applied the correct
    // value at init, so the first pass here is normally a no-op in effect.
    if (appliedConsent.current !== hasConsent) {
      applyPostHogConsent(hasConsent)
      appliedConsent.current = hasConsent
    }

    if (mayRecord) {
      posthog.startSessionRecording()
    } else {
      posthog.stopSessionRecording()
    }

    // Replay recorded nothing for three days and it took a hand-run query to
    // notice, because "no recordings" and "no traffic" look the same. This
    // makes the decision countable.
    posthog.capture("replay_decision", {
      started: mayRecord,
      // "no-consent" used to cover the first two together, which is exactly why
      // a week of zeroes could not say whether the banner was being declined or
      // never seen. Those need opposite fixes, so they get separate reasons.
      reason:
        consentState === "unanswered"
          ? "consent-unanswered"
          : consentState === "declined"
            ? "consent-declined"
            : isReplayExcludedPath(pathname)
              ? "excluded-route"
              : "started",
    })
  }, [consentState, hasConsent, pathname])

  if (!hasConsent) return null

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  )
}
