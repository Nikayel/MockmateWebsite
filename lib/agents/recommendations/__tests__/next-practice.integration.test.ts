import { randomUUID } from "node:crypto"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { adminDb } from "@/lib/firebase-admin"
import { scenarios } from "@/lib/scenarios"
import { billingPeriodFromProfile } from "@/lib/quota/billing-period"
import { recordSessionStartAdmin } from "@/lib/quota/session-start-admin"
import { getSessionsLimitForTier } from "@/lib/pricing"
import { getNextPracticeEntry } from "@/lib/interview/next-practice-entry"
import { nextPracticeResponseSchema } from "../next-practice-response-schema"
import { getNextPractice } from "../next-practice.server"

const created: FirebaseFirestore.DocumentReference[] = []
async function seed(collection: string, id: string, fields: Record<string, unknown>) {
  const ref = adminDb.collection(collection).doc(id)
  created.push(ref)
  await ref.set(fields)
  return ref
}
async function source(userId: string, fields: Record<string, unknown> = {}) {
  return seed("interview_sessions", `recommendation-${randomUUID()}`, {
    user_id: userId,
    scenario_id: "dsa-two-sum",
    topic: "Two Sum",
    type: "dsa",
    difficulty: "easy",
    language: "python",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    feedback_status: "complete",
    feedback: "Explain the invariant before coding.",
    technical_score: 70,
    ...fields,
  })
}
async function freeAccount(userId: string, exhausted: boolean) {
  const profile = { subscription_tier: "free", created_at: new Date().toISOString() }
  await seed("profiles", userId, profile)
  const { periodStart, periodEnd } = billingPeriodFromProfile(profile)
  return seed("profile_quota", userId, {
    user_id: userId,
    sessions_used: exhausted ? getSessionsLimitForTier("free") : 0,
    sessions_limit: getSessionsLimitForTier("free"),
    free_opens_remaining: 0,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  })
}

beforeAll(() => {
  // Refuse real projects/remote endpoints even if shell env overrides the setup.
  expect(process.env.FIRESTORE_EMULATOR_HOST).toMatch(/^(localhost|127\.0\.0\.1):\d+$/)
  expect(adminDb.projectId).toBe("codesparring-integration")
})
afterEach(async () => {
  await Promise.all(created.splice(0).map((ref) => ref.delete()))
})

describe("saved feedback → next practice → authoritative start (real Firestore)", () => {
  it("gives exhausted free users advice without writes, but denies an actual start", async () => {
    const uid = `recommendation-${randomUUID()}`
    const quota = await freeAccount(uid, true)
    const session = await source(uid)
    const before = (await quota.get()).data()
    const result = await getNextPractice(uid, session.id)
    expect(result.status).toBe("ready")
    expect(nextPracticeResponseSchema.safeParse(result).success).toBe(true)
    expect((await quota.get()).data()).toEqual(before)
    if (result.status !== "ready") throw new Error("Expected a recommendation")
    const start = await recordSessionStartAdmin(uid, result.recommendation.scenarioId)
    expect(start).toMatchObject({ success: false, code: "LIMIT_REACHED" })
    expect((await quota.get()).data()).toEqual(before)
  })

  it("waits for persisted feedback, opens the exact task, and excludes its completed session", async () => {
    const uid = `recommendation-${randomUUID()}`
    const quota = await freeAccount(uid, false)
    const session = await source(uid, { feedback_status: "processing" })
    expect(await getNextPractice(uid, session.id)).toEqual({ status: "not_ready" })
    await session.update({ feedback_status: "complete" })
    const result = await getNextPractice(uid, session.id)
    if (result.status !== "ready") throw new Error("Expected completed feedback advice")
    const { recommendation } = result
    expect(nextPracticeResponseSchema.safeParse(result).success).toBe(true)
    const params = new URL(recommendation.href, "http://localhost").searchParams
    expect(getNextPracticeEntry(params)).toEqual({
      sourceSessionId: session.id,
      scenarioId: recommendation.scenarioId,
    })
    expect(params.get("language")).toBe("python")
    expect(scenarios.some((task) => task.id === recommendation.scenarioId)).toBe(true)
    expect((await quota.get()).get("sessions_used")).toBe(0)
    const start = await recordSessionStartAdmin(uid, recommendation.scenarioId)
    expect(start).toMatchObject({ success: true, usedPaidSession: true, sessionsUsed: 1 })
    expect((await quota.get()).get("scenarios_started")).toContain(recommendation.scenarioId)
    await source(uid, { scenario_id: recommendation.scenarioId })
    const afterCompletion = await getNextPractice(uid, session.id)
    expect(afterCompletion.status).not.toBe("not_ready")
    if (afterCompletion.status === "ready") {
      expect(afterCompletion.recommendation.scenarioId).not.toBe(recommendation.scenarioId)
    } else expect(afterCompletion.status).toBe("no_match")
  })

  it("isolates ownership and excludes only this user's completed history", async () => {
    const uid = `recommendation-${randomUUID()}`
    const session = await source(uid)
    const result = await getNextPractice(uid, session.id)
    if (result.status !== "ready") throw new Error("Expected a recommendation")
    await source(`other-${uid}`, { scenario_id: result.recommendation.scenarioId })
    await source(uid, { scenario_id: result.recommendation.scenarioId, completed_at: null })
    expect(await getNextPractice(uid, session.id)).toEqual(result)
    expect(await getNextPractice(`other-${uid}`, session.id)).toEqual({ status: "not_found" })
    expect(await getNextPractice(uid, "missing-recommendation-session")).toEqual({
      status: "not_found",
    })
  })
})
