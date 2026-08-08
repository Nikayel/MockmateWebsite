/**
 * Security-rules tests for the profile entitlement boundary.
 *
 * `profiles.subscription_tier` IS the entitlement store: lib/quota-enforcement.ts
 * and lib/quota/session-start-admin.ts read it directly to decide what a user is
 * allowed to do. firestore.rules is the only thing standing between a browser and
 * that field, it is deployed by hand, and it had no tests at all.
 *
 * These run against the real Firestore emulator with the real rules file, so they
 * exercise the deployed artifact rather than a description of it.
 *
 * Run with:  pnpm test:integration
 */

import { readFileSync } from "node:fs"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore"

const USER = "user_alice"
const OTHER = "user_mallory"

let testEnv: RulesTestEnvironment

/** A profile as createOrUpdateProfile actually writes it for a new signup. */
function newProfile(userId: string) {
  return {
    id: userId,
    email: `${userId}@example.com`,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    subscription_tier: "free",
  }
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-codesparring-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

/** Seed a profile bypassing rules, the way the Admin SDK does in production. */
async function seedProfile(userId: string, overrides: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "profiles", userId), {
      ...newProfile(userId),
      ...overrides,
    })
  })
}

describe("profiles: entitlement boundary", () => {
  it("lets a new user create their own free profile", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertSucceeds(setDoc(doc(db, "profiles", USER), newProfile(USER)))
  })

  it("REJECTS creating a profile that is already pro", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertFails(
      setDoc(doc(db, "profiles", USER), { ...newProfile(USER), subscription_tier: "pro" })
    )
  })

  it("REJECTS creating a profile that smuggles in Stripe identifiers", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertFails(
      setDoc(doc(db, "profiles", USER), {
        ...newProfile(USER),
        stripe_customer_id: "cus_victim",
      })
    )
  })

  it("REJECTS creating a profile that raises its own AI budget cap", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertFails(
      setDoc(doc(db, "profiles", USER), { ...newProfile(USER), custom_budget_cap: 10000 })
    )
  })

  it("REJECTS deleting a profile, which is half of the delete-and-recreate forgery", async () => {
    await seedProfile(USER)
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertFails(deleteDoc(doc(db, "profiles", USER)))
  })

  it("closes the full delete-then-recreate-as-pro exploit end to end", async () => {
    await seedProfile(USER, { subscription_tier: "free" })
    const db = testEnv.authenticatedContext(USER).firestore()

    // Step 1 of the exploit: remove the profile so the create rule applies again.
    await assertFails(deleteDoc(doc(db, "profiles", USER)))
    // Step 2, attempted anyway: overwrite in place as pro.
    await assertFails(
      setDoc(doc(db, "profiles", USER), { ...newProfile(USER), subscription_tier: "pro" })
    )

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDoc(doc(ctx.firestore(), "profiles", USER))
      expect(snap.data()?.subscription_tier).toBe("free")
    })
  })
})

describe("profiles: server-only fields on update", () => {
  beforeEach(() => seedProfile(USER))

  it("allows ordinary profile edits", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertSucceeds(updateDoc(doc(db, "profiles", USER), { full_name: "Alice Example" }))
  })

  // The most important test in this file. createOrUpdateProfile runs on EVERY
  // sign-in and rewrites the whole document, including subscription_tier and
  // created_at, carrying their existing values forward. If a same-value write
  // counted as an "affected key" the blocklist would reject every returning
  // user's sign-in. diff().affectedKeys() reports only keys whose value CHANGED,
  // so it does not, and this pins that behavior.
  it("allows the full-document rewrite that every sign-in performs", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertSucceeds(
      setDoc(
        doc(db, "profiles", USER),
        {
          ...newProfile(USER),
          full_name: "Alice Example",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
        { merge: true }
      )
    )
  })

  it("still allows that rewrite for a PRO user, carrying their tier forward", async () => {
    await seedProfile(USER, { subscription_tier: "pro", subscription_status: "active" })
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertSucceeds(
      setDoc(
        doc(db, "profiles", USER),
        {
          ...newProfile(USER),
          subscription_tier: "pro",
          subscription_status: "active",
          updated_at: "2026-06-01T00:00:00.000Z",
        },
        { merge: true }
      )
    )
  })

  it.each([
    ["subscription_tier", "pro"],
    ["subscription_status", "active"],
    ["stripe_customer_id", "cus_forged"],
    ["stripe_subscription_id", "sub_forged"],
    ["subscription_type", "yearly"],
    ["custom_budget_cap", 10000],
    // created_at is the anniversary input to lib/quota/billing-period.ts. Moving
    // it forward shifts the billing window so no existing profile_quota doc
    // matches and sessionsUsed reads 0 again: unlimited free sessions.
    ["created_at", "2027-01-01T00:00:00.000Z"],
  ])("REJECTS a client write to %s", async (field, value) => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertFails(updateDoc(doc(db, "profiles", USER), { [field]: value }))
  })
})

