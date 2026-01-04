"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Cookie, Shield } from "lucide-react"
import Link from "next/link"

const CONSENT_COOKIE_NAME = "codesparring_cookie_consent"
const CONSENT_VERSION = "1.0" // Increment when policy changes

export type ConsentPreferences = {
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

export function getConsentPreferences(): ConsentPreferences | null {
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

export function hasAnalyticsConsent(): boolean {
  const preferences = getConsentPreferences()
  return preferences?.analytics ?? false
}

export function hasFunctionalConsent(): boolean {
  const preferences = getConsentPreferences()
  return preferences?.functional ?? false
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

  const savePreferences = (newPreferences: ConsentPreferences) => {
    const updated = {
      ...newPreferences,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    }

    localStorage.setItem(CONSENT_COOKIE_NAME, JSON.stringify(updated))
    setShowBanner(false)
    setShowSettings(false)

    // Dispatch event for analytics to pick up
    window.dispatchEvent(new CustomEvent("consentUpdated", { detail: updated }))

    // Reload to apply consent changes to analytics
    if (updated.analytics) {
      window.location.reload()
    }
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
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-gray-900/95 border-t border-gray-700 backdrop-blur-sm shadow-2xl">
      <div className="container mx-auto max-w-4xl">
        {!showSettings ? (
          // Main Banner
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-6 w-6 text-[#00d9ff] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold mb-1">We value your privacy</h3>
                <p className="text-gray-400 text-sm">
                  We use cookies and similar technologies to improve your experience, analyze traffic, and personalize content.
                  By clicking "Accept All", you consent to our use of cookies.{" "}
                  <Link href="/legal" className="text-[#00d9ff] hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                Customize
              </Button>
              <Button
                onClick={acceptNecessaryOnly}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                Necessary Only
              </Button>
              <Button
                onClick={acceptAll}
                size="sm"
                className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/90"
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
                <Shield className="h-5 w-5 text-[#00d9ff]" />
                <h3 className="text-white font-semibold">Cookie Preferences</h3>
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
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <h4 className="text-white font-medium text-sm">Necessary Cookies</h4>
                  <p className="text-gray-400 text-xs">Required for the website to function. Cannot be disabled.</p>
                </div>
                <div className="bg-gray-600 px-3 py-1 rounded text-xs text-gray-300">Always On</div>
              </div>

              {/* Analytics Cookies */}
              <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer">
                <div>
                  <h4 className="text-white font-medium text-sm">Analytics Cookies</h4>
                  <p className="text-gray-400 text-xs">Help us understand how visitors use our site.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00d9ff] focus:ring-[#00d9ff] focus:ring-offset-gray-900"
                />
              </label>

              {/* Functional Cookies */}
              <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer">
                <div>
                  <h4 className="text-white font-medium text-sm">Functional Cookies</h4>
                  <p className="text-gray-400 text-xs">Enable personalized features and preferences.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.functional}
                  onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-[#00d9ff] focus:ring-[#00d9ff] focus:ring-offset-gray-900"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={acceptNecessaryOnly}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                Reject All Optional
              </Button>
              <Button
                onClick={saveCustomPreferences}
                size="sm"
                className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/90"
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
