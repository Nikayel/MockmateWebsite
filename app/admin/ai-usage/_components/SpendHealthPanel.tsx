"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldOff, Activity } from "lucide-react"

/** How much of the underlying data an aggregate actually saw. */
export interface ScanCoverage {
  scanned: number
  limit: number
  truncated: boolean
}

export interface GlobalSpendStatus {
  spendToday: number
  ceiling: number
  usedPercent: number | null
  disabled: boolean
  exceeded: boolean
  approaching: boolean
}

export interface UsageHealth {
  globalSpend: GlobalSpendStatus
  anomalies: {
    unacknowledged: number
    last24Hours: number
    critical: number
    estimatedLoss: number
  } | null
  unitEconomics: {
    costPerSession: number | null
    costPerActiveUser: number | null
    activeUsers: number
    sessionsCounted: number
  }
}

function formatUsd(value: number, fractionDigits = 2): string {
  return `$${value.toFixed(fractionDigits)}`
}

/** Small money values need more precision than a dashboard's usual two places. */
function formatUnitCost(value: number | null): string {
  if (value === null) return "n/a"
  return value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`
}

/**
 * The global daily ceiling is a hard kill switch: once today's spend reaches
 * it, all AI traffic stops. Showing how close it is turns that from an outage
 * into a decision.
 */
function CeilingRow({ status }: { status: GlobalSpendStatus }) {
  if (status.disabled) {
    return (
      <div className="flex items-start gap-3">
        <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-white">No daily spend ceiling</p>
          <p className="text-xs text-gray-400">
            {formatUsd(status.spendToday)} spent today, with no cap enforced. Set
            GLOBAL_DAILY_SPEND_CEILING_USD to bound worst-case cost.
          </p>
        </div>
      </div>
    )
  }

  const percent = status.usedPercent ?? 0
  const tone = status.exceeded
    ? { Icon: ShieldAlert, color: "text-red-400", bar: "bg-red-500" }
    : status.approaching
      ? { Icon: ShieldAlert, color: "text-amber-400", bar: "bg-amber-500" }
      : { Icon: ShieldCheck, color: "text-green-400", bar: "bg-green-500" }

  return (
    <div className="flex items-start gap-3">
      <tone.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.color}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">
          {status.exceeded
            ? "Daily ceiling reached, AI traffic is blocked"
            : `${formatUsd(status.spendToday)} of ${formatUsd(status.ceiling)} today`}
        </p>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-800"
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Share of the daily spend ceiling used"
        >
          <div
            className={`h-full rounded-full ${tone.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">{percent.toFixed(1)}% of the daily ceiling</p>
      </div>
    </div>
  )
}

/**
 * Platform spend health: how close the kill switch is, whether anything is
 * anomalous, and what a session actually costs.
 */
export function SpendHealthPanel({
  health,
  coverage,
}: {
  health: UsageHealth
  coverage?: { anyTruncated: boolean; events: ScanCoverage; sessions: ScanCoverage }
}) {
  const { globalSpend, anomalies, unitEconomics } = health

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Activity className="h-5 w-5 text-[#c4703f]" aria-hidden="true" />
          Spend health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <CeilingRow status={globalSpend} />

        {anomalies && anomalies.unacknowledged > 0 && (
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                anomalies.critical > 0 ? "text-red-400" : "text-amber-400"
              }`}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-white">
                {anomalies.unacknowledged} unacknowledged cost{" "}
                {anomalies.unacknowledged === 1 ? "anomaly" : "anomalies"}
                {anomalies.critical > 0 ? ` (${anomalies.critical} critical)` : ""}
              </p>
              <p className="text-xs text-gray-400">
                {anomalies.last24Hours} in the last 24h, {formatUsd(anomalies.estimatedLoss)}{" "}
                estimated
              </p>
            </div>
          </div>
        )}

        {/* Unit economics: the numbers that decide whether the pricing holds. */}
        <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-4">
          <div>
            <p className="text-xs tracking-wide text-gray-500 uppercase">Cost per session</p>
            <p className="mt-1 font-mono text-lg text-green-400">
              {formatUnitCost(unitEconomics.costPerSession)}
            </p>
            <p className="text-xs text-gray-500">
              over {unitEconomics.sessionsCounted.toLocaleString()} sessions
            </p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-gray-500 uppercase">Cost per active user</p>
            <p className="mt-1 font-mono text-lg text-green-400">
              {formatUnitCost(unitEconomics.costPerActiveUser)}
            </p>
            <p className="text-xs text-gray-500">
              {unitEconomics.activeUsers.toLocaleString()} spent anything this month
            </p>
          </div>
        </div>

        {/* Every total on this page comes from a bounded scan. Say so when one
            of them hit its cap rather than presenting a partial month. */}
        {coverage?.anyTruncated && (
          <p className="border-t border-gray-800 pt-4 text-xs text-amber-400">
            Some figures are lower bounds: a scan hit its document cap (
            {coverage.events.limit.toLocaleString()} events,{" "}
            {coverage.sessions.limit.toLocaleString()} sessions) and older data was excluded.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
