import { Timestamp } from "firebase-admin/firestore"
import { adminDb } from "../../firebase-admin"
import { classifyBillingState } from "../subscription-state"
import { readNumber } from "../../usage/event-totals"
import { USAGE_EVENT_SCAN_LIMIT, describeCoverage } from "../../usage/scan-limits"

const SUBSCRIBER_SESSION_SCAN_LIMIT = 10_000

export interface SubscriberUsageMeasurements {
  subscribers: {
    total: number
    withSessions: number
    monthly: number
    yearly: number
    enterprise: number
  }
  sessionsCounted: number
  llmCost: number
  voiceCost: number
  otherAiCost: number
  llmEvents: number
  exactTokenEvents: number
  voiceEvents: number
  voiceSessions: number
  voiceMinutes: number
  eventsCoverage: ReturnType<typeof describeCoverage>
  sessionsCoverage: ReturnType<typeof describeCoverage>
}

export async function getSubscriberUsageMeasurements(
  startDate: Date,
  endDate: Date
): Promise<SubscriberUsageMeasurements> {
  const [profilesSnapshot, sessionsSnapshot, eventsSnapshot] = await Promise.all([
    adminDb
      .collection("profiles")
      .select("subscription_tier", "subscription_status", "subscription_type")
      .get(),
    adminDb
      .collection("interview_sessions")
      .where("created_at", ">=", startDate.toISOString())
      .where("created_at", "<", endDate.toISOString())
      .orderBy("created_at", "desc")
      .limit(SUBSCRIBER_SESSION_SCAN_LIMIT)
      .get(),
    adminDb
      .collection("usage_events")
      .where("createdAt", ">=", Timestamp.fromDate(startDate))
      .where("createdAt", "<", Timestamp.fromDate(endDate))
      .orderBy("createdAt", "desc")
      .limit(USAGE_EVENT_SCAN_LIMIT)
      .get(),
  ])

  const billingUserIds = new Set<string>()
  let monthly = 0
  let yearly = 0
  let enterprise = 0

  for (const profileDoc of profilesSnapshot.docs) {
    const state = classifyBillingState({ userId: profileDoc.id, ...profileDoc.data() })
    if (state.kind !== "billing") continue
    billingUserIds.add(profileDoc.id)
    if (state.tier === "enterprise") enterprise++
    else if (state.interval === "yearly") yearly++
    else monthly++
  }

  const subscriberSessions = sessionsSnapshot.docs.filter((doc) =>
    billingUserIds.has(doc.data().user_id)
  )
  const subscribersWithSessions = new Set(
    subscriberSessions.map((doc) => doc.data().user_id as string)
  )

  let llmCost = 0
  let voiceCost = 0
  let otherAiCost = 0
  let llmEvents = 0
  let exactTokenEvents = 0
  let voiceEvents = 0
  let voiceSeconds = 0
  const voiceSessionIds = new Set<string>()

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data()
    if (!billingUserIds.has(event.userId)) continue

    if (event.eventType === "voice_transcription") {
      voiceCost += readNumber(event.cost)
      voiceEvents++
      voiceSeconds += readNumber(event.metadata?.durationSeconds)
      if (typeof event.sessionId === "string" && event.sessionId) {
        voiceSessionIds.add(event.sessionId)
      }
      continue
    }

    if (event.eventType === "embedding_generation") {
      otherAiCost += readNumber(event.cost)
      continue
    }

    const isTelemetry =
      event.service === "session-telemetry" ||
      event.eventType === "session_start" ||
      event.eventType === "session_end"
    if (isTelemetry) continue

    llmCost += readNumber(event.cost)
    llmEvents++
    if (event.isExactTokenCount === true) exactTokenEvents++
  }

  return {
    subscribers: {
      total: billingUserIds.size,
      withSessions: subscribersWithSessions.size,
      monthly,
      yearly,
      enterprise,
    },
    sessionsCounted: subscriberSessions.length,
    llmCost,
    voiceCost,
    otherAiCost,
    llmEvents,
    exactTokenEvents,
    voiceEvents,
    voiceSessions: voiceSessionIds.size,
    voiceMinutes: voiceSeconds / 60,
    eventsCoverage: describeCoverage(eventsSnapshot.size, USAGE_EVENT_SCAN_LIMIT),
    sessionsCoverage: describeCoverage(sessionsSnapshot.size, SUBSCRIBER_SESSION_SCAN_LIMIT),
  }
}
