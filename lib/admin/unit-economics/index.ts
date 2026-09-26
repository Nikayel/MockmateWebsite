import { getMonthlyPrice } from "../../pricing"
import { utcMonthStart } from "../../usage-tracking"
import { calculateMarginProjections, costPerSession } from "./calculator"
import { getPaymentProcessingCost } from "./payment-fees"
import type { SubscriptionUnitEconomics } from "./types"
import { getSubscriberUsageMeasurements } from "./usage"

export async function getSubscriptionUnitEconomics(
  now: Date = new Date()
): Promise<SubscriptionUnitEconomics> {
  const startDate = utcMonthStart(now)
  const revenuePerSubscriber = getMonthlyPrice("pro")
  const [usage, paymentProcessing] = await Promise.all([
    getSubscriberUsageMeasurements(startDate, now),
    getPaymentProcessingCost({ chargeAmount: revenuePerSubscriber, startDate, endDate: now }),
  ])

  const llmPerSession = costPerSession(usage.llmCost, usage.sessionsCounted)
  const voicePerSession = costPerSession(usage.voiceCost, usage.sessionsCounted)
  const otherAiPerSession = costPerSession(usage.otherAiCost, usage.sessionsCounted)
  const codeExecutionPerSession = 0 as const

  return {
    period: { start: startDate.toISOString(), end: now.toISOString() },
    revenuePerSubscriber,
    subscribers: usage.subscribers,
    sessionsCounted: usage.sessionsCounted,
    averageSessionsPerSubscriber:
      usage.subscribers.total > 0 ? usage.sessionsCounted / usage.subscribers.total : null,
    costs: {
      llmPerSession,
      voicePerSession,
      codeExecutionPerSession,
      otherAiPerSession,
      paymentProcessing,
    },
    projections: calculateMarginProjections({
      revenuePerSubscriber,
      paymentProcessingCost: paymentProcessing.costPerSubscriber,
      perSessionCosts: [llmPerSession, voicePerSession, codeExecutionPerSession, otherAiPerSession],
    }),
    evidence: {
      llmEvents: usage.llmEvents,
      exactTokenEvents: usage.exactTokenEvents,
      voiceEvents: usage.voiceEvents,
      voiceSessions: usage.voiceSessions,
      voiceMinutes: usage.voiceMinutes,
      executionArchitecture: "browser",
      eventsCoverage: usage.eventsCoverage,
      sessionsCoverage: usage.sessionsCoverage,
    },
  }
}

export type { SubscriptionUnitEconomics } from "./types"
