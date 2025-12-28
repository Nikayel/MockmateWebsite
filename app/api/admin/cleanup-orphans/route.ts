import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const COLLECTIONS = [
  { name: "interview_sessions", field: "user_id" },
  { name: "profile_quota", field: "user_id" },
  { name: "payment_history", field: "user_id" },
  { name: "email_notifications", field: "user_id" },
  { name: "promo_code_usage", field: "userId" },
  { name: "sessions", field: "userId" },
  { name: "session_vectors", field: "userId" },
  { name: "user_learning_state", field: null, idIsUserId: true },
  { name: "problem_mastery", field: "userId" },
]

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_SECRET
  return req.headers.get("Authorization") === `Bearer ${secret}`
}

// GET = dry run, POST = delete
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json(await findOrphans(false))
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json(await findOrphans(true))
}

async function findOrphans(deleteMode: boolean) {
  const profiles = await adminDb.collection("profiles").get()
  const validIds = new Set(profiles.docs.map(d => d.id))

  const results: Record<string, number> = {}
  let totalDeleted = 0

  for (const col of COLLECTIONS) {
    const snap = await adminDb.collection(col.name).get()
    const orphans = snap.docs.filter(doc => {
      const uid = col.idIsUserId ? doc.id : doc.data()[col.field!]
      return uid && !validIds.has(uid)
    })

    results[col.name] = orphans.length

    if (deleteMode && orphans.length > 0) {
      const batch = adminDb.batch()
      orphans.forEach(doc => batch.delete(doc.ref))
      await batch.commit()
      totalDeleted += orphans.length
    }
  }

  return { mode: deleteMode ? "deleted" : "preview", results, totalDeleted, validProfiles: validIds.size }
}