describe("profiles: cross-user access", () => {
  beforeEach(() => seedProfile(USER))

  it("REJECTS reading someone else's profile", async () => {
    const db = testEnv.authenticatedContext(OTHER).firestore()

    await assertFails(getDoc(doc(db, "profiles", USER)))
  })

  it("REJECTS writing someone else's profile", async () => {
    const db = testEnv.authenticatedContext(OTHER).firestore()

    await assertFails(updateDoc(doc(db, "profiles", USER), { full_name: "owned" }))
  })

  it("REJECTS an unauthenticated read", async () => {
    const db = testEnv.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(db, "profiles", USER)))
  })
})

describe("users subcollections", () => {
  it("lets a user read their own session summary", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", USER, "session_summaries", "s1"), {
        scoreBreakdown: { overall: 82 },
      })
    })
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertSucceeds(getDoc(doc(db, "users", USER, "session_summaries", "s1")))
  })

  it("REJECTS reading someone else's session summary", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", USER, "session_summaries", "s1"), {
        scoreBreakdown: { overall: 82 },
      })
    })
    const db = testEnv.authenticatedContext(OTHER).firestore()

    await assertFails(getDoc(doc(db, "users", USER, "session_summaries", "s1")))
  })

  it("REJECTS writing a session summary, which is server-only", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertFails(
      setDoc(doc(db, "users", USER, "session_summaries", "s1"), { scoreBreakdown: { overall: 99 } })
    )
  })

  it("REJECTS reading budget state elsewhere under the users tree", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", USER, "usage_summaries", "2026-01"), {
        totalCost: 4.2,
      })
    })
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertFails(getDoc(doc(db, "users", USER, "usage_summaries", "2026-01")))
  })
})

describe("interview_sessions: score sanity", () => {
  /** The document lib/firestore-helpers.ts actually creates when a session starts. */
  function newSession(userId: string, extra: Record<string, unknown> = {}) {
    return {
      id: "s1",
      user_id: userId,
      topic: "Two Sum",
      type: "dsa",
      pattern: "arrays-hashing",
      difficulty: "easy",
      started_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      ...extra,
    }
  }

  it("allows the ordinary session create", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertSucceeds(setDoc(doc(db, "interview_sessions", "s1"), newSession(USER)))
  })

  // Scores round-trip through the browser by design, so completion MUST work.
  it("allows a completion carrying an in-range score", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertSucceeds(setDoc(doc(db, "interview_sessions", "s1"), newSession(USER)))

    await assertSucceeds(
      updateDoc(doc(db, "interview_sessions", "s1"), {
        performance_score: 87,
        completed_at: "2026-01-01T01:00:00.000Z",
        feedback_status: "complete",
      })
    )
  })

  it.each([0, 100])("allows the boundary score %i", async (score) => {
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertSucceeds(setDoc(doc(db, "interview_sessions", "s1"), newSession(USER)))

    await assertSucceeds(
      updateDoc(doc(db, "interview_sessions", "s1"), { performance_score: score })
    )
  })

  // These are the values that wreck an average, far more than an optimistic one.
  it.each([
    ["negative", -5],
    ["above 100", 101],
    ["absurd", 1_000_000_000],
  ])("REJECTS an out-of-range score (%s)", async (_label, score) => {
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertSucceeds(setDoc(doc(db, "interview_sessions", "s1"), newSession(USER)))

    await assertFails(updateDoc(doc(db, "interview_sessions", "s1"), { performance_score: score }))
  })

  it("REJECTS a non-numeric score", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertSucceeds(setDoc(doc(db, "interview_sessions", "s1"), newSession(USER)))

    await assertFails(updateDoc(doc(db, "interview_sessions", "s1"), { performance_score: "100" }))
  })

  it("REJECTS an out-of-range score smuggled in at CREATE time", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()

    await assertFails(
      setDoc(doc(db, "interview_sessions", "s2"), newSession(USER, { performance_score: 999 }))
    )
  })

  it("still REJECTS writing a session owned by someone else", async () => {
    const db = testEnv.authenticatedContext(OTHER).firestore()

    await assertFails(setDoc(doc(db, "interview_sessions", "s3"), newSession(USER)))
  })
})

