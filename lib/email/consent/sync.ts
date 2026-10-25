import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { readProviderConsent, suppressMarketing } from "./provider"
import { FieldValue } from "firebase-admin/firestore"
import { validSuppressionJob } from "./job-auth"
import { patchEmailPreferences } from "./preferences"
import { providerSuppressionApplies } from "./provider-state"
import { accountEmail } from "./identity"

/** Durable suppression-only outbox. Replaying this can never re-subscribe anyone. */
export async function syncEmailSuppression(userId: string): Promise<boolean> {
  const ref = adminDb.collection("profiles").doc(userId)
  const profile = (await ref.get()).data()
  const job = profile?.email_consent_sync
  if (job?.pending !== true || typeof job.email !== "string" || typeof job.revision !== "string")
    return true
  try {
    if (
      !validSuppressionJob(userId, job) ||
      (await accountEmail(userId)) !== job.email.toLowerCase()
    ) {
      await adminDb.runTransaction(async (tx) => {
        if ((await tx.get(ref)).data()?.email_consent_sync?.revision === job.revision)
          tx.update(ref, {
            "email_consent_sync.pending": false,
            "email_consent_sync.nextAttemptAt": FieldValue.delete(),
            "email_consent_sync.error": "Invalid suppression identity or signature",
          })
      })
      return false
    }
    const previous = await readProviderConsent(job.email)
    if (providerSuppressionApplies(profile!, previous)) {
      await patchEmailPreferences(
        userId,
        { email_notifications_enabled: false, marketing_emails: false },
        "provider",
        previous.fingerprint ?? undefined,
        previous.eventAt
      )
      return true
    }
    // Stamp our marketing-only suppression before PUT so its webhook cannot
    // masquerade as a new user unsubscribe and disable requested reviews.
    const stillCurrent = await adminDb.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data()
      if (
        current?.email_consent_sync?.revision !== job.revision ||
        current?.email_consent_sync?.pending !== true
      )
        return false
      if (!previous.blocked && previous.fingerprint)
        tx.update(ref, { "email_consent.managed_marketing_block": previous.fingerprint })
      return true
    })
    if (!stillCurrent) return true
    await suppressMarketing(job.email)
  } catch {
    await adminDb.runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.email_consent_sync?.revision === job.revision)
        tx.update(ref, {
          "email_consent_sync.nextAttemptAt": new Date(Date.now() + 15 * 60_000).toISOString(),
        })
    })
    return false
  }
  await adminDb.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data()
    if (current?.email_consent_sync?.revision !== job.revision) return
    tx.update(ref, {
      "email_consent_sync.pending": false,
      "email_consent_sync.syncedAt": new Date().toISOString(),
      "email_consent_sync.nextAttemptAt": FieldValue.delete(),
    })
  })
  return true
}

/** Single-field index only; bounded work on the existing email scheduler. */
export async function retryEmailSuppressions() {
  const snapshot = await adminDb
    .collection("profiles")
    .where("email_consent_sync.nextAttemptAt", "<=", new Date().toISOString())
    .orderBy("email_consent_sync.nextAttemptAt")
    .limit(5)
    .get()
  let synced = 0
  const deadline = Date.now() + 10_000
  for (const doc of snapshot.docs) {
    if (Date.now() >= deadline) break
    if (await syncEmailSuppression(doc.id)) synced++
  }
  return { attempted: snapshot.docs.length, synced }
}
