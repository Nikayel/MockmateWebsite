import "server-only"
import { randomUUID } from "node:crypto"
import { adminDb } from "@/lib/firebase-admin"
import { getNextPractice } from "@/lib/agents/recommendations/next-practice.server"
import { scenarios } from "@/lib/scenarios"
import type { InterviewSession } from "@/lib/types"
import { practiceObservations } from "./progress"
import {
  completedPractice,
  practicePlanRef,
  readPracticePlan,
  updatePracticePlan,
} from "./repository"
import {
  PracticePlanError,
  practicePlanSchema,
  type SavePracticeRequest,
  type PracticePlan,
  type PracticePlanResponse,
} from "./schema"

const sameRequest = (plan: PracticePlan, request: SavePracticeRequest) =>
  plan.sourceSessionId === request.sourceSessionId &&
  plan.recommendation.scenarioId === request.scenarioId &&
  plan.reminderAt === request.reminderAt &&
  plan.timezone === request.timezone

export async function savePracticePlan(
  userId: string,
  request: SavePracticeRequest,
  now = new Date()
): Promise<PracticePlanResponse> {
  const existing = await readPracticePlan(userId)
  if (existing && sameRequest(existing, request)) return { status: "ready", plan: existing }
  if (request.reminderAt) {
    const delay = Date.parse(request.reminderAt) - now.getTime()
    if (delay < 60_000 || delay > 30 * 86_400_000)
      throw new PracticePlanError("Choose a reminder between one minute and 30 days from now.", 400)
    const profile = await adminDb.collection("profiles").doc(userId).get()
    if (!profile.exists || !profile.get("email"))
      throw new PracticePlanError("Add an email to your account, or save without a reminder.")
    if (
      profile.get("notification_preferences.email_notifications_enabled") === false ||
      profile.get("notification_preferences.inactivity_reminders") === false
    )
      throw new PracticePlanError(
        "Email reminders are disabled. Enable them in account settings, or save without a reminder."
      )
  }
  const result = await getNextPractice(userId, request.sourceSessionId)
  if (result.status !== "ready" || result.recommendation.scenarioId !== request.scenarioId)
    throw new PracticePlanError(
      "This recommendation has changed. Refresh the card to choose your next task."
    )
  const plan: PracticePlan = {
    userId,
    sourceSessionId: request.sourceSessionId,
    recommendation: result.recommendation,
    revision: randomUUID(),
    savedAt: now.toISOString(),
    reminderAt: request.reminderAt,
    timezone: request.timezone,
    reminderStatus: request.reminderAt ? "pending" : "none",
    nextAttemptAt: request.reminderAt,
    attempts: 0,
  }
  const saved = await adminDb.runTransaction(async (tx) => {
    const ref = practicePlanRef(userId)
    const snapshot = await tx.get(ref)
    const parsed = practicePlanSchema.safeParse(snapshot.data())
    if (parsed.success && sameRequest(parsed.data, request)) return parsed.data
    if ((parsed.success ? parsed.data.revision : null) !== (existing?.revision ?? null))
      throw new PracticePlanError(
        "Your saved task changed in another request. Refresh before saving again."
      )
    if (snapshot.get("reminderStatus") === "sending")
      throw new PracticePlanError("Your earlier reminder is being sent. Try saving again shortly.")
    tx.set(ref, plan)
    return plan
  })
  return { status: "ready", plan: saved }
}

export async function getSavedPractice(userId: string): Promise<PracticePlanResponse> {
  const plan = await readPracticePlan(userId)
  if (!plan) return { status: "empty" }
  const source = await adminDb.collection("interview_sessions").doc(plan.sourceSessionId).get()
  if (
    !source.exists ||
    source.get("user_id") !== userId ||
    !scenarios.some((s) => s.id === plan.recommendation.scenarioId)
  ) {
    await updatePracticePlan(plan, { reminderStatus: "cancelled", nextAttemptAt: null })
    return { status: "empty" }
  }
  const completed = await completedPractice(plan)
  if (!completed) return { status: "ready", plan }
  if (plan.reminderStatus === "pending")
    await updatePracticePlan(plan, { reminderStatus: "cancelled", nextAttemptAt: null })
  return {
    status: "complete",
    plan,
    completedSessionId: completed.id,
    observations: practiceObservations(
      { ...source.data(), id: source.id } as InterviewSession,
      completed
    ),
  }
}

export async function removePracticePlan(userId: string, revision: string): Promise<void> {
  await adminDb.runTransaction(async (tx) => {
    const ref = practicePlanRef(userId)
    const current = await tx.get(ref)
    if (!current.exists) return
    if (current.get("revision") !== revision)
      throw new PracticePlanError("Your saved task has changed. Refresh before removing it.")
    if (current.get("reminderStatus") === "sending")
      throw new PracticePlanError(
        "Your reminder is being sent. Try removing the task again shortly."
      )
    tx.delete(ref)
  })
}
