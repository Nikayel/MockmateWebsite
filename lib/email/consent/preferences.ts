import "server-only"
import { randomUUID } from "node:crypto"
import { adminDb } from "@/lib/firebase-admin"
import {
  DEFAULT_EMAIL_PREFERENCES,
  EMAIL_PREFERENCE_KEYS,
  emailPreferences,
  type EmailPreferenceKey,
} from "./policy"
import { DEFAULT_NOTIFICATION_PREFERENCES as SMART_DEFAULTS } from "@/lib/types/notifications"
import { providerSuppressionApplies } from "./provider-state"
import { signSuppressionJob } from "./job-auth"
import { FieldValue } from "firebase-admin/firestore"

export type EmailPreferencePatch = Partial<Record<EmailPreferenceKey, boolean>>
const TYPE_FIELDS: Partial<Record<EmailPreferenceKey, string[]>> = {
  welcome_email: ["welcome"],
  spaced_repetition_reminders: ["spaced_repetition_review"],
  roadmap_reminders: ["interview_countdown", "daily_practice_reminder", "roadmap_behind"],
  milestone_celebrations: ["milestone_celebration"],
}

/** Atomic field patches preserve concurrent opt-outs and unrelated settings. */
export async function patchEmailPreferences(
  userId: string,
  patch: EmailPreferencePatch,
  source: "account" | "unsubscribe" | "provider",
  providerFingerprint?: string,
  providerEventAt?: number | null
) {
  const ref = adminDb.collection("profiles").doc(userId)
  return adminDb.runTransaction(async (tx) => {
    const smartRef = adminDb.collection("notification_preferences").doc(userId)
    const [snapshot, existingSmart] = await Promise.all([tx.get(ref), tx.get(smartRef)])
    if (!snapshot.exists) return null
    const profile = snapshot.data()!
    if (
      source === "provider" &&
      providerFingerprint &&
      !providerSuppressionApplies(profile, {
        blocked: true,
        fingerprint: providerFingerprint,
        eventAt: providerEventAt,
      })
    ) {
      return {
        preferences: emailPreferences(profile.notification_preferences),
        marketingSyncPending: false,
      }
    }
    const unchanged = Object.entries(patch).every(
      ([key, value]) => profile.notification_preferences?.[key] === value
    )
    if (
      source !== "account" &&
      unchanged &&
      (!providerFingerprint || profile.email_consent?.provider_fingerprint === providerFingerprint)
    ) {
      return {
        preferences: emailPreferences(profile.notification_preferences),
        marketingSyncPending: profile.email_consent_sync?.pending === true,
      }
    }
    const now = new Date().toISOString()
    const preferences = { ...emailPreferences(profile.notification_preferences), ...patch }
    const fields: Record<string, unknown> = { updated_at: now }
    // Seed only missing fields INSIDE the transaction; never replay a defaults map.
    for (const key of EMAIL_PREFERENCE_KEYS) {
      if (typeof profile.notification_preferences?.[key] !== "boolean")
        fields[`notification_preferences.${key}`] = DEFAULT_EMAIL_PREFERENCES[key]
    }
    for (const [key, value] of Object.entries(patch))
      fields[`notification_preferences.${key}`] = value
    if (source === "account" && patch.email_notifications_enabled === true)
      fields["email_consent.explicit_optional_opt_in_at"] = now
    if (providerFingerprint) {
      fields["email_consent.provider_fingerprint"] = providerFingerprint
      fields["email_consent.provider_opt_out_at"] = now
    }
    const requiresSuppression =
      source !== "provider" &&
      (patch.email_notifications_enabled === false || patch.marketing_emails === false)
    if (source === "provider" && profile.email_consent_sync?.pending === true) {
      fields["email_consent_sync.pending"] = false
      fields["email_consent_sync.nextAttemptAt"] = FieldValue.delete()
    }
    if (requiresSuppression && typeof profile.email === "string") {
      const revision = randomUUID()
      const intent = preferences.email_notifications_enabled ? "marketing_only" : "optional_all"
      fields.email_consent_sync = {
        revision,
        email: profile.email,
        pending: true,
        nextAttemptAt: now,
        intent,
        signature: signSuppressionJob(userId, revision, profile.email, intent),
      }
    }
    if (
      source === "account" &&
      patch.marketing_emails === true &&
      preferences.email_notifications_enabled
    ) {
      fields["email_consent_sync.pending"] = false
      fields["email_consent_sync.nextAttemptAt"] = FieldValue.delete()
    }
    tx.update(ref, fields)
    const smart: Record<string, unknown> = {
      ...(!existingSmart.exists
        ? {
            ...SMART_DEFAULTS,
            createdAt: now,
            timezone: profile.notification_preferences?.timezone || SMART_DEFAULTS.timezone,
            channels: {
              ...SMART_DEFAULTS.channels,
              email: preferences.email_notifications_enabled,
            },
          }
        : {}),
      userId,
      updatedAt: now,
    }
    if (patch.email_notifications_enabled !== undefined)
      smart.channels = {
        ...(!existingSmart.exists ? SMART_DEFAULTS.channels : {}),
        email: patch.email_notifications_enabled,
      }
    const typePreferences: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(existingSmart.exists ? patch : preferences)) {
      for (const type of TYPE_FIELDS[key as EmailPreferenceKey] ?? [])
        typePreferences[type] = {
          ...(!existingSmart.exists
            ? SMART_DEFAULTS.typePreferences[type as keyof typeof SMART_DEFAULTS.typePreferences]
            : {}),
          enabled: value,
        }
    }
    if (Object.keys(typePreferences).length)
      smart.typePreferences = {
        ...(!existingSmart.exists ? SMART_DEFAULTS.typePreferences : {}),
        ...typePreferences,
      }
    tx.set(smartRef, smart, { merge: true })
    return { preferences, marketingSyncPending: requiresSuppression }
  })
}
