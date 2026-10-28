import { Timestamp } from "firebase-admin/firestore"
import { NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { afterEach, beforeAll, expect, it, vi } from "vitest"
import { adminDb } from "@/lib/firebase-admin"
import { attachRecommendationDecision, recommendationDecisionRef } from "../decisions.server"
import { recordRecommendationInteraction } from "../decision-interactions.server"
import {
  recordRecommendationCompletion,
  recordRecommendationStart,
} from "../decision-outcomes.server"
import type { NextPracticeRecommendation } from "../next-practice-types"
import { persistFinalSession } from "@/lib/user-metrics/persist-final"

// Real database/transactions; the analytics mirror is isolated from external services.
vi.mock("@/lib/analytics-server", () => ({ trackEventServer: vi.fn() }))
import { trackEventServer } from "@/lib/analytics-server"
vi.mock("@/lib/ai-providers", () => ({
  generateFeedbackResponse: vi.fn(async () => ({ text: "Final feedback: explain the invariant." })),
}))
vi.mock("@/lib/cron-auth", () => ({ verifyCronRequest: () => ({ ok: true }) }))
vi.mock("@/lib/global-spend-guard", () => ({ isGlobalCeilingExceeded: async () => false }))
import { GET as processFeedbackJobs } from "@/app/api/cron/process-feedback-jobs/route"

const created: FirebaseFirestore.DocumentReference[] = []
const choice: NextPracticeRecommendation = {
  scenarioId: "dsa-next",
  title: "Next",
  type: "dsa",
  difficulty: "easy",
  estimatedMinutes: 10,
  href: "/interview?scenario=dsa-next&source=next-practice&fromSession=source",
  reason: "Shared pattern",
  focus: "Explain the invariant",
  focusSource: "score-breakdown",
}
beforeAll(() => {
  expect(process.env.FIRESTORE_EMULATOR_HOST).toMatch(/^(localhost|127\.0\.0\.1):\d+$/)
  expect(adminDb.projectId).toBe("codesparring-integration")
})
afterEach(async () => {
  await Promise.all(created.splice(0).map((ref) => adminDb.recursiveDelete(ref)))
  vi.clearAllMocks()
  vi.restoreAllMocks()
})
async function decision() {
  const userId = `funnel-${randomUUID()}`
  const recommendation = await attachRecommendationDecision(userId, "source", choice)
  expect(recommendation.decisionId).toMatch(/^[a-f0-9]{64}$/)
  const ref = recommendationDecisionRef(recommendation.decisionId!)
  created.push(ref)
  return { userId, recommendation, ref, decisionId: recommendation.decisionId! }
}
async function session(userId: string, fields: Record<string, unknown> = {}) {
  const ref = adminDb.collection("interview_sessions").doc(`funnel-${randomUUID()}`)
  created.push(ref)
  await ref.set({
    user_id: userId,
    scenario_id: choice.scenarioId,
    started_at: new Date().toISOString(),
    ...fields,
  })
  return ref
}
const events = () => vi.mocked(trackEventServer).mock.calls.map(([event]) => event)

it("registers concurrent reads as one immutable decision and keeps source/task/owner identities separate", async () => {
  const { userId, recommendation, ref } = await decision()
  const before = (await ref.get()).data()
  const reads = await Promise.all(
    Array.from({ length: 5 }, () => attachRecommendationDecision(userId, "source", choice))
  )
  expect(reads.every((read) => read.decisionId === recommendation.decisionId)).toBe(true)
  expect((await ref.get()).data()).toEqual(before)
  for (const [owner, source, task] of [
    [userId, "another-source", choice],
    ["other", "source", choice],
    [userId, "source", { ...choice, scenarioId: "another-task" }],
  ] as const) {
    const other = await attachRecommendationDecision(owner, source, task)
    created.push(recommendationDecisionRef(other.decisionId!))
    expect(other.decisionId).not.toBe(recommendation.decisionId)
  }
  expect(new URL(recommendation.href, "http://localhost").searchParams.get("decisionId")).toBe(
    recommendation.decisionId
  )
  expect(before).not.toHaveProperty("viewedAt")
})

it("deduplicates browser reports without inventing views or allowing foreign decisions", async () => {
  const { userId, decisionId, ref } = await decision()
  const clicked = { decisionId, stage: "clicked", returnSource: "feedback" }
  expect(await recordRecommendationInteraction("other", clicked)).toBe(false)
  await Promise.all([
    recordRecommendationInteraction(userId, clicked),
    recordRecommendationInteraction(userId, clicked),
  ])
  expect(events()).toEqual(["next_practice_clicked"])
  expect((await ref.get()).get("viewedAt")).toBeUndefined()
  await recordRecommendationInteraction(userId, { ...clicked, stage: "viewed" })
  expect(events()).toEqual(["next_practice_clicked", "next_practice_viewed"])
})

it("rejects forged/wrong-task attribution and ignores client-written pointers without accepted receipts", async () => {
  const { userId, decisionId, ref } = await decision()
  const target = await session(userId, { scenario_id: "wrong-task" })
  const input = { decisionId, sessionId: target.id, returnSource: "feedback" }
  await recordRecommendationStart(userId, "wrong-task", input)
  await target.update({ scenario_id: choice.scenarioId })
  await recordRecommendationStart("other", choice.scenarioId, input)
  await recordRecommendationStart(userId, choice.scenarioId, {
    ...input,
    decisionId: "f".repeat(64),
  })
  expect((await ref.get()).get("startedAt")).toBeUndefined()
  await target.update({
    recommendation_decision_id: decisionId,
    completed_at: new Date().toISOString(),
    feedback_status: "complete",
    performance_score: 90,
  })
  await recordRecommendationCompletion(userId, target.id)
  expect((await ref.get()).get("completedAt")).toBeUndefined()
  expect(events()).toEqual([])
})

it("records accepted start once, waits for final feedback, then reconciles retries once", async () => {
  const { userId, decisionId, ref } = await decision()
  const target = await session(userId)
  const input = { decisionId, sessionId: target.id, returnSource: "dashboard" }
  await Promise.all([
    recordRecommendationStart(userId, choice.scenarioId, input),
    recordRecommendationStart(userId, choice.scenarioId, input),
  ])
  expect((await target.get()).get("recommendation_decision_id")).toBe(decisionId)
  expect(events()).toEqual(["next_practice_started"])
  await target.update({
    completed_at: new Date().toISOString(),
    feedback_status: "processing",
    performance_score: 80,
  })
  await recordRecommendationCompletion(userId, target.id)
  expect((await ref.get()).get("completedAt")).toBeUndefined()
  created.push(adminDb.collection("user_stats").doc(userId))
  await persistFinalSession(target.id, userId, {
    feedback_status: "complete",
    feedback_source: "stream",
    feedback: "Final report",
  })
  await recordRecommendationCompletion("other", target.id)
  await Promise.all([
    recordRecommendationCompletion(userId, target.id),
    recordRecommendationCompletion(userId, target.id),
  ])
  expect(events()).toEqual(["next_practice_started", "next_practice_completed"])
  expect((await ref.get()).data()).toMatchObject({
    completedSessionId: target.id,
    performanceScore: 80,
  })
  expect(vi.mocked(trackEventServer).mock.calls.at(-1)?.[1]).toMatchObject({
    decision_id: decisionId,
    return_source: "dashboard",
    observation_source: "persisted-feedback",
  })
})

it("allows a later accepted attempt to complete an abandoned decision, including system design", async () => {
  const { userId, decisionId, ref } = await decision()
  const abandoned = await session(userId)
  const completed = await session(userId, { type: "system-design" })
  for (const target of [abandoned, completed])
    await recordRecommendationStart(userId, choice.scenarioId, {
      decisionId,
      sessionId: target.id,
      returnSource: "reminder",
    })
  await completed.update({
    completed_at: new Date().toISOString(),
    feedback_status: "complete",
    performance_score: 75,
  })
  await recordRecommendationCompletion(userId, completed.id)
  expect((await ref.get()).data()).toMatchObject({
    firstStartedSessionId: abandoned.id,
    completedSessionId: completed.id,
  })
  expect((await ref.collection("starts").get()).size).toBe(2)
  expect(events()).toEqual(["next_practice_started", "next_practice_completed"])
})

it("records completion when the background worker recovers queued feedback", async () => {
  const { userId, decisionId, ref } = await decision()
  const target = await session(userId)
  await recordRecommendationStart(userId, choice.scenarioId, {
    decisionId,
    sessionId: target.id,
    returnSource: "feedback",
  })
  await target.update({
    completed_at: new Date().toISOString(),
    feedback_status: "queued",
    feedback_score_frozen: true,
    performance_score: 70,
  })
  const job = adminDb.collection("feedback_jobs").doc(target.id)
  created.push(job, adminDb.collection("user_stats").doc(userId))
  await job.set({
    session_id: target.id,
    user_id: userId,
    scenario_type: "dsa",
    scenario_title: "Next",
    scenario_id: choice.scenarioId,
    status: "queued",
    attempt_count: 0,
    next_attempt_at: Timestamp.fromMillis(Date.now() - 1_000),
    scores: {
      overall: 70,
      understanding: 70,
      problemSolving: 70,
      codeQuality: 70,
      communication: 70,
    },
    system_prompt: "fixture only",
    user_prompt: "fixture only",
  })
  const response = await processFeedbackJobs(
    new NextRequest("http://localhost/api/cron/process-feedback-jobs")
  )
  expect(await response.json()).toMatchObject({ success: true, processed: 1 })
  expect((await target.get()).get("feedback_status")).toBe("complete")
  expect((await ref.get()).get("completedSessionId")).toBe(target.id)
  expect(events()).toEqual(["next_practice_started", "next_practice_completed"])
})

it("preserves practice availability when telemetry storage fails", async () => {
  const transaction = vi.spyOn(adminDb, "runTransaction")
  transaction.mockRejectedValueOnce(new Error("telemetry offline"))
  expect(await attachRecommendationDecision("owner", "source", choice)).toEqual(choice)
  transaction.mockRejectedValueOnce(new Error("telemetry offline"))
  await expect(
    recordRecommendationStart("owner", choice.scenarioId, {
      decisionId: "a".repeat(64),
      sessionId: "session",
      returnSource: "feedback",
    })
  ).resolves.toBeUndefined()
})
