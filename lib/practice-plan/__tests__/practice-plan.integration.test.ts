import { randomUUID } from "node:crypto"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { adminDb } from "@/lib/firebase-admin"
import { getNextPractice } from "@/lib/agents/recommendations/next-practice.server"
import { savePracticePlan, getSavedPractice, removePracticePlan } from "../service"
import { processPracticeReminders } from "../reminder-worker"
const send = vi.hoisted(() => vi.fn())
vi.mock("../reminder-email", () => ({ sendPracticeReminder: send }))
vi.mock("@/lib/analytics-server", () => ({ trackEventServer: vi.fn() }))
const created: FirebaseFirestore.DocumentReference[] = []
const now = new Date("2026-10-10T10:00:00.000Z")
async function seed(collection: string, id: string, fields: Record<string, unknown>) {
  const ref = adminDb.collection(collection).doc(id)
  created.push(ref)
  await ref.set(fields)
  return ref
}
async function setup(reminder = true) {
  const uid = `practice-plan-${randomUUID()}`
  await seed("profiles", uid, {
    email: "fixture@example.com",
    notification_preferences: {},
    subscription_tier: "free",
  })
  const source = await seed("interview_sessions", `source-${randomUUID()}`, {
    user_id: uid,
    scenario_id: "dsa-two-sum",
    topic: "Two Sum",
    type: "dsa",
    difficulty: "easy",
    language: "python",
    started_at: "2026-10-09T10:00:00.000Z",
    completed_at: "2026-10-09T10:30:00.000Z",
    feedback_status: "complete",
    feedback: "Explain your invariant",
    score_breakdown: { communicationScore: 40 },
  })
  const next = await getNextPractice(uid, source.id)
  if (next.status !== "ready") throw new Error("Missing fixture task")
  const request = {
    sourceSessionId: source.id,
    scenarioId: next.recommendation.scenarioId,
    reminderAt: reminder ? now.toISOString() : null,
    timezone: "UTC",
  }
  const result = await savePracticePlan(uid, request, new Date("2026-10-10T09:00:00.000Z"))
  if (result.status !== "ready") throw new Error("Missing fixture plan")
  const ref = adminDb.collection("practice_plans").doc(uid)
  created.push(ref)
  return { uid, source, request, plan: result.plan, ref }
}
beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST).toMatch(/^(localhost|127\.0\.0\.1):\d+$/)
  expect(adminDb.projectId).toBe("codesparring-integration")
})
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(now)
  send.mockReset()
  send.mockResolvedValue({ success: true, messageId: "fixture" })
})
afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(created.splice(0).map((ref) => ref.delete()))
})
describe("saved task return loop with real Firestore transactions", () => {
  it("persists across reads without spending quota", async () => {
    const { uid, plan } = await setup(false)
    expect(await getSavedPractice(uid)).toMatchObject({
      status: "ready",
      plan: { revision: plan.revision },
    })
    expect((await adminDb.collection("profile_quota").doc(uid).get()).exists).toBe(false)
    await processPracticeReminders(now)
    expect(send).not.toHaveBeenCalled()
  })
  it("makes concurrent double saves and lost-response retries idempotent", async () => {
    const { uid, request, plan } = await setup()
    const results = await Promise.all(
      Array.from({ length: 5 }, () => savePracticePlan(uid, request, now))
    )
    expect(results.every((r) => r.status === "ready" && r.plan.revision === plan.revision)).toBe(
      true
    )
  })
  it("refuses another user's source and a forged scenario", async () => {
    const { uid, request } = await setup()
    await expect(
      savePracticePlan(`${uid}-other`, { ...request, reminderAt: null })
    ).rejects.toThrow("changed")
    await expect(
      savePracticePlan(uid, { ...request, scenarioId: "forged", reminderAt: null })
    ).rejects.toThrow("changed")
  })
  it("cancels pending reminders on completion and reports actual score pairs", async () => {
    const { uid, plan, ref } = await setup()
    const completed = await seed("interview_sessions", `completed-${randomUUID()}`, {
      user_id: uid,
      scenario_id: plan.recommendation.scenarioId,
      type: "dsa",
      started_at: "2026-10-10T09:10:00.000Z",
      completed_at: "2026-10-10T09:30:00.000Z",
      feedback_status: "complete",
      score_breakdown: { communicationScore: 65 },
    })
    expect(await getSavedPractice(uid)).toMatchObject({
      status: "complete",
      completedSessionId: completed.id,
      observations: [expect.stringContaining("different exercises")],
    })
    await processPracticeReminders(now)
    expect(send).not.toHaveBeenCalled()
    expect((await ref.get()).get("nextAttemptAt")).toBeNull()
  })
  it("does not label a pending evaluation complete or cancel its reminder", async () => {
    const { uid, plan } = await setup()
    await seed("interview_sessions", `pending-${randomUUID()}`, {
      user_id: uid,
      scenario_id: plan.recommendation.scenarioId,
      type: "dsa",
      started_at: "2026-10-10T09:10:00.000Z",
      completed_at: "2026-10-10T09:30:00.000Z",
      feedback_status: "pending",
    })
    expect(await getSavedPractice(uid)).toMatchObject({
      status: "ready",
      plan: { reminderStatus: "pending" },
    })
  })
  it("sends once across overlapping cron runs", async () => {
    const { ref } = await setup()
    await Promise.all([processPracticeReminders(now), processPracticeReminders(now)])
    expect(send).toHaveBeenCalledTimes(1)
    expect((await ref.get()).get("reminderStatus")).toBe("sent")
  })
  it("honors opt-outs made after scheduling", async () => {
    const { uid, ref } = await setup()
    await adminDb
      .collection("profiles")
      .doc(uid)
      .update({ "notification_preferences.inactivity_reminders": false })
    await processPracticeReminders(now)
    expect(send).not.toHaveBeenCalled()
    expect((await ref.get()).get("reminderStatus")).toBe("cancelled")
  })
  it("does not replay unknown deliveries or expired sending leases", async () => {
    const { ref } = await setup()
    send.mockResolvedValue({ success: false, deliveryUncertain: true })
    await processPracticeReminders(now)
    await processPracticeReminders(now)
    expect(send).toHaveBeenCalledTimes(1)
    expect((await ref.get()).get("reminderStatus")).toBe("uncertain")
    await ref.update({ reminderStatus: "sending", nextAttemptAt: "2026-10-10T09:59:00.000Z" })
    await processPracticeReminders(now)
    expect(send).toHaveBeenCalledTimes(1)
    expect((await ref.get()).get("reminderStatus")).toBe("uncertain")
  })
  it("preserves a newer save when an old removal arrives", async () => {
    const { uid, plan, ref } = await setup()
    await ref.update({ revision: randomUUID() })
    await expect(removePracticePlan(uid, plan.revision)).rejects.toThrow("changed")
    expect((await ref.get()).exists).toBe(true)
  })
})
