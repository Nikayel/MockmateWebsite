"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  TrendingUp,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react"
import type { TTestResult, PredictionMetrics, SampleSizeAnalysis } from "@/lib/research/statistics"
import type { ExperimentReadiness } from "@/lib/research/readiness"
import type { EnhancedResearchAnalysis } from "@/lib/research/analyzer"

// ============================================
// Significance Test Card
// ============================================

interface SignificanceTestCardProps {
  title: string
  test: TTestResult | null
  description?: string
  /**
   * The family-wise correction for this metric, from the same readout that
   * drives the verdict banner.
   *
   * Without it this card called a metric "Significant" from its own
   * uncorrected p-value. Three metrics are tested together, so at alpha = 0.05
   * per test there is roughly a 14% chance that at least one of these badges
   * turns green on noise, and it could turn green while the banner above it
   * said no difference was detected. One page must not hold two answers.
   */
  correction?: { adjustedPValue: number | null; significant: boolean }
}

export function SignificanceTestCard({
  title,
  test,
  description,
  correction,
}: SignificanceTestCardProps) {
  if (!test) {
    return (
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Not enough data yet</p>
        </CardContent>
      </Card>
    )
  }

  const formatP = (p: number) => (p < 0.001 ? "< 0.001" : p.toFixed(4))
  // The corrected answer wins whenever it is available.
  const isSignificant = correction ? correction.significant : test.significant
  const pValueFormatted = formatP(test.pValue)

  return (
    <Card
      className={`border-gray-800 bg-gray-900/50 ${isSignificant ? "border-green-500/30" : ""}`}
    >
      <CardContent className="pt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-white">{title}</span>
          <Badge
            variant="outline"
            className={
              isSignificant ? "border-green-500 text-green-400" : "border-gray-600 text-gray-400"
            }
          >
            {isSignificant ? "Significant" : "Not Significant"}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">p-value{correction ? " (raw)" : ""}</span>
            <span
              className={
                correction ? "text-gray-300" : isSignificant ? "text-green-400" : "text-gray-300"
              }
            >
              {pValueFormatted}
            </span>
          </div>

          {correction && (
            <div className="flex justify-between">
              <span className="text-gray-400">Holm adjusted</span>
              <span className={isSignificant ? "text-green-400" : "text-gray-300"}>
                {correction.adjustedPValue === null ? "n/a" : formatP(correction.adjustedPValue)}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-gray-400">Effect Size</span>
            <span className="text-gray-300">
              {test.effectSize.toFixed(3)} ({test.effectSizeInterpretation})
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">t-statistic</span>
            <span className="text-gray-300">{test.tStatistic.toFixed(3)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Mean Difference</span>
            <span className={test.meanDifference > 0 ? "text-purple-400" : "text-blue-400"}>
              {test.meanDifference > 0 ? "+" : ""}
              {test.meanDifference.toFixed(2)}
              {test.meanDifference > 0 ? " (FSRS)" : " (SM-2)"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Power</span>
            <span className="text-gray-300">
              {(test.powerAnalysis.observedPower * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {description && <p className="mt-3 text-xs text-gray-500">{description}</p>}
      </CardContent>
    </Card>
  )
}

// ============================================
// Prediction Accuracy Panel
// ============================================

interface PredictionAccuracyPanelProps {
  sm2Metrics: PredictionMetrics
  fsrsMetrics: PredictionMetrics
  comparison: {
    logLossDifference: number
    winner: "sm2" | "fsrs" | "equal"
    improvement: number
  }
}

export function PredictionAccuracyPanel({
  sm2Metrics,
  fsrsMetrics,
  comparison,
}: PredictionAccuracyPanelProps) {
  const metrics = [
    {
      name: "Log Loss",
      sm2: sm2Metrics.logLoss,
      fsrs: fsrsMetrics.logLoss,
      format: (v: number) => v.toFixed(4),
      lowerBetter: true,
    },
    {
      name: "RMSE",
      sm2: sm2Metrics.rmse,
      fsrs: fsrsMetrics.rmse,
      format: (v: number) => v.toFixed(4),
      lowerBetter: true,
    },
    {
      name: "Accuracy",
      sm2: sm2Metrics.accuracy * 100,
      fsrs: fsrsMetrics.accuracy * 100,
      format: (v: number) => `${v.toFixed(1)}%`,
      lowerBetter: false,
    },
    {
      name: "Brier Score",
      sm2: sm2Metrics.brierScore,
      fsrs: fsrsMetrics.brierScore,
      format: (v: number) => v.toFixed(4),
      lowerBetter: true,
    },
    {
      name: "AUC-ROC",
      sm2: sm2Metrics.aucRoc,
      fsrs: fsrsMetrics.aucRoc,
      format: (v: number) => v.toFixed(3),
      lowerBetter: false,
    },
  ]

  return (
    <Card className="border-gray-700 bg-gradient-to-r from-gray-900/80 to-gray-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#c4703f]" />
          Prediction Accuracy Comparison
        </CardTitle>
        <CardDescription>How well each algorithm predicts user recall</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Winner Banner */}
        {comparison.winner !== "equal" && (
          <div
            className={`mb-4 rounded-lg p-3 ${
              comparison.winner === "fsrs" ? "bg-purple-500/10" : "bg-blue-500/10"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle
                className={`h-5 w-5 ${
                  comparison.winner === "fsrs" ? "text-purple-400" : "text-blue-400"
                }`}
              />
              <span className="font-medium text-white">
                {comparison.winner.toUpperCase()} has {comparison.improvement.toFixed(1)}% better
                prediction accuracy
              </span>
            </div>
          </div>
        )}

        {/* Metrics Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="pb-2 text-left text-gray-400">Metric</th>
                <th className="pb-2 text-center text-blue-400">SM-2</th>
                <th className="pb-2 text-center text-purple-400">FSRS</th>
                <th className="pb-2 text-right text-gray-400">Winner</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const sm2Better = m.lowerBetter ? m.sm2 < m.fsrs : m.sm2 > m.fsrs
                const equal = Math.abs(m.sm2 - m.fsrs) < 0.001
                const winner = equal ? "tie" : sm2Better ? "sm2" : "fsrs"

                return (
                  <tr key={m.name} className="border-b border-gray-800">
                    <td className="py-2 text-gray-300">{m.name}</td>
                    <td
                      className={`py-2 text-center ${winner === "sm2" ? "font-medium text-blue-400" : "text-gray-400"}`}
                    >
                      {m.format(m.sm2)}
                    </td>
                    <td
                      className={`py-2 text-center ${winner === "fsrs" ? "font-medium text-purple-400" : "text-gray-400"}`}
                    >
                      {m.format(m.fsrs)}
                    </td>
                    <td className="py-2 text-right">
                      {winner === "tie" ? (
                        <Minus className="ml-auto h-4 w-4 text-gray-500" />
                      ) : winner === "sm2" ? (
                        <Badge variant="outline" className="border-blue-500 text-blue-400">
                          SM-2
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-purple-500 text-purple-400">
                          FSRS
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Lower Log Loss and RMSE = better predictions. Higher Accuracy and AUC-ROC = better
          predictions.
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================
// Sample Size Analysis Panel
// ============================================

interface SampleSizeAnalysisPanelProps {
  analysis: SampleSizeAnalysis
}

export function SampleSizeAnalysisPanel({ analysis }: SampleSizeAnalysisPanelProps) {
  const progressToMinimum = Math.min(
    100,
    (analysis.totalSample / (analysis.minimumRequired * 2)) * 100
  )
  const progressToPower80 = Math.min(
    100,
    (analysis.totalSample / (analysis.recommendedForPower80 * 2)) * 100
  )

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-[#c4703f]" />
          Sample Size Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          {analysis.isSufficient ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400">Sufficient sample size</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <span className="text-yellow-400">Need more data</span>
            </>
          )}
        </div>

        {/* Counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded bg-blue-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{analysis.currentSampleSm2}</p>
            <p className="text-xs text-gray-400">SM-2 Users</p>
          </div>
          <div className="rounded bg-purple-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{analysis.currentSampleFsrs}</p>
            <p className="text-xs text-gray-400">FSRS Users</p>
          </div>
        </div>

        {/* Progress to targets */}
        <div className="space-y-2">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-gray-400">To Minimum ({analysis.minimumRequired}/group)</span>
              <span className="text-gray-300">{progressToMinimum.toFixed(0)}%</span>
            </div>
            <Progress value={progressToMinimum} className="h-2" />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-gray-400">
                To 80% Power ({analysis.recommendedForPower80}/group)
              </span>
              <span className="text-gray-300">{progressToPower80.toFixed(0)}%</span>
            </div>
            <Progress value={progressToPower80} className="h-2" />
          </div>
        </div>

        {/* Power */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Current Statistical Power</span>
          <span
            className={
              analysis.powerWithCurrentSample >= 0.8 ? "text-green-400" : "text-yellow-400"
            }
          >
            {(analysis.powerWithCurrentSample * 100).toFixed(0)}%
          </span>
        </div>

        {/* ETA */}
        {analysis.estimatedDaysToSufficient && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Est. Days to Sufficient</span>
            <span className="text-gray-300">{analysis.estimatedDaysToSufficient} days</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// Experiment Readiness Panel
// ============================================

/**
 * The panel that replaced "Research Quality Score /100".
 *
 * That score was a hand-assigned point ladder with a prose verdict on top
 * ("Research-grade quality - results are highly reliable"), and one of its
 * terms added 10 points whenever a test came back significant, so finding a
 * result raised the reported quality of the experiment that found it.
 *
 * Every row below is a single measured figure a reader can check against the
 * design. There is no total, because a total would need weights and there are
 * no defensible weights.
 */
interface ExperimentReadinessPanelProps {
  readiness: ExperimentReadiness
}

export function ExperimentReadinessPanel({ readiness }: ExperimentReadinessPanelProps) {
  const required = readiness.requiredUsersPerArm
  const powerPercent = readiness.powerAtCurrentSample * 100
  const observedShare = (readiness.observedControlShare * 100).toFixed(1)
  const expectedShare = (readiness.expectedControlShare * 100).toFixed(0)
  const formatP = (p: number) => (p < 0.0001 ? "< 0.0001" : p.toFixed(4))

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-[#c4703f]" />
          Experiment Readiness
        </CardTitle>
        <CardDescription>
          The measured figures that say whether this can be read yet. No composite score, because
          there is no defensible way to weight these against each other.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ReadinessRow
          label="Users with data in the window"
          value={`${readiness.usersControl} SM-2, ${readiness.usersTreatment} FSRS`}
        />

        <ReadinessRow
          label="Users needed per arm"
          value={required === null ? "Not computable yet" : String(required)}
          status={required === null ? "unknown" : readiness.meetsRequiredSample ? "ok" : "waiting"}
          note={
            required === null
              ? "The design's target effect has not produced a sample size."
              : readiness.meetsRequiredSample
                ? "Both arms have reached the planned sample."
                : `Short by ${Math.max(0, required - readiness.usersControl)} SM-2 and ${Math.max(0, required - readiness.usersTreatment)} FSRS users.`
          }
        />

        <ReadinessRow
          label="Power at the current sample"
          value={`${powerPercent.toFixed(0)}%`}
          status={readiness.powerAtCurrentSample >= 0.8 ? "ok" : "waiting"}
          note="The chance this sample would detect the effect the experiment was sized for."
        />

        <ReadinessRow
          label="Sample ratio check"
          value={readiness.sampleRatioMismatch ? "Mismatch" : "Passed"}
          status={readiness.sampleRatioMismatch ? "bad" : "ok"}
          note={`Assignment sent ${observedShare}% of users to SM-2 where the design says ${expectedShare}% (p = ${formatP(readiness.sampleRatioPValue)}).`}
        />

        <ReadinessRow
          label="Declared metrics tested"
          value={`${readiness.testsRun} of ${readiness.declaredTests}`}
          status={
            readiness.testsRun === readiness.declaredTests
              ? "ok"
              : readiness.testsRun === 0
                ? "bad"
                : "waiting"
          }
          note="A metric is only tested once both arms clear the minimum users per arm."
        />
      </CardContent>
    </Card>
  )
}

function ReadinessRow({
  label,
  value,
  status,
  note,
}: {
  label: string
  value: string
  status?: "ok" | "waiting" | "bad" | "unknown"
  note?: string
}) {
  const tone =
    status === "ok"
      ? "text-green-400"
      : status === "bad"
        ? "text-red-400"
        : status === "waiting"
          ? "text-yellow-400"
          : "text-gray-300"

  const StatusIcon =
    status === "ok" ? CheckCircle : status === "bad" ? XCircle : status ? AlertTriangle : null

  return (
    <div className="rounded bg-gray-800/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-gray-400">{label}</span>
        <span className={`flex items-center gap-1.5 font-medium ${tone}`}>
          {StatusIcon && <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
          {value}
        </span>
      </div>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
    </div>
  )
}

// ============================================
// Recommendations Panel
// ============================================

interface RecommendationsPanelProps {
  recommendations: EnhancedResearchAnalysis["recommendations"]
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "border-red-500 bg-red-500/10"
      case "medium":
        return "border-yellow-500 bg-yellow-500/10"
      case "low":
        return "border-gray-500 bg-gray-500/10"
    }
  }

  const getPriorityBadge = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-500 text-black">Medium</Badge>
      case "low":
        return (
          <Badge variant="outline" className="border-gray-500">
            Low
          </Badge>
        )
    }
  }

  return (
    <Card className="border-gray-700 bg-gradient-to-r from-gray-900/80 to-gray-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#c4703f]" />
          Research Recommendations
        </CardTitle>
        <CardDescription>Actionable insights based on current data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length === 0 ? (
          <p className="text-gray-400">No recommendations at this time.</p>
        ) : (
          recommendations.map((rec, i) => (
            <div key={i} className={`rounded-lg border p-4 ${getPriorityColor(rec.priority)}`}>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="font-medium text-white">{rec.title}</h4>
                {getPriorityBadge(rec.priority)}
              </div>
              <p className="text-sm text-gray-300">{rec.description}</p>
              {rec.action && (
                <p className="mt-2 text-sm text-[#c4703f]">
                  <strong>Action:</strong> {rec.action}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
