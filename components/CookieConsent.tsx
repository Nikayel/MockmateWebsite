"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Cookie, Shield } from "lucide-react"
import Link from "next/link"
// This closes an import cycle: lib/analytics imports hasAnalyticsConsent from
// this file. It is safe because both bindings are hoisted function
// declarations that are only ever called from handlers and effects, never
// during module evaluation. Keep it that way.
import { trackEvent } from "@/lib/analytics"

const CONSENT_COOKIE_NAME = "codesparring_cookie_consent"
const CONSENT_VERSION = "1.0" // Increment when policy changes

type ConsentPreferences = {
  necessary: boolean // Always true
  analytics: boolean
  functional: boolean
  version: string
  timestamp: string
}

const defaultPreferences: ConsentPreferences = {
  necessary: true,
  analytics: false,
  functional: false,
  version: CONSENT_VERSION,
  timestamp: new Date().toISOString(),
}

function getConsentPreferences(): ConsentPreferences | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem(CONSENT_COOKIE_NAME)
    if (!stored) return null

    const preferences = JSON.parse(stored) as ConsentPreferences

    // Check if consent version is current
    if (preferences.version !== CONSENT_VERSION) {
      return null // Re-prompt for consent if policy updated
    }

    return preferences
  } catch {
    return null
  }
}

/**
 * Three answers, not two.
 *
 * "Never asked" and "asked, said no" both leave analytics off, so a boolean
 * describes the behaviour exactly and the CAUSE not at all. They call for
 * opposite responses: an unanswered banner is a visibility bug, a declined one
 * is a copy and trust problem. Collapsed into `false`, the numbers can never
 * tell you which one you have, which is why session replay could sit at zero
 * for a week with nothing to point at.
 */
export type ConsentState = "granted" | "declined" | "unanswered"

export function getConsentState(): ConsentState {
  const preferences = getConsentPreferences()
  if (!preferences) return "unanswered"
  return preferences.analytics ? "granted" : "declined"
}

