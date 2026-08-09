#!/usr/bin/env tsx
/**
 * READ-ONLY: for one user id, dump the retention-machinery state their sessions
 * should have produced: problem_mastery docs (review scheduling), and whatever
 * streak/stats fields live on the profile. Answers "why did no review-due email
 * ever fire for this user?"
 *
 * Usage: pnpm exec tsx scripts/inspect-user-retention-state.ts <userId>
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
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(svc)), projectId })
const db = admin.firestore()

function iso(v: unknown): string {
  if (!v) return "?"
  if (typeof v === "string") return v
  const ts = v as { toDate?: () => Date }
  if (ts.toDate) return ts.toDate().toISOString()
  return String(v)
}

async function main() {
  const idOrPrefix = process.argv[2]
  if (!idOrPrefix) {
    console.error("Usage: tsx scripts/inspect-user-retention-state.ts <userId or prefix>")
    process.exit(1)
  }

  // Accept a display-truncated prefix and resolve it against recent profiles.
  let userId = idOrPrefix
  const direct = await db.collection("profiles").doc(idOrPrefix).get()
  if (!direct.exists) {
    const recent = await db.collection("profiles").limit(500).get()
    const match = recent.docs.find((d) => d.id.startsWith(idOrPrefix))
    if (!match) {
      console.error(`No profile matches prefix ${idOrPrefix}`)
      process.exit(1)
    }
    userId = match.id
    console.log(`resolved prefix -> ${userId}`)
  }

  // Real shape: problem_mastery/{userId}/problems/{scenarioId}
  const parentDoc = await db.collection("problem_mastery").doc(userId).get()
  const problems = await db.collection("problem_mastery").doc(userId).collection("problems").get()
  console.log(
    `\nproblem_mastery/${userId.slice(0, 10)}: parentDocExists=${parentDoc.exists} (cron only sees users whose parent doc exists)  problems=${problems.size}`
  )
  for (const m of problems.docs.slice(0, 10)) {
    const d = m.data()
    console.log(
      `  ${m.id}  next_review_at=${iso(d.next_review_at)}  last_score=${d.last_score ?? "?"}  reviews=${d.review_count ?? "?"}  algo=${d.algorithm ?? "?"}`
    )
  }

  const prof = await db.collection("profiles").doc(userId).get()
  const pd = prof.data() ?? {}
  const streakKeys = Object.keys(pd).filter(
    (k) => k.includes("streak") || k.includes("stats") || k.includes("review")
  )
  console.log(`\nprofile streak/stats/review fields:`)
  for (const k of streakKeys) console.log(`  ${k} = ${JSON.stringify(pd[k])?.slice(0, 120)}`)
  if (streakKeys.length === 0) console.log("  (none)")
  process.exit(0)
}
main().catch((e) => {
  console.error("FAILED:", e.message)
  process.exit(1)
})
