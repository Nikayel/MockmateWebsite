import type { ScanCoverage } from "../../usage/scan-limits"

export type PaymentFeeSource = "stripe_actual" | "stripe_domestic_estimate"

export interface PaymentProcessingCost {
  costPerSubscriber: number
  domesticBaseline: number
  sampleSize: number
  source: PaymentFeeSource
}

export interface UnitEconomicsProjection {
  sessionsPerMonth: number
  variableSessionCost: number | null
  totalCost: number | null
  grossProfit: number | null
  grossMarginPercent: number | null
}

export interface SubscriptionUnitEconomics {
  period: { start: string; end: string }
  revenuePerSubscriber: number
  subscribers: {
    total: number
    withSessions: number
    monthly: number
    yearly: number
    enterprise: number
  }
  sessionsCounted: number
  averageSessionsPerSubscriber: number | null
  costs: {
    llmPerSession: number | null
    voicePerSession: number | null
    codeExecutionPerSession: 0
    otherAiPerSession: number | null
    paymentProcessing: PaymentProcessingCost
  }
  projections: UnitEconomicsProjection[]
  evidence: {
    llmEvents: number
    exactTokenEvents: number
    voiceEvents: number
    voiceSessions: number
    voiceMinutes: number
    executionArchitecture: "browser"
    eventsCoverage: ScanCoverage
    sessionsCoverage: ScanCoverage
  }
}
