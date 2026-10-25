import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { emailPreferences } from "./policy"
import { readProviderConsent } from "./provider"
import { providerSuppressionApplies } from "./provider-state"
import { patchEmailPreferences } from "./preferences"
import { accountEmail } from "./identity"

export async function readEmailPreferences(userId: string) {
  const ref = adminDb.collection("profiles").doc(userId)
  let profile = (await ref.get()).data()
  if (!profile) return null
  let providerStatus: "available" | "unavailable" = "unavailable"
  let marketingBlocked = false
  try {
    if ((await accountEmail(userId)) !== profile.email?.toLowerCase())
      throw new Error("Email identity mismatch")
    const provider = await readProviderConsent(profile.email)
    providerStatus = "available"
    marketingBlocked = provider.blocked
    if (providerSuppressionApplies(profile, provider)) {
      await patchEmailPreferences(
        userId,
        { email_notifications_enabled: false, marketing_emails: false },
        "provider",
        provider.fingerprint ?? undefined,
        provider.eventAt
      )
      profile = (await ref.get()).data() ?? profile
    }
  } catch {
    /* Account settings remain accessible; optional sends fail closed. */
  }
  return {
    preferences: emailPreferences(profile.notification_preferences),
    providerStatus,
    marketingBlocked,
    marketingSyncPending: profile.email_consent_sync?.pending === true,
  }
}
