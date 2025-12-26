"use client"

import { useState, useEffect } from "react"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { hasAnalyticsConsent } from "@/components/CookieConsent"

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

  if (!hasConsent) return null

  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  )
}
