"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react"
import type { TTestResult, PredictionMetrics, SampleSizeAnalysis } from "@/lib/research/statistics"
import type { EnhancedResearchAnalysis } from "@/lib/research/analyzer"

// ============================================
// Significance Test Card
// ============================================

interface SignificanceTestCardProps {
  title: string
  test: TTestResult | null
  description?: string
}

export function SignificanceTestCard({ title, test, description }: SignificanceTestCardProps) {
  if (!test) {
    return (
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Insufficient data</p>
        </CardContent>
      </Card>
    )
  }

  const isSignificant = test.significant
  const pValueFormatted = test.pValue < 0.001 ? "< 0.001" : test.pValue.toFixed(4)

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
            <span className="text-gray-400">p-value</span>
            <span className={isSignificant ? "text-green-400" : "text-gray-300"}>
              {pValueFormatted}
            </span>
          </div>

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
// Research Quality Score Panel
// ============================================

interface QualityScorePanelProps {
  qualityScore: EnhancedResearchAnalysis["qualityScore"]
}

export function QualityScorePanel({ qualityScore }: QualityScorePanelProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-blue-400"
    if (score >= 40) return "text-yellow-400"
    return "text-red-400"
  }

  const categories = [
    { name: "Sample Size", score: qualityScore.sampleSize, max: 25 },
    { name: "Statistical Power", score: qualityScore.statisticalPower, max: 25 },
    { name: "Data Quality", score: qualityScore.dataQuality, max: 25 },
    { name: "Consistency", score: qualityScore.consistency, max: 25 },
  ]

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle className="h-4 w-4 text-[#c4703f]" />
          Research Quality Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="text-center">
          <p className={`text-5xl font-bold ${getScoreColor(qualityScore.overall)}`}>
            {qualityScore.overall}
          </p>
          <p className="text-sm text-gray-400">out of 100</p>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.name}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-400">{cat.name}</span>
                <span className="text-gray-300">
                  {cat.score}/{cat.max}
                </span>
              </div>
              <Progress value={(cat.score / cat.max) * 100} className="h-1.5" />
            </div>
          ))}
        </div>

        {/* Interpretation */}
        <p className="text-sm text-gray-300">{qualityScore.interpretation}</p>
      </CardContent>
    </Card>
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
