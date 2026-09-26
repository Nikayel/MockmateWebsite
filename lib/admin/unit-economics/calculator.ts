import type { UnitEconomicsProjection } from "./types"

export const UNIT_ECONOMICS_SESSION_SCENARIOS = [5, 10, 20] as const

export function costPerSession(totalCost: number, sessionsCounted: number): number | null {
  return sessionsCounted > 0 ? totalCost / sessionsCounted : null
}

export function calculateMarginProjections(params: {
  revenuePerSubscriber: number
  paymentProcessingCost: number
  perSessionCosts: Array<number | null>
}): UnitEconomicsProjection[] {
  const { revenuePerSubscriber, paymentProcessingCost, perSessionCosts } = params
  const hasCompleteSessionCost = perSessionCosts.every((cost) => cost !== null)
  const costPerSession = hasCompleteSessionCost
    ? (perSessionCosts as number[]).reduce((total, cost) => total + cost, 0)
    : null

  return UNIT_ECONOMICS_SESSION_SCENARIOS.map((sessionsPerMonth) => {
    if (costPerSession === null || revenuePerSubscriber <= 0) {
      return {
        sessionsPerMonth,
        variableSessionCost: null,
        totalCost: null,
        grossProfit: null,
        grossMarginPercent: null,
      }
    }

    const variableSessionCost = costPerSession * sessionsPerMonth
    const totalCost = paymentProcessingCost + variableSessionCost
    const grossProfit = revenuePerSubscriber - totalCost

    return {
      sessionsPerMonth,
      variableSessionCost,
      totalCost,
      grossProfit,
      grossMarginPercent: (grossProfit / revenuePerSubscriber) * 100,
    }
  })
}
