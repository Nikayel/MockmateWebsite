"use client"

/**
 * The banner the founder reads to decide which algorithm wins.
 *
 * It replaces a card that printed "With {confidence}% confidence" from
 * `Math.min(95, 60 + wins * 7)`. Every number here now comes from a test, and
 * when the sample cannot support a conclusion the panel says so and prints no
 * number at all.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Activity, AlertTriangle, ShieldAlert, Info } from "lucide-react"
import {
  formatPValue,
  type ExperimentReadout,
  type MetricReadout,
} from "@/lib/research/experiment-readout"

interface ExperimentReadoutPanelProps {
  readout: ExperimentReadout
}

function verdictStyle(verdict: ExperimentReadout["verdict"]) {
  switch (verdict) {
    case "fsrs_better":
      return {
        border: "border-purple-500/50 bg-purple-500/10",
        icon: Award,
        tone: "text-yellow-400",
      }
    case "sm2_better":
      return { border: "border-blue-500/50 bg-blue-500/10", icon: Award, tone: "text-yellow-400" }
    case "invalid_split":
      return { border: "border-red-500/50 bg-red-500/10", icon: ShieldAlert, tone: "text-red-400" }
    case "not_enough_data":
      return { border: "border-gray-700 bg-gray-800/50", icon: Info, tone: "text-gray-400" }
    default:
      return { border: "border-gray-700 bg-gray-800/50", icon: Activity, tone: "text-gray-400" }
  }
}

function formatValue(value: number, unit: MetricReadout["unit"]): string {
  return unit === "proportion" ? `${(value * 100).toFixed(1)}%` : value.toFixed(1)
}

function formatDelta(value: number, unit: MetricReadout["unit"]): string {
  const scaled = unit === "proportion" ? value * 100 : value
  return `${scaled >= 0 ? "+" : ""}${scaled.toFixed(1)}${unit === "proportion" ? " pts" : ""}`
}

export function ExperimentReadoutPanel({ readout }: ExperimentReadoutPanelProps) {
  const style = verdictStyle(readout.verdict)
  const Icon = style.icon
  const { sample, sampleRatio, design } = readout

  return (
    <div className="space-y-4">
      <Card className={`border-2 ${style.border}`}>
        <CardContent className="space-y-3 py-6">
          <div className="flex items-start gap-4">
            <Icon className={`mt-1 h-8 w-8 shrink-0 ${style.tone}`} />
            <div className="space-y-1">
              <p className="text-xl font-bold text-white">{readout.headline}</p>
              <p className="text-sm text-gray-300">{readout.detail}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="border-gray-700 text-gray-300">
              Primary metric: {readout.primary.label}
            </Badge>
            <Badge variant="outline" className="border-gray-700 text-gray-300">
              {sample.usersControl} SM-2 vs {sample.usersTreatment} FSRS users in window
            </Badge>
            <Badge
              variant="outline"
              className={
                sampleRatio.mismatch
                  ? "border-red-500 text-red-400"
                  : "border-green-600 text-green-400"
              }
            >
              SRM check: {sampleRatio.mismatch ? "failed" : "passed"} (p ={" "}
              {formatPValue(sampleRatio.pValue)})
            </Badge>
            <Badge variant="outline" className="border-gray-700 text-gray-300">
              Correction: Holm across {design.familyMetrics.length} metrics
            </Badge>
          </div>

          {readout.window.truncated && (
            <div className="flex items-center gap-2 rounded bg-yellow-500/10 px-3 py-2 text-sm text-yellow-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              The window hit the read cap, so it holds only part of the period. Treat these numbers
              as provisional.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MetricCard metric={readout.primary} />
        {readout.secondary.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-base">Experiment design and sensitivity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DesignFact
              label="Assignment split"
              value={`${sampleRatio.nControl} SM-2 / ${sampleRatio.nTreatment} FSRS`}
            />
            <DesignFact
              label="Users needed per arm"
              value={
                sample.usersNeededPerArm
                  ? `${sample.usersNeededPerArm} for d = ${design.targetEffectSize}`
                  : "Not computable"
              }
            />
            <DesignFact
              label="Smallest effect detectable now"
              value={
                sample.minimumDetectableEffect
                  ? `d = ${sample.minimumDetectableEffect.toFixed(2)} at ${Math.round(design.power * 100)}% power`
                  : "Not enough users yet"
              }
            />
            <DesignFact
              label="Activation guardrail"
              value={
                readout.activation && readout.activation.approximationValid
                  ? `${(readout.activation.proportionControl * 100).toFixed(1)}% vs ${(readout.activation.proportionTreatment * 100).toFixed(1)}% reviewed (p = ${formatPValue(readout.activation.pValue)})`
                  : "Too few users to test"
              }
            />
          </div>

          {sample.usersWithMixedAssignment > 0 && (
            <p className="text-xs text-yellow-400">
              {sample.usersWithMixedAssignment} users appeared under both algorithms in this window
              and were excluded. A randomized user should stay in one arm.
            </p>
          )}

          <p className="text-xs text-gray-500">
            Stopping rule: {design.stoppingRule} Window:{" "}
            {new Date(readout.window.start).toLocaleDateString()} to{" "}
            {new Date(readout.window.end).toLocaleDateString()}, {readout.window.eventsAnalyzed}{" "}
            reviews collapsed to one observation per user.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function DesignFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-gray-800/50 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-sm text-gray-200">{value}</p>
    </div>
  )
}

function MetricCard({ metric }: { metric: MetricReadout }) {
  const { test } = metric

  return (
    <Card
      className={`border-gray-800 bg-gray-900/50 ${metric.isPrimary ? "ring-1 ring-[#c4703f]/40" : ""}`}
    >
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">{metric.label}</span>
          {metric.isPrimary ? (
            <Badge className="bg-[#c4703f] text-white">Primary</Badge>
          ) : (
            <Badge variant="outline" className="border-gray-700 text-gray-400">
              Secondary
            </Badge>
          )}
        </div>

        {!test ? (
          <div className="space-y-1">
            <p className="text-sm text-gray-300">Not enough data yet</p>
            <p className="text-xs text-gray-500">{metric.unavailableReason}</p>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-blue-500/20 bg-blue-500/10 p-2 text-center">
                <p className="text-xs text-blue-400">SM-2 (n = {test.nControl})</p>
                <p className="font-bold text-white">{formatValue(test.meanControl, metric.unit)}</p>
              </div>
              <div className="rounded border border-purple-500/20 bg-purple-500/10 p-2 text-center">
                <p className="text-xs text-purple-400">FSRS (n = {test.nTreatment})</p>
                <p className="font-bold text-white">
                  {formatValue(test.meanTreatment, metric.unit)}
                </p>
              </div>
            </div>

            <Row
              label="Difference"
              value={`${formatDelta(test.meanDifference, metric.unit)} (${formatDelta(test.differenceInterval.lower, metric.unit)} to ${formatDelta(test.differenceInterval.upper, metric.unit)})`}
            />
            <Row
              label="Effect size d"
              value={`${test.effectSize.d.toFixed(2)} (${test.effectSize.interval.lower.toFixed(2)} to ${test.effectSize.interval.upper.toFixed(2)}), ${test.effectSize.label}`}
            />
            <Row label="p-value" value={formatPValue(test.pValue)} />
            <Row
              label="Holm adjusted"
              value={metric.adjustedPValue === null ? "n/a" : formatPValue(metric.adjustedPValue)}
              highlight={metric.significant}
            />
            <p className="text-xs text-gray-500">{metric.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400">{label}</span>
      <span className={highlight ? "text-right text-green-400" : "text-right text-gray-300"}>
        {value}
      </span>
    </div>
  )
}
