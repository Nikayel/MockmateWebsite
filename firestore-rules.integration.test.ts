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
