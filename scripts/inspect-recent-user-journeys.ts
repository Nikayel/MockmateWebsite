#!/usr/bin/env tsx
/**
 * READ-ONLY diagnostics: what did our newest signed-up users actually do?
 *
 * Prints, for profiles created in the last 14 days:
 *  - onboarding fields, tier, email prefs
 *  - every interview_session (when, type, status, score, duration)
 *  - every email_notification sent to them (is the retention loop firing?)
 * Plus the latest email_notifications overall as a cron-liveness check.
 *
 * Usage: pnpm exec tsx scripts/inspect-recent-user-journeys.ts
 * Makes no writes.
 */
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import * as admin from "firebase-admin"

const svc = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
if (!svc || !projectId) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY / project id")
  process.exit(1)
}
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(svc)),
  projectId,
})
const db = admin.firestore()

function iso(v: unknown): string {
  if (!v) return "?"
  if (typeof v === "string") return v
  const ts = v as { toDate?: () => Date }
  if (ts.toDate) return ts.toDate().toISOString()
  return String(v)
}
function day(v: unknown): string {
  return iso(v).slice(0, 16).replace("T", " ")
}

async function main() {
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()

  // --- latest email_notifications (cron liveness check) ---
  let emailDocs: FirebaseFirestore.QueryDocumentSnapshot[] = []
  try {
    emailDocs = (
      await db.collection("email_notifications").orderBy("sent_at", "desc").limit(25).get()
    ).docs
  } catch {
    emailDocs = (await db.collection("email_notifications").limit(25).get()).docs
  }
  console.log(`\n=== email_notifications (latest ${emailDocs.length}) ===`)
  for (const d of emailDocs.slice(0, 15)) {
    const e = d.data()
    console.log(
      `  ${day(e.sent_at ?? e.created_at)}  type=${e.type ?? e.email_type}  user=${String(e.user_id ?? "?").slice(0, 8)}`
    )
  }
  if (emailDocs.length === 0) console.log("  (none — retention emails have NEVER been sent)")

  // --- recent profiles ---
  let profiles: FirebaseFirestore.QueryDocumentSnapshot[]
  try {
    profiles = (await db.collection("profiles").where("created_at", ">=", since).get()).docs
  } catch {
    const all = await db.collection("profiles").limit(300).get()
    profiles = all.docs.filter((d) => iso(d.data().created_at) >= since)
  }
  console.log(`\n=== profiles created since ${since.slice(0, 10)}: ${profiles.length} ===`)

  for (const p of profiles) {
    const pd = p.data()
    const emailMasked = String(pd.email ?? "?").replace(/^(..).*(@.*)$/, "$1***$2")
    console.log(
      `\nUSER ${p.id.slice(0, 10)}  ${emailMasked}  created=${day(pd.created_at)}  tier=${pd.subscription_tier ?? pd.tier ?? "free"}`
    )
    console.log(
      `  onboarding: role=${pd.role ?? "-"} goal=${pd.goal ?? "-"} dailyGoal=${pd.daily_goal ?? "-"} tour=${pd.tour_completed ?? false}`
    )
    console.log(
      `  emailPrefs: enabled=${pd.notification_preferences?.email_notifications_enabled ?? "default(true)"}  lastEmail=${day(pd.last_email_sent_at)}  streak=${pd.current_streak ?? 0}`
    )

    const sess = await db.collection("interview_sessions").where("user_id", "==", p.id).get()
    const rows = sess.docs
      .map((s) => s.data())
      .sort((a, b) => iso(a.created_at).localeCompare(iso(b.created_at)))
    console.log(`  sessions: ${rows.length}`)
    for (const s of rows) {
      const score = s.bugfix_score_breakdown?.overall ?? s.performance_score ?? s.score ?? "-"
      console.log(
        `    ${day(s.created_at)}  type=${s.scenario_type ?? s.type ?? "?"}  scenario=${String(s.scenario_id ?? "?").slice(0, 28)}  status=${s.status ?? "?"}  completed=${s.completed_at ? "Y" : "n"}  score=${score}  durMin=${s.duration_minutes ?? s.duration ?? "-"}`
      )
    }

    const mails = await db.collection("email_notifications").where("user_id", "==", p.id).get()
    console.log(
      `  emails sent to user: ${mails.size}${mails.size ? "" : "  <-- nothing ever pulled them back"}`
    )
    for (const m of mails.docs.slice(0, 6)) {
      const e = m.data()
      console.log(`    ${day(e.sent_at ?? e.created_at)}  ${e.type ?? e.email_type}`)
    }
  }
  process.exit(0)
}
main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
