"use client"

import { useState, useEffect } from "react"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { hasAnalyticsConsent } from "@/components/CookieConsent"
import { syncAnalyticsConsent } from "@/lib/analytics"

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

  if (!hasConsent) return null

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  )
}