// =============================================================================
// The rest of the money and entitlement surface.
//
// The tests above cover profiles, which is where the entitlement TIER lives.
// Everything below is the surface around it: the records that say what was paid,
// what was granted, what quota remains, and what the platform has spent. Each of
// these is written only by the Admin SDK in production, which bypasses rules
// entirely, so a client write reaching any of them is by definition forgery.
//
// Uncovered rules are indistinguishable from absent ones on the day someone
// probes them, and this file is the only thing that runs the real artifact.
// =============================================================================

/** Write a document the way the Admin SDK does, bypassing rules. */
async function seed(path: [string, string], data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path[0], path[1]), data)
  })
}

describe("subscriptions: a user cannot grant themselves one", () => {
  it("lets a user read their own subscription", async () => {
    await seed(["subscriptions", USER], { tier: "pro", status: "active" })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertSucceeds(getDoc(doc(db, "subscriptions", USER)))
  })

  it("REJECTS reading someone else's subscription", async () => {
    await seed(["subscriptions", OTHER], { tier: "pro", status: "active" })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(getDoc(doc(db, "subscriptions", OTHER)))
  })

  it("REJECTS creating a subscription for yourself", async () => {
    // The whole point: writing this document is how you would buy Pro for free.
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(setDoc(doc(db, "subscriptions", USER), { tier: "pro", status: "active" }))
  })

  it("REJECTS updating an existing subscription", async () => {
    await seed(["subscriptions", USER], { tier: "free", status: "active" })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(updateDoc(doc(db, "subscriptions", USER), { tier: "pro" }))
  })

  it("REJECTS deleting a subscription", async () => {
    await seed(["subscriptions", USER], { tier: "pro", status: "cancelled" })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(deleteDoc(doc(db, "subscriptions", USER)))
  })
})

describe("payment_history: a user cannot forge a payment", () => {
  it("lets a user read their own payment", async () => {
    await seed(["payment_history", "pay_1"], { user_id: USER, amount: 2500 })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertSucceeds(getDoc(doc(db, "payment_history", "pay_1")))
  })

  it("REJECTS reading someone else's payment", async () => {
    await seed(["payment_history", "pay_2"], { user_id: OTHER, amount: 2500 })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(getDoc(doc(db, "payment_history", "pay_2")))
  })

  it("REJECTS writing a payment record, even one that names you honestly", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(setDoc(doc(db, "payment_history", "pay_3"), { user_id: USER, amount: 2500 }))
  })
})

describe("profile_quota: server-authoritative", () => {
  it("lets a user read their own quota", async () => {
    await seed(["profile_quota", USER], { user_id: USER, sessionsUsed: 3 })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertSucceeds(getDoc(doc(db, "profile_quota", USER)))
  })

  it("REJECTS reading someone else's quota", async () => {
    await seed(["profile_quota", OTHER], { user_id: OTHER, sessionsUsed: 3 })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(getDoc(doc(db, "profile_quota", OTHER)))
  })

  it("REJECTS resetting your own usage counter", async () => {
    await seed(["profile_quota", USER], { user_id: USER, sessionsUsed: 99 })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(updateDoc(doc(db, "profile_quota", USER), { sessionsUsed: 0 }))
  })

  it("REJECTS creating a fresh zero-usage quota document", async () => {
    // The old client used to do exactly this, which is why creates are off.
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(setDoc(doc(db, "profile_quota", USER), { user_id: USER, sessionsUsed: 0 }))
  })
})

