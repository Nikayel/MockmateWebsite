/**
 * Unit tests for the paid distinct-question metering in recordSessionStartAdmin
 * (2026-08-18): a scenario counts once per billing period, same-period redos
 * are free, and the paid path neither spends nor grants free opens.
 *
 * Runs against a minimal fake transactional Firestore so the rule is enforced
 * on every `pnpm test`, not only under the opt-in emulator drill
 * (session-start-admin.emulator.test.ts covers the same transitions end-to-end).
 */

import { describe, expect, it } from "vitest"
import { billingPeriodFromProfile } from "../billing-period"
import { recordSessionStartAdmin } from "../session-start-admin"

const SIGNUP = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()

function currentWindow(tier: "free" | "pro" | "enterprise") {
  return billingPeriodFromProfile({ subscription_tier: tier, created_at: SIGNUP })
}

interface SeedDoc {
  sessions_used: number
  sessions_limit: number
  free_opens_remaining: number
  scenarios_started?: string[]
  period_start: string
  period_end: string
}

function makeFakeDb(profile: Record<string, unknown>, seeds: SeedDoc[] = []) {
  const PROFILE_REF = { kind: "profileRef" }
  const QUOTA_QUERY = { kind: "quotaQuery" }
  let autoId = 0

  const state = {
    docs: seeds.map((data, i) => ({ id: `seed-${i}`, data: { ...data } })),
    creates: [] as Array<Record<string, unknown>>,
    updates: [] as Array<{ id: string; data: Record<string, unknown> }>,
  }

  const db = {
    collection(name: string) {
      if (name === "profiles") {
        return { doc: () => PROFILE_REF }
      }
      return {
        where: () => ({ orderBy: () => ({ limit: () => QUOTA_QUERY }) }),
        doc: () => ({ kind: "newQuotaRef", id: `auto-${autoId++}` }),
      }
    },
    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      const tx = {
        async get(target: unknown) {
          if (target === PROFILE_REF) {
            return { data: () => profile }
          }
          if (target === QUOTA_QUERY) {
            return {
              docs: state.docs.map((d) => ({
                data: () => d.data,
                ref: { kind: "quotaRef", id: d.id },
              })),
            }
          }
          throw new Error("unexpected tx.get target")
        },
        create(ref: { id: string }, data: Record<string, unknown>) {
          state.creates.push({ ...data, __refId: ref.id })
        },
        update(ref: { id: string }, data: Record<string, unknown>) {
          state.updates.push({ id: ref.id, data })
        },
      }
      return fn(tx)
    },
  }

  return { db: db as unknown as FirebaseFirestore.Firestore, state }
}

function proSeed(overrides: Partial<SeedDoc> = {}): SeedDoc {
  const { periodStart, periodEnd } = currentWindow("pro")
  return {
    sessions_used: 4,
    sessions_limit: 100,
    free_opens_remaining: 0,
    scenarios_started: ["dsa-two-sum"],
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    ...overrides,
  }
}

const PRO_PROFILE = { subscription_tier: "pro", created_at: SIGNUP }

