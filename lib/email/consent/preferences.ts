import "server-only"
import { randomUUID } from "node:crypto"
import { adminDb } from "@/lib/firebase-admin"
import { EMAIL_PREFERENCE_KEYS, effectiveEmailPreferences, type EmailPreferenceKey } from "./policy"
import { smartEmailProjection } from "./projection"
import { providerSuppressionApplies } from "./provider-state"
import { signSuppressionJob } from "./job-auth"
import { FieldValue } from "firebase-admin/firestore"

export type EmailPreferencePatch = Partial<Record<EmailPreferenceKey, boolean>>
/** Atomic field patches preserve concurrent opt-outs and unrelated settings. */
export async function patchEmailPreferences(
  userId: string,
  patch: EmailPreferencePatch,
  source: "account" | "unsubscribe" | "provider" | "reconciliation",
  providerFingerprint?: string,
  providerEventAt?: number | null
) {
  const ref = adminDb.collection("profiles").doc(userId)
  return adminDb.runTransaction(async (tx) => {
    const smartRef = adminDb.collection("notification_preferences").doc(userId)
    const [snapshot, existingSmart] = await Promise.all([tx.get(ref), tx.get(smartRef)])
    if (!snapshot.exists) return null
    const profile = snapshot.data()!
    if (source === "reconciliation") {
      const current = effectiveEmailPreferences(profile)
      if (current.email_notifications_enabled && current.marketing_emails)
        return { preferences: current, marketingSyncPending: false }
      patch = current.email_notifications_enabled
        ? { marketing_emails: false }
        : { email_notifications_enabled: false }
    }
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
        preferences: effectiveEmailPreferences(profile),
        marketingSyncPending: false,
      }
    }
    const unchanged = Object.entries(patch).every(
      ([key, value]) =>
        profile.notification_preferences?.[key] === value &&
        profile.email_consent?.preferences?.[key] === value
    )
    if (
      source !== "account" &&
      source !== "reconciliation" &&
      unchanged &&
      (!providerFingerprint || profile.email_consent?.provider_fingerprint === providerFingerprint)
    ) {
      return {
        preferences: effectiveEmailPreferences(profile),
        marketingSyncPending: profile.email_consent_sync?.pending === true,
      }
    }
    const now = new Date().toISOString()
    const preferences = { ...effectiveEmailPreferences(profile), ...patch }
    const fields: Record<string, unknown> = { updated_at: now }
    // Seed only missing fields INSIDE the transaction; never replay a defaults map.
    for (const key of EMAIL_PREFERENCE_KEYS) {
      if (typeof profile.notification_preferences?.[key] !== "boolean")
        fields[`notification_preferences.${key}`] = preferences[key]
      if (preferences[key] === false && profile.email_consent?.preferences?.[key] !== false)
        fields[`email_consent.preferences.${key}`] = false
    }
    for (const [key, value] of Object.entries(patch)) {
      fields[`notification_preferences.${key}`] = value
      fields[`email_consent.preferences.${key}`] = value
    }
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
    const smart = smartEmailProjection({
      userId,
      preferences,
      changes: patch,
      isNew: !existingSmart.exists,
      now,
      timezone: profile.notification_preferences?.timezone,
    })
    tx.set(smartRef, smart, { merge: true })
    return { preferences, marketingSyncPending: requiresSuppression }
  })
}