describe("promo_code_usage: single use is enforced by immutability", () => {
  it("lets a user record their own use of a code", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertSucceeds(
      setDoc(doc(db, "promo_code_usage", `${USER}_LAUNCH50`), {
        user_id: USER,
        code: "LAUNCH50",
        usedAt: "2026-01-01T00:00:00.000Z",
      })
    )
  })

  it("REJECTS a record whose document id does not carry the caller's uid", async () => {
    // The id format is what makes a second use collide with the first.
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(
      setDoc(doc(db, "promo_code_usage", "anything_LAUNCH50"), {
        user_id: USER,
        code: "LAUNCH50",
        usedAt: "2026-01-01T00:00:00.000Z",
      })
    )
  })

  it("REJECTS claiming a use on behalf of another user", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(
      setDoc(doc(db, "promo_code_usage", `${USER}_LAUNCH50`), {
        user_id: OTHER,
        code: "LAUNCH50",
        usedAt: "2026-01-01T00:00:00.000Z",
      })
    )
  })

  it("REJECTS deleting a usage record, which would allow reusing the code", async () => {
    // This is the whole single-use mechanism: the record cannot be removed, so a
    // 100%-off code cannot be redeemed twice by the same account.
    await seed(["promo_code_usage", `${USER}_LAUNCH50`], {
      user_id: USER,
      code: "LAUNCH50",
      usedAt: "2026-01-01T00:00:00.000Z",
    })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(deleteDoc(doc(db, "promo_code_usage", `${USER}_LAUNCH50`)))
  })

  it("REJECTS rewriting a usage record to point at a different code", async () => {
    await seed(["promo_code_usage", `${USER}_LAUNCH50`], {
      user_id: USER,
      code: "LAUNCH50",
      usedAt: "2026-01-01T00:00:00.000Z",
    })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(updateDoc(doc(db, "promo_code_usage", `${USER}_LAUNCH50`), { code: "OTHER" }))
  })

  it("REJECTS a record missing the fields the server relies on", async () => {
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(setDoc(doc(db, "promo_code_usage", `${USER}_LAUNCH50`), { user_id: USER }))
  })
})

describe("spend ledgers: invisible to every client", () => {
  it("REJECTS reading the global daily spend counter", async () => {
    await seed(["global_usage", "2026-08-08"], { totalCost: 42 })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(getDoc(doc(db, "global_usage", "2026-08-08")))
  })

  it("REJECTS zeroing the global spend counter, which would disarm the kill switch", async () => {
    // isGlobalCeilingExceeded reads this document. A client that could write it
    // could switch off the platform-wide daily spend ceiling.
    await seed(["global_usage", "2026-08-08"], { totalCost: 249 })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(updateDoc(doc(db, "global_usage", "2026-08-08"), { totalCost: 0 }))
  })

  it("REJECTS reading or writing per-call usage events", async () => {
    await seed(["usage_events", "evt_1"], { userId: USER, costUsd: 0.01 })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(getDoc(doc(db, "usage_events", "evt_1")))
    await assertFails(setDoc(doc(db, "usage_events", "evt_2"), { userId: USER, costUsd: 0 }))
  })
})

describe("server-only collections stay server-only", () => {
  it("REJECTS client access to the admin tree", async () => {
    await seed(["admin", "roles"], { anything: true })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(getDoc(doc(db, "admin", "roles")))
    await assertFails(setDoc(doc(db, "admin", "self"), { role: "super_admin" }))
  })

  it("REJECTS client access to the system tree", async () => {
    await seed(["system", "config"], { anything: true })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(getDoc(doc(db, "system", "config")))
  })

  it("REJECTS client access to the experiment config", async () => {
    // Writing this is how a participant would move themselves between arms.
    await seed(["research_config", "algorithm"], { ab_ended: false })
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(getDoc(doc(db, "research_config", "algorithm")))
    await assertFails(updateDoc(doc(db, "research_config", "algorithm"), { ab_ended: true }))
  })
})

describe("the catch-all denies anything not explicitly allowed", () => {
  it("REJECTS a collection no rule mentions", async () => {
    // A new collection added by future code is closed until someone opens it,
    // rather than open until someone notices.
    const db = testEnv.authenticatedContext(USER).firestore()
    await assertFails(setDoc(doc(db, "some_future_collection", "doc_1"), { a: 1 }))
    await assertFails(getDoc(doc(db, "some_future_collection", "doc_1")))
  })

  it("REJECTS an unauthenticated caller everywhere it matters", async () => {
    await seed(["subscriptions", USER], { tier: "pro" })
    await seed(["payment_history", "pay_9"], { user_id: USER, amount: 2500 })
    const db = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, "subscriptions", USER)))
    await assertFails(getDoc(doc(db, "payment_history", "pay_9")))
    await assertFails(setDoc(doc(db, "profiles", USER), newProfile(USER)))
  })
})