describe("recordSessionStartAdmin: paid distinct-question metering", () => {
  it("spends a session and records the ledger for a NEW scenario", async () => {
    const { db, state } = makeFakeDb(PRO_PROFILE, [proSeed()])

    const result = await recordSessionStartAdmin("u1", "dsa-valid-anagram", db)

    expect(result).toMatchObject({
      success: true,
      usedPaidSession: true,
      freeRetry: false,
      sessionsUsed: 5,
      sessionsLimit: 100,
    })
    expect(state.updates).toHaveLength(1)
    const payload = state.updates[0].data
    expect(payload.sessions_used).toBe(5)
    expect(payload).toHaveProperty("scenarios_started")
    // The paid path neither spends nor grants opens.
    expect(payload).not.toHaveProperty("free_opens_remaining")
  })

  it("treats a scenario already in the ledger as a FREE redo", async () => {
    const { db, state } = makeFakeDb(PRO_PROFILE, [proSeed()])

    const result = await recordSessionStartAdmin("u1", "dsa-two-sum", db)

    expect(result).toMatchObject({
      success: true,
      usedPaidSession: false,
      freeRetry: true,
      sessionsUsed: 4, // unchanged
    })
    // Timestamp-only touch: the counter and ledger must not move.
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0].data).not.toHaveProperty("sessions_used")
    expect(state.updates[0].data).not.toHaveProperty("scenarios_started")
  })

  it("denies a NEW scenario at the limit without writing", async () => {
    const { db, state } = makeFakeDb(PRO_PROFILE, [proSeed({ sessions_used: 100 })])

    const result = await recordSessionStartAdmin("u1", "dsa-valid-anagram", db)

    expect(result.success).toBe(false)
    expect(result.code).toBe("LIMIT_REACHED")
    expect(state.updates).toHaveLength(0)
    expect(state.creates).toHaveLength(0)
  })

  it("still allows a redo at the limit", async () => {
    const { db } = makeFakeDb(PRO_PROFILE, [proSeed({ sessions_used: 100 })])

    const result = await recordSessionStartAdmin("u1", "dsa-two-sum", db)

    expect(result.success).toBe(true)
    expect(result.freeRetry).toBe(true)
  })

  it("creates the first period doc with the ledger and NO opens grant", async () => {
    const { db, state } = makeFakeDb(PRO_PROFILE, [])

    const result = await recordSessionStartAdmin("u1", "dsa-two-sum", db)

    expect(result).toMatchObject({ usedPaidSession: true, sessionsUsed: 1, freeOpensRemaining: 0 })
    expect(state.creates).toHaveLength(1)
    expect(state.creates[0]).toMatchObject({
      sessions_used: 1,
      free_opens_remaining: 0,
      scenarios_started: ["dsa-two-sum"],
    })
  })

  it("ignores a ledger on a zero-usage doc (forged-doc depth)", async () => {
    const { db } = makeFakeDb(PRO_PROFILE, [
      proSeed({ sessions_used: 0, scenarios_started: ["dsa-two-sum"] }),
    ])

    const result = await recordSessionStartAdmin("u1", "dsa-two-sum", db)

    expect(result.freeRetry).toBe(false)
    expect(result.usedPaidSession).toBe(true)
    expect(result.sessionsUsed).toBe(1)
  })

  it("applies the redo rule to enterprise too (isPaidTier)", async () => {
    const { periodStart, periodEnd } = currentWindow("enterprise")
    const { db } = makeFakeDb({ subscription_tier: "enterprise", created_at: SIGNUP }, [
      {
        sessions_used: 7,
        sessions_limit: 999,
        free_opens_remaining: 0,
        scenarios_started: ["dsa-two-sum"],
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      },
    ])

    const result = await recordSessionStartAdmin("u1", "dsa-two-sum", db)

    expect(result.freeRetry).toBe(true)
    expect(result.sessionsUsed).toBe(7)
  })

  it("falls back to the legacy opens mechanic when no scenarioId arrives", async () => {
    const { db, state } = makeFakeDb(PRO_PROFILE, [])

    const result = await recordSessionStartAdmin("u1", undefined, db)

    expect(result.usedPaidSession).toBe(true)
    expect(result.freeOpensRemaining).toBe(10)
    expect(state.creates[0]).not.toHaveProperty("scenarios_started")
  })
})

describe("recordSessionStartAdmin: free tier keeps the opens mechanic", () => {
  const FREE_PROFILE = { subscription_tier: "free", created_at: SIGNUP }

  function freeSeed(overrides: Partial<SeedDoc> = {}): SeedDoc {
    const { periodStart, periodEnd } = currentWindow("free")
    return {
      sessions_used: 1,
      sessions_limit: 8,
      free_opens_remaining: 3,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      ...overrides,
    }
  }

  it("spends an open even when the scenario was already attempted", async () => {
    const { db, state } = makeFakeDb(FREE_PROFILE, [
      freeSeed({ scenarios_started: ["dsa-two-sum"] }),
    ])

    const result = await recordSessionStartAdmin("u1", "dsa-two-sum", db)

    expect(result.usedPaidSession).toBe(false)
    expect(result.freeRetry).toBe(false)
    expect(result.freeOpensRemaining).toBe(2)
    // The ledger is still recorded for analytics / a future switch.
    expect(state.updates[0].data).toHaveProperty("scenarios_started")
  })

  it("grants opens on a paid free-tier spend, as before", async () => {
    const { db } = makeFakeDb(FREE_PROFILE, [freeSeed({ free_opens_remaining: 0 })])

    const result = await recordSessionStartAdmin("u1", "dsa-two-sum", db)

    expect(result.usedPaidSession).toBe(true)
    expect(result.sessionsUsed).toBe(2)
    expect(result.freeOpensRemaining).toBe(10)
  })
})
