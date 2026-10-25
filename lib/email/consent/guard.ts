import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { optionalEmailAllowed, type OptionalEmailCategory } from "./policy"
import { readProviderConsent } from "./provider"
import { patchEmailPreferences } from "./preferences"
import { providerSuppressionApplies } from "./provider-state"
import { accountEmail } from "./identity"
import type { EmailResult } from "../brevo"

export type DeliveryConsent =
  | { type: "essential" }
  | { type: "optional"; userId: string; category: OptionalEmailCategory }
const suppressed = (): EmailResult => ({
  success: false,
  skipped: true,
  error: "Email preferences suppress this message",
  retryable: false,
})

/** Called immediately before EACH provider attempt, not just when a job is queued. */
export async function checkDeliveryConsent(
  consent: DeliveryConsent,
  recipients: Array<{ email: string }>
): Promise<EmailResult | null> {
  if (consent?.type === "essential") return null
  if (consent?.type !== "optional")
    return { success: false, error: "Email classification is required", retryable: false }
  try {
    const ref = adminDb.collection("profiles").doc(consent.userId)
    const profile = (await ref.get()).data()
    if (!profile || !optionalEmailAllowed(profile.notification_preferences, consent.category))
      return suppressed()
    if ((await accountEmail(consent.userId)) !== profile.email?.toLowerCase()) return suppressed()
    if (
      typeof profile.email !== "string" ||
      recipients.length !== 1 ||
      recipients[0].email.toLowerCase() !== profile.email.toLowerCase()
    )
      return suppressed()
    const provider = await readProviderConsent(profile.email)
    if (provider.blocked) {
      const globallySuppressed = providerSuppressionApplies(profile, provider)
      if (consent.category === "marketing" || globallySuppressed) {
        if (globallySuppressed)
          await patchEmailPreferences(
            consent.userId,
            { email_notifications_enabled: false, marketing_emails: false },
            "provider",
            provider.fingerprint ?? undefined,
            provider.eventAt
          )
        return suppressed()
      }
    }
    // Re-read local preferences after the network call; an unsubscribe may have landed meanwhile.
    const latest = (await ref.get()).data()
    if (
      !latest ||
      typeof latest.email !== "string" ||
      latest.email.toLowerCase() !== recipients[0].email.toLowerCase() ||
      !optionalEmailAllowed(latest.notification_preferences, consent.category)
    )
      return suppressed()
    return null
  } catch {
    return { success: false, error: "Couldn't verify email preferences", retryable: true }
  }
}
