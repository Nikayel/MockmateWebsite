/**
 * Platform-level AI spend health.
 *
 * The dashboard could tell you what was spent and by whom, but not the three
 * things you actually need on the way to a launch:
 *
 * - How close is the platform to its own kill switch? The global daily ceiling
 *   in lib/global-spend-guard.ts hard-stops all AI traffic, and nothing
 *   surfaced how near it was until it fired.
 * - Is anything anomalous right now? Anomalies were detected and written to
 *   Firestore, but only visible on a separate page.
 * - What does a session actually cost? Unit economics are the number that
 *   decides whether the pricing works, and the dashboard divided total spend by
 *   every account ever registered rather than by the ones that spent anything.
 *
 * Nothing here throws: a health panel that takes the page down with it is worse
 * than a health panel reporting that it could not read.
 */

import { getGlobalDailySpend, getGlobalDailyCeiling } from "../global-spend-guard"
import { getAnomalyStats } from "../cost-anomaly-detection"
import { logger } from "../logger"

/** Where today's platform-wide spend sits against the configured kill switch. */
export interface GlobalSpendStatus {
  /** Spend recorded so far today, UTC. */
  spendToday: number
  /** Configured ceiling. Zero means the guard is disabled. */
  ceiling: number
  /** Share of the ceiling consumed, or null when the guard is disabled. */
  usedPercent: number | null
  /** True when the guard is off, so no ceiling is being enforced at all. */
  disabled: boolean
  /** True once today's spend has reached the ceiling and traffic is being blocked. */
  exceeded: boolean
  /** True past 80%, the point worth acting on before the switch fires. */
  approaching: boolean
}

/** Cost per unit of work, the numbers that decide whether the pricing holds. */
export interface UnitEconomics {
  /** Total AI spend this period divided by sessions run in the scanned window. */
  costPerSession: number | null
  /** Total AI spend divided by the accounts that actually spent something. */
  costPerActiveUser: number | null
  /** Accounts that consumed AI this period. */
  activeUsers: number
  /** Sessions the cost-per-session figure was divided by. */
  sessionsCounted: number
}

export interface UsageHealth {
  globalSpend: GlobalSpendStatus
  anomalies: {
    unacknowledged: number
    last24Hours: number
    critical: number
    estimatedLoss: number
  } | null
  unitEconomics: UnitEconomics
}

const APPROACHING_CEILING_FRACTION = 0.8

/** Today's platform spend measured against the configured ceiling. */
export async function getGlobalSpendStatus(): Promise<GlobalSpendStatus> {
  const ceiling = getGlobalDailyCeiling()

  let spendToday = 0
  try {
    spendToday = await getGlobalDailySpend()
  } catch (error) {
    logger.error("[Usage Health] Failed to read global daily spend", { error })
  }

  if (ceiling <= 0) {
    return {
      spendToday,
      ceiling: 0,
      usedPercent: null,
      disabled: true,
      exceeded: false,
      approaching: false,
    }
  }

  const usedPercent = (spendToday / ceiling) * 100
  return {
    spendToday,
    ceiling,
    usedPercent,
    disabled: false,
    exceeded: spendToday >= ceiling,
    approaching: spendToday >= ceiling * APPROACHING_CEILING_FRACTION,
  }
}

/**
 * Cost per session and per active user.
 *
 * `sessionsCounted` comes from the bounded session scan, so cost per session is
 * only meaningful while that scan covers the same period as the spend. It is
 * returned alongside the figure so a caller can say what it was divided by
 * rather than presenting a bare number.
 */
export function calculateUnitEconomics(params: {
  totalCost: number
  activeUsers: number
  sessionsCounted: number
}): UnitEconomics {
  const { totalCost, activeUsers, sessionsCounted } = params
  return {
    costPerSession: sessionsCounted > 0 ? totalCost / sessionsCounted : null,
    costPerActiveUser: activeUsers > 0 ? totalCost / activeUsers : null,
    activeUsers,
    sessionsCounted,
  }
}

/** The whole health panel. Never throws. */
export async function getUsageHealth(params: {
  totalCost: number
  activeUsers: number
  sessionsCounted: number
}): Promise<UsageHealth> {
  const [globalSpend, anomalyStats] = await Promise.all([
    getGlobalSpendStatus(),
    getAnomalyStats().catch((error) => {
      logger.error("[Usage Health] Failed to read anomaly stats", { error })
      return null
    }),
  ])

  return {
    globalSpend,
    anomalies: anomalyStats
      ? {
          unacknowledged: anomalyStats.unacknowledged,
          last24Hours: anomalyStats.last24Hours,
          critical: anomalyStats.bySeverity.critical,
          estimatedLoss: anomalyStats.estimatedLoss,
        }
      : null,
    unitEconomics: calculateUnitEconomics(params),
  }
}
