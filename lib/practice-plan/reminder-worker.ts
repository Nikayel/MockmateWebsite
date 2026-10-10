import "server-only"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { trackEventServer } from "@/lib/analytics-server"
import { getDateInTimezone, getTodayInTimezone } from "@/lib/email/timezone"
import type { Profile } from "@/lib/types"
import { completedPractice, practicePlanRef, updatePracticePlan } from "./repository"
import { getSavedPractice } from "./service"
import { practicePlanSchema, type PracticePlan } from "./schema"
import { reminderEligibility, reminderDeliveryState, REMINDER_DEFER_MS } from "./reminder-policy"
import { sendPracticeReminder } from "./reminder-email"

async function claim(plan: PracticePlan, now: Date): Promise<PracticePlan | null> {
  return adminDb.runTransaction(async (tx) => {
    const ref = practicePlanRef(plan.userId)
    const profileRef = adminDb.collection("profiles").doc(plan.userId)
    const [snapshot, profileSnap] = await Promise.all([tx.get(ref), tx.get(profileRef)])
    const parsed = practicePlanSchema.safeParse(snapshot.data())
    if (!parsed.success || parsed.data.revision !== plan.revision) return null
    const current = parsed.data
    if (!current.nextAttemptAt || current.nextAttemptAt > now.toISOString()) return null
    // An expired sending lease has an unknown delivery outcome. Do not replay it.
    if (current.reminderStatus === "sending") {
      tx.update(ref, { reminderStatus: "uncertain", nextAttemptAt: null })
      return null
    }
    if (current.reminderStatus !== "pending") return null
    const profile = profileSnap.data() as Profile | undefined
    const eligibility = reminderEligibility(current, profile, now)
    if (eligibility !== "send") {
      tx.update(ref, {
        reminderStatus: eligibility === "cancel" ? "cancelled" : "pending",
        nextAttemptAt:
          eligibility === "cancel"
            ? null
            : new Date(now.getTime() + REMINDER_DEFER_MS).toISOString(),
      })
      return null
    }
    const claimed: PracticePlan = {
      ...current,
      reminderStatus: "sending",
      attempts: current.attempts + 1,
      nextAttemptAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
    }
    tx.set(ref, claimed)
    const timezone = profile!.notification_preferences?.timezone || current.timezone
    const sameDay =
      profile!.last_email_sent_at &&
      getDateInTimezone(profile!.last_email_sent_at, timezone) === getTodayInTimezone(timezone)
    tx.update(profileRef, {
      last_email_sent_at: now.toISOString(),
      emails_sent_today: (sameDay ? profile!.emails_sent_today || 0 : 0) + 1,
    })
    return claimed
  })
}

/** Bounded, sequential drain on the existing scheduler. Only explicit opt-ins have due dates. */
export async function processPracticeReminders(now = new Date()) {
  const counts = { sent: 0, skipped: 0, failed: 0, uncertain: 0 }
  const started = Date.now()
  const due = await adminDb
    .collection("practice_plans")
    .where("nextAttemptAt", ">", "")
    .where("nextAttemptAt", "<=", now.toISOString())
    .orderBy("nextAttemptAt")
    .limit(20)
    .get()
  for (const doc of due.docs) {
    if (Date.now() - started > 40_000) break
    try {
      const parsed = practicePlanSchema.safeParse(doc.data())
      if (!parsed.success || parsed.data.userId !== doc.id) {
        counts.skipped++
        continue
      }
      const plan = parsed.data
      if (plan.reminderStatus === "pending") {
        const saved = await getSavedPractice(plan.userId)
        if (saved.status !== "ready") {
          counts.skipped++
          continue
        }
      }
      const claimed = await claim(plan, now)
      if (!claimed) {
        counts.skipped++
        continue
      }
      // Recheck after claiming. Replacement/deletion cannot race a sending lease.
      const profileSnap = await adminDb.collection("profiles").doc(claimed.userId).get()
      const profile = profileSnap.data() as Profile | undefined
      if (
        !profile?.email ||
        profile.notification_preferences?.email_notifications_enabled === false ||
        profile.notification_preferences?.inactivity_reminders === false ||
        (await completedPractice(claimed))
      ) {
        await updatePracticePlan(claimed, { reminderStatus: "cancelled", nextAttemptAt: null })
        counts.skipped++
        continue
      }
      const result = await sendPracticeReminder(claimed, profile.email)
      const fields = reminderDeliveryState(claimed, result, now)
      await updatePracticePlan(claimed, fields)
      if (result.success) counts.sent++
      else if (result.deliveryUncertain) counts.uncertain++
      else counts.failed++
      await trackEventServer(
        result.success ? "practice_reminder_sent" : "practice_reminder_failed",
        {
          userId: claimed.userId,
          source_session_id: claimed.sourceSessionId,
          scenario_id: claimed.recommendation.scenarioId,
          delivery_uncertain: Boolean(result.deliveryUncertain),
        }
      )
      if (!result.success)
        logger.error("Saved practice reminder failed", {
          userId: claimed.userId,
          revision: claimed.revision,
          deliveryUncertain: result.deliveryUncertain,
          reason: result.error,
        })
    } catch (error) {
      counts.failed++
      logger.error("Practice reminder processing failed", { error, planId: doc.id })
    }
  }
  return counts
}