/** The boolean view, for the callers that only need to gate on it. */
export function hasAnalyticsConsent(): boolean {
  return getConsentState() === "granted"
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaultPreferences)

  useEffect(() => {
    // Check if user has already consented
    const existingConsent = getConsentPreferences()
    if (!existingConsent) {
      // Small delay to avoid layout shift on initial load
      const timer = setTimeout(() => setShowBanner(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  /**
   * Count the ask, not only the answer.
   *
   * Without this, "nobody accepts" and "nobody is ever shown the banner" are
   * the same shape in the data: an absence. One is a conversion problem, the
   * other is a bug, and they were indistinguishable for as long as replay sat
   * at zero. PostHog stamps the path onto every capture, so this also shows
   * WHERE the banner gets answered, which is how we found that most accepts
   * happen on routes where replay is excluded anyway.
   */
  useEffect(() => {
    if (!showBanner) return
    trackEvent("consent_prompt_shown")
  }, [showBanner])

  /**
   * Apply the visitor's choice, whether or not we can remember it.
   *
   * `localStorage.setItem` throws for reasons that have nothing to do with what
   * the visitor wants: Safari private mode, a full quota, storage blocked by
   * tracking prevention or by an enterprise policy. It used to run first and
   * unguarded, so a throw skipped every line under it. The banner stayed up,
   * the choice was dropped, and from the visitor's side the button simply did
   * nothing. PostHog logged two dead clicks on "Accept All" to prove it.
   *
   * Now the write is the only thing allowed to fail, and it fails alone.
   * Dismissal and the consentUpdated event happen either way, because the
   * visitor DID answer: we owe them that answer for this page load even when we
   * cannot carry it to the next one. `persisted` rides along on the event so
   * the difference stays countable instead of invisible.
   */
  const savePreferences = (newPreferences: ConsentPreferences) => {
    const updated = {
      ...newPreferences,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    }

    let persisted = true
    try {
      localStorage.setItem(CONSENT_COOKIE_NAME, JSON.stringify(updated))
    } catch {
      persisted = false
    }

    setShowBanner(false)
    setShowSettings(false)

    // Dispatch event for analytics to pick up. ConsentAnalytics listens for this
    // and starts (or stops) both Vercel Analytics and Firebase Analytics in
    // place, so no reload is needed. The reload that used to run here existed
    // only because Firebase Analytics was initialized at module load and could
    // not be switched on any other way; it threw away whatever the visitor was
    // in the middle of doing, which is a harsh price for clicking "Accept All".
    //
    // The listener acts on `detail`, not on storage. After a failed write
    // storage still reads "unanswered", and re-reading it there would throw the
    // visitor's answer away a second time.
    window.dispatchEvent(new CustomEvent("consentUpdated", { detail: updated }))

    trackEvent("consent_choice", { analytics: updated.analytics, persisted })
  }

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      functional: true,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    })
  }

  const acceptNecessaryOnly = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      functional: false,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    })
  }

  const saveCustomPreferences = () => {
    savePreferences(preferences)
  }

  if (!showBanner) return null

  return (
    <div className="fixed right-0 bottom-0 left-0 z-[100] border-t border-gray-700 bg-gray-900/95 p-4 shadow-2xl backdrop-blur-sm">
      <div className="container mx-auto max-w-4xl">
        {!showSettings ? (
          // Main Banner
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
            <div className="flex flex-1 items-start gap-3">
              <Cookie className="mt-1 h-6 w-6 flex-shrink-0 text-[#c4703f]" />
              <div>
                <h3 className="mb-1 font-semibold text-white">We value your privacy</h3>
                <p className="text-sm text-gray-400">
                  We use cookies and similar technologies to improve your experience, analyze
                  traffic, and personalize content. By clicking "Accept All", you consent to our use
                  of cookies.{" "}
                  <Link href="/legal" className="text-[#c4703f] hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 md:w-auto">
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                size="sm"
                className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800"
              >
                Customize
              </Button>
              <Button
                onClick={acceptNecessaryOnly}
                variant="outline"
                size="sm"
                className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800"
              >
                Necessary Only
              </Button>
              <Button
                onClick={acceptAll}
                size="sm"
                className="bg-[#c4703f] text-black hover:bg-[#c4703f]/90"
              >
                Accept All
              </Button>
            </div>
          </div>
        ) : (
          // Settings Panel
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#c4703f]" />
                <h3 className="font-semibold text-white">Cookie Preferences</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Necessary Cookies */}
              <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3">
                <div>
                  <h4 className="text-sm font-medium text-white">Necessary Cookies</h4>
                  <p className="text-xs text-gray-400">
                    Required for the website to function. Cannot be disabled.
                  </p>
                </div>
                <div className="rounded bg-gray-600 px-3 py-1 text-xs text-gray-300">Always On</div>
              </div>

              {/* Analytics Cookies */}
              <label
                htmlFor="cookie-analytics"
                aria-label="Analytics Cookies"
                className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-800/50 p-3"
              >
                <div>
                  <h4 className="text-sm font-medium text-white">Analytics Cookies</h4>
                  <p className="text-xs text-gray-400">
                    Help us understand how visitors use our site.
                  </p>
                </div>
                <input
                  id="cookie-analytics"
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-[#c4703f] focus:ring-[#c4703f] focus:ring-offset-gray-900"
                />
              </label>

              {/* Functional Cookies */}
              <label
                htmlFor="cookie-functional"
                aria-label="Functional Cookies"
                className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-800/50 p-3"
              >
                <div>
                  <h4 className="text-sm font-medium text-white">Functional Cookies</h4>
                  <p className="text-xs text-gray-400">
                    Enable personalized features and preferences.
                  </p>
                </div>
                <input
                  id="cookie-functional"
                  type="checkbox"
                  checked={preferences.functional}
                  onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-600 bg-gray-700 text-[#c4703f] focus:ring-[#c4703f] focus:ring-offset-gray-900"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={acceptNecessaryOnly}
                variant="outline"
                size="sm"
                className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800"
              >
                Reject All Optional
              </Button>
              <Button
                onClick={saveCustomPreferences}
                size="sm"
                className="bg-[#c4703f] text-black hover:bg-[#c4703f]/90"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
