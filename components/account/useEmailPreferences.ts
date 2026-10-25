"use client"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  DEFAULT_EMAIL_PREFERENCES,
  EMAIL_PREFERENCE_KEYS,
  type EmailPreferenceKey,
} from "@/lib/email/consent/policy"
import type { NotificationPreferences } from "@/lib/types"

interface EmailSettingsResponse {
  preferences: NotificationPreferences
  marketingSyncPending?: boolean
  marketingBlocked?: boolean
}
function readSettings(raw: unknown): EmailSettingsResponse {
  if (!raw || typeof raw !== "object" || !("preferences" in raw))
    throw new Error("Invalid email settings")
  const value = raw as EmailSettingsResponse
  if (
    !value.preferences ||
    EMAIL_PREFERENCE_KEYS.some((key) => typeof value.preferences[key] !== "boolean")
  )
    throw new Error("Invalid email settings")
  return value
}

/** The account page sends one field; it never persists its cached preference map. */
export function useEmailPreferences(user: { getIdToken(): Promise<string> } | null) {
  const [preferences, setPreferences] = useState(DEFAULT_EMAIL_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    if (!user) return () => controller.abort()
    void (async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/email/preferences", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        })
        if (!response.ok) throw new Error("Couldn't load email settings")
        const result = readSettings(await response.json())
        if (!controller.signal.aborted) setPreferences(result.preferences)
      } catch {
        if (!controller.signal.aborted)
          setError("Couldn't load email settings. Retry before making changes.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [user, attempt])

  const changePreference = useCallback(
    async (key: EmailPreferenceKey, value: boolean) => {
      if (!user || loading || saving || error) return
      setSaving(true)
      try {
        const token = await user.getIdToken()
        const response = await fetch("/api/email/preferences", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        })
        if (!response.ok) throw new Error("Couldn't save email settings")
        const result = readSettings(await response.json())
        setPreferences(result.preferences)
        if (result.marketingSyncPending)
          toast.info("Preference saved. Promotional email suppression is syncing.")
        else if (key === "marketing_emails" && value)
          toast.info(
            "Preference saved. A previous newsletter unsubscribe stays blocked until you resubscribe through the newsletter."
          )
        else toast.success("Preferences updated")
      } catch {
        // A response can be lost after the write committed. Reload; never restore an old snapshot.
        setAttempt((n) => n + 1)
        toast.error("Couldn't confirm the update. Reloading your current settings.")
      } finally {
        setSaving(false)
      }
    },
    [user, loading, saving, error]
  )
  return {
    preferences,
    loading,
    saving,
    error,
    changePreference,
    reload: () => setAttempt((n) => n + 1),
  }
}
