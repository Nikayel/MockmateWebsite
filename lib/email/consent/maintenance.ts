import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { FieldPath } from "firebase-admin/firestore"
import { effectiveEmailPreferences, needsConsentBootstrap } from "./policy"
import { patchEmailPreferences } from "./preferences"
import { syncEmailSuppression, retryEmailSuppressions } from "./sync"
import { validSuppressionJob } from "./job-auth"
import { ensureConsentWebhook } from "./webhook-setup"

/** Bounded, resumable repair of old preferences. Never opts a contact back in. */
async function repairHistoricalSuppression() {
  const stateRef = adminDb.collection("system_settings").doc("email-consent-reconciliation")
  const state = (await stateRef.get()).data()
  let query = adminDb.collection("profiles").orderBy(FieldPath.documentId()).limit(20)
  if (typeof state?.cursor === "string") query = query.startAfter(state.cursor)
  const page = await query.get()
  let repaired = 0
  let scanned = 0
  const deadline = Date.now() + 10_000
  let cursor = state?.cursor ?? null
  for (const doc of page.docs) {
    if (Date.now() >= deadline) break
    const profile = doc.data()
    scanned++
    if (
      typeof profile.email === "string" &&
      profile.email_normalized !== profile.email.toLowerCase()
    ) {
      await adminDb
        .collection("profiles")
        .doc(doc.id)
        .update({ email_normalized: profile.email.toLowerCase() })
    }
    if (needsConsentBootstrap(profile)) await patchEmailPreferences(doc.id, {}, "account")
    const prefs = effectiveEmailPreferences(profile)
    if (
      (!prefs.email_notifications_enabled || !prefs.marketing_emails) &&
      (!profile.email_consent_sync || !validSuppressionJob(doc.id, profile.email_consent_sync))
    ) {
      await patchEmailPreferences(
        doc.id,
        prefs.email_notifications_enabled
          ? { marketing_emails: false }
          : { email_notifications_enabled: false },
        "reconciliation"
      )
      await syncEmailSuppression(doc.id)
      repaired++
    }
    cursor = doc.id
  }
  const exhausted = page.docs.length < 20 && cursor === (page.docs.at(-1)?.id ?? cursor)
  await stateRef.set(
    { cursor: exhausted ? null : cursor, updatedAt: new Date().toISOString() },
    { merge: true }
  )
  return { scanned, repaired, complete: exhausted }
}
export async function maintainEmailConsent() {
  const webhookReady = await ensureConsentWebhook().catch(() => false)
  const pending = await retryEmailSuppressions()
  const history = await repairHistoricalSuppression()
  const outstanding = await adminDb
    .collection("profiles")
    .where("email_consent_sync.pending", "==", true)
    .count()
    .get()
  return { webhookReady, pending, history, remainingPending: outstanding.data().count }
}
