/**
 * Emulator drill for the server-authoritative session-start writer (QUOTA-1).
 *
 * Runs ONLY under the Firestore emulator:
 *   npx firebase emulators:exec --only firestore --project demo-quota-1 \
 *     "pnpm vitest run lib/quota/__tests__/session-start-admin.emulator.test.ts"
 *
 * Skipped in normal test runs (no FIRESTORE_EMULATOR_HOST). The Admin SDK
 * bypasses security rules, so this validates the WRITER's transitions,
 * rollover, and conservative-doc targeting; the client-write lockout itself is
 * the `allow create/update: if false` rules on profile_quota.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { deleteApp, initializeApp, type App } from "firebase-admin/app"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { FREE_OPENS_PER_PAID_SESSION, recordSessionStartAdmin } from "../session-start-admin"
import { billingPeriodFromProfile } from "../billing-period"

const EMULATOR = !!process.env.FIRESTORE_EMULATOR_HOST

describe.skipIf(!EMULATOR)("recordSessionStartAdmin (Firestore emulator)", () => {
  let app: App
  let db: Firestore

  beforeAll(() => {
    app = initializeApp({ projectId: "demo-quota-1" }, "quota-emulator-drill")
    db = getFirestore(app)
  })

  afterAll(async () => {
    await deleteApp(app)
  })

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)
  let uidCounter = 0
  const freshUid = () => `drill-user-${Date.now()}-${uidCounter++}`

  async function seedProfile(uid: string, tier: "free" | "pro", signup: Date): Promise<void> {
    await db
      .collection("profiles")
      .doc(uid)
      .set({ subscription_tier: tier, created_at: signup.toISOString() })
  }

  async function quotaDocs(uid: string) {
    const snap = await db.collection("profile_quota").where("user_id", "==", uid).get()
    return snap.docs.map((d) => d.data())
  }

  async function seedQuotaDoc(
    uid: string,
    fields: { sessions_used: number; free_opens_remaining: number; periodStart: Date; periodEnd: Date; sessions_limit?: number }
  ): Promise<void> {
    const ref = db.collection("profile_quota").doc()
    await ref.set({
      id: ref.id,
      user_id: uid,
      sessions_used: fields.sessions_used,
      sessions_limit: fields.sessions_limit ?? 8,
      free_opens_remaining: fields.free_opens_remaining,
      period_start: fields.periodStart.toISOString(),
      period_end: fields.periodEnd.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  it("first start of a period creates the doc already holding the spent session", async () => {
    const uid = freshUid()
    const signup = daysAgo(40)
    await seedProfile(uid, "free", signup)

    const result = await recordSessionStartAdmin(uid, db)

    expect(result.success).toBe(true)
    expect(result.usedPaidSession).toBe(true)
    expect(result.sessionsUsed).toBe(1)
    expect(result.freeOpensRemaining).toBe(FREE_OPENS_PER_PAID_SESSION)

    const docs = await quotaDocs(uid)
    expect(docs).toHaveLength(1)
    expect(docs[0].sessions_used).toBe(1)
    expect(docs[0].free_opens_remaining).toBe(FREE_OPENS_PER_PAID_SESSION)
    expect(docs[0].last_reset_period_start).toBe(docs[0].period_start)

    const { periodStart, periodEnd } = billingPeriodFromProfile({
      subscription_tier: "free",
      created_at: signup.toISOString(),
    })
    const storedStart = new Date(docs[0].period_start)
    expect(storedStart >= periodStart && storedStart <= periodEnd).toBe(true)
  })

  it("consumes free opens before spending the next paid session", async () => {
    const uid = freshUid()
    await seedProfile(uid, "free", daysAgo(40))

    await recordSessionStartAdmin(uid, db) // paid #1, grants 10 opens

    for (let expectedOpens = 9; expectedOpens >= 0; expectedOpens--) {
      const result = await recordSessionStartAdmin(uid, db)
      expect(result.usedPaidSession).toBe(false)
      expect(result.freeOpensRemaining).toBe(expectedOpens)
      expect(result.sessionsUsed).toBe(1)
    }

    // Opens exhausted -> the next start is paid session #2 with a fresh grant.
    const paidAgain = await recordSessionStartAdmin(uid, db)
    expect(paidAgain.usedPaidSession).toBe(true)
    expect(paidAgain.sessionsUsed).toBe(2)
    expect(paidAgain.freeOpensRemaining).toBe(FREE_OPENS_PER_PAID_SESSION)

    expect(await quotaDocs(uid)).toHaveLength(1) // one doc the whole time
  })

  it("denies the start once the free-tier limit is exhausted (and never writes)", async () => {
    const uid = freshUid()
    const signup = daysAgo(40)
    await seedProfile(uid, "free", signup)
    const window = billingPeriodFromProfile({
      subscription_tier: "free",
      created_at: signup.toISOString(),
    })
    await seedQuotaDoc(uid, {
      sessions_used: 8,
      free_opens_remaining: 0,
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
    })

    const denied = await recordSessionStartAdmin(uid, db)

    expect(denied.success).toBe(false)
    expect(denied.code).toBe("LIMIT_REACHED")
    expect(denied.sessionsUsed).toBe(8)
    expect(denied.sessionsLimit).toBe(8)
    const docs = await quotaDocs(uid)
    expect(docs[0].sessions_used).toBe(8) // untouched

    // But a remaining free open is still spendable at the limit.
    await db
      .collection("profile_quota")
      .doc(docs[0].id)
      .update({ free_opens_remaining: 2 })
    const viaOpen = await recordSessionStartAdmin(uid, db)
    expect(viaOpen.success).toBe(true)
    expect(viaOpen.usedPaidSession).toBe(false)
    expect(viaOpen.freeOpensRemaining).toBe(1)
  })

  it("applies the pro limit for pro users", async () => {
    const uid = freshUid()
    await seedProfile(uid, "pro", daysAgo(40))

    const result = await recordSessionStartAdmin(uid, db)

    expect(result.success).toBe(true)
    expect(result.sessionsLimit).toBeGreaterThan(8)
  })

  it("rolls a new period over exactly once and leaves history untouched", async () => {
    const uid = freshUid()
    const signup = daysAgo(400)
    await seedProfile(uid, "free", signup)

    // Exhausted quota doc for the PREVIOUS anniversary period.
    const previousRef = billingPeriodFromProfile(
      { subscription_tier: "free", created_at: signup.toISOString() },
      daysAgo(35)
    )
    await seedQuotaDoc(uid, {
      sessions_used: 8,
      free_opens_remaining: 0,
      periodStart: previousRef.periodStart,
      periodEnd: previousRef.periodEnd,
    })

    // Current period: allowed again via a NEW doc (the "reset").
    const first = await recordSessionStartAdmin(uid, db)
    expect(first.success).toBe(true)
    expect(first.usedPaidSession).toBe(true)
    expect(first.sessionsUsed).toBe(1)

    // Second start reuses the same current-period doc — no second reset.
    const second = await recordSessionStartAdmin(uid, db)
    expect(second.usedPaidSession).toBe(false)

    const docs = await quotaDocs(uid)
    expect(docs).toHaveLength(2)
    const previous = docs.find((d) => d.period_start === previousRef.periodStart.toISOString())
    expect(previous?.sessions_used).toBe(8) // history untouched
  })

  it("targets the most-conservative doc when legacy duplicates exist", async () => {
    const uid = freshUid()
    const signup = daysAgo(40)
    await seedProfile(uid, "free", signup)
    const window = billingPeriodFromProfile({
      subscription_tier: "free",
      created_at: signup.toISOString(),
    })
    // A client-forged zero-usage doc and the real 5-used doc, same period.
    await seedQuotaDoc(uid, {
      sessions_used: 0,
      free_opens_remaining: 0,
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
    })
    await seedQuotaDoc(uid, {
      sessions_used: 5,
      free_opens_remaining: 0,
      periodStart: window.periodStart,
      periodEnd: window.periodEnd,
    })

    const result = await recordSessionStartAdmin(uid, db)

    expect(result.success).toBe(true)
    expect(result.sessionsUsed).toBe(6) // incremented the REAL counter

    const docs = await quotaDocs(uid)
    const used = docs.map((d) => d.sessions_used).sort((a, b) => a - b)
    expect(used).toEqual([0, 6]) // forged doc untouched, no third doc created
  })
})
