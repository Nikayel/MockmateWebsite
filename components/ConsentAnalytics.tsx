"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import posthog from "posthog-js"
import { hasAnalyticsConsent } from "@/components/CookieConsent"
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
  const [hasConsent, setHasConsent] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setHasConsent(hasAnalyticsConsent())

    const handleConsentChange = () => setHasConsent(hasAnalyticsConsent())

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
    syncAnalyticsConsent()
  }, [hasConsent])

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

    const mayRecord = hasConsent && !isReplayExcludedPath(pathname)

    posthog.set_config({ disable_session_recording: !mayRecord })
    applyPostHogConsent(hasConsent)

    if (mayRecord) {
      posthog.startSessionRecording()
    } else {
      posthog.stopSessionRecording()
    }
  }, [hasConsent, pathname])

  if (!hasConsent) return null

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  )
}
