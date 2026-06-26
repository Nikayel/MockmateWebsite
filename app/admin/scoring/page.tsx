"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetricCard } from "@/components/admin/charts"
import { DataTable, Column, renderBadge } from "@/components/admin/shared/DataTable"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Scale,
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Shield,
  MessageSquare,
  Target,
  Activity,
  Zap,
  BarChart3,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { logger } from "@/lib/logger"
import type {
  ConstitutionalAIStats,
  ConstitutionalAIIntervention,
  AnalyticsTimeSeriesPoint,
  ConflictSummary,
  CritiqueAspect,
} from "@/lib/scoring/analytics-types"

const ASPECT_COLORS: Record<CritiqueAspect, string> = {
  fairness: "#c4703f",
  tone: "#3fb883",
  accuracy: "#ff6b6b",
  actionability: "#ffd93d",
}

const ASPECT_LABELS: Record<CritiqueAspect, string> = {
  fairness: "Fairness",
  tone: "Tone",
  accuracy: "Accuracy",
  actionability: "Actionability",
}

interface ScoringAnalyticsData {
  stats: ConstitutionalAIStats
  timeSeries?: AnalyticsTimeSeriesPoint[]
  recentInterventions: ConstitutionalAIIntervention[]
}

export default function ScoringPage() {
  const { firebaseUser } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d")
  const [scenarioType, setScenarioType] = useState<"all" | "dsa" | "system_design" | "bug_fix">(
    "all"
  )
  const [data, setData] = useState<ScoringAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!firebaseUser) return

    setLoading(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const params = new URLSearchParams({
        timeRange,
        scenarioType,
        includeTimeSeries: "true",
        includeConflicts: "true",
      })

      const response = await fetch(`/api/admin/scoring?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || "Failed to load data")
      }
    } catch (err) {
      logger.error("Error loading scoring analytics", { error: err })
      setError("Failed to load scoring analytics")
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, timeRange, scenarioType])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`
  const formatScore = (value: number) => (value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1))

  // Prepare chart data
  const aspectPieData = data
    ? Object.entries(data.stats.scoreCritiqueStats.byAspect)
        .filter(([, count]) => count > 0)
        .map(([aspect, count]) => ({
          name: ASPECT_LABELS[aspect as CritiqueAspect],
          value: count,
          color: ASPECT_COLORS[aspect as CritiqueAspect],
        }))
    : []

  const categoryBarData = data
    ? Object.entries(data.stats.categoryStats).map(([category, stats]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, " $1"),
        increases: stats.totalIncreases,
        decreases: -stats.totalDecreases,
        avgIncrease: stats.avgIncrease,
        avgDecrease: -stats.avgDecrease,
      }))
    : []

  // Intervention table columns
  const interventionColumns: Column<ConstitutionalAIIntervention>[] = [
    {
      key: "scenarioTitle",
      label: "Problem",
      render: (_, row) => (
        <div>
          <span className="text-sm text-white">{row.scenarioTitle}</span>
          <div className="mt-1">
            <Badge variant="outline" className="border-gray-700 text-xs text-gray-400 capitalize">
              {row.scenarioType.replace("_", " ")}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: "scoreCritique",
      label: "Score Critique",
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          {row.scoreCritique.madeChanges ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={row.scoreCritique.overallDelta > 0 ? "text-green-400" : "text-red-400"}
                >
                  {row.scoreCritique.overallDelta > 0 ? (
                    <TrendingUp className="inline h-4 w-4" />
                  ) : (
                    <TrendingDown className="inline h-4 w-4" />
                  )}
                  {formatScore(row.scoreCritique.overallDelta)}
                </span>
                <span className="text-xs text-gray-500">
                  ({row.scoreCritique.originalOverall} → {row.scoreCritique.adjustedOverall})
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {row.scoreCritique.aspectsViolated.map((aspect) => (
                  <Badge
                    key={aspect}
                    className="text-xs"
                    style={{
                      backgroundColor: `${ASPECT_COLORS[aspect]}20`,
                      color: ASPECT_COLORS[aspect],
                      borderColor: `${ASPECT_COLORS[aspect]}50`,
                    }}
                  >
                    {ASPECT_LABELS[aspect]}
                  </Badge>
                ))}
              </div>
            </>
          ) : (
            <span className="text-sm text-gray-500">No changes</span>
          )}
        </div>
      ),
    },
    {
      key: "feedbackCritique",
      label: "Feedback Critique",
      render: (_, row) =>
        row.feedbackCritique.madeChanges ? (
          <div className="flex flex-wrap gap-1">
            {row.feedbackCritique.aspectsViolated.map((aspect) => (
              <Badge
                key={aspect}
                className="text-xs"
                style={{
                  backgroundColor: `${ASPECT_COLORS[aspect]}20`,
                  color: ASPECT_COLORS[aspect],
                  borderColor: `${ASPECT_COLORS[aspect]}50`,
                }}
              >
                {ASPECT_LABELS[aspect]}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-500">No changes</span>
        ),
    },
    {
      key: "context",
      label: "Context",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.context.silentSolution && (
            <Badge className="border-orange-600/30 bg-orange-600/20 text-xs text-orange-400">
              Silent
            </Badge>
          )}
          {row.context.codeIncomplete && (
            <Badge className="border-red-600/30 bg-red-600/20 text-xs text-red-400">
              Incomplete
            </Badge>
          )}
          {row.scoreCritique.evidenceFloorApplied && (
            <Badge className="border-blue-600/30 bg-blue-600/20 text-xs text-blue-400">
              Floor Applied
            </Badge>
          )}
          <span className="text-xs text-gray-500">{row.context.testPassRate}% pass</span>
        </div>
      ),
    },
    {
      key: "timestamp",
      label: "Time",
      align: "right",
      render: (value) => (
        <span className="text-sm text-gray-400">{new Date(value).toLocaleDateString()}</span>
      ),
    },
  ]

  // Conflict table columns
  const conflictColumns: Column<ConflictSummary>[] = [
    {
      key: "scenarioTitle",
      label: "Problem",
      render: (value) => <span className="text-sm text-white">{value}</span>,
    },
    {
      key: "conflictType",
      label: "Type",
      render: (value: CritiqueAspect) => (
        <Badge
          style={{
            backgroundColor: `${ASPECT_COLORS[value]}20`,
            color: ASPECT_COLORS[value],
            borderColor: `${ASPECT_COLORS[value]}50`,
          }}
        >
          {ASPECT_LABELS[value]}
        </Badge>
      ),
    },
    {
      key: "delta",
      label: "Score Change",
      align: "center",
      render: (value, row) => (
        <div className="flex items-center justify-center gap-2">
          <span className={value > 0 ? "text-green-400" : "text-red-400"}>
            {value > 0 ? (
              <TrendingUp className="inline h-4 w-4" />
            ) : (
              <TrendingDown className="inline h-4 w-4" />
            )}
            {formatScore(value)}
          </span>
          <span className="text-xs text-gray-500">
            ({row.originalScore} → {row.adjustedScore})
          </span>
        </div>
      ),
    },
    {
      key: "description",
      label: "Reason",
      render: (value) => (
        <span className="block max-w-xs truncate text-sm text-gray-400">{value}</span>
      ),
    },
    {
      key: "timestamp",
      label: "Time",
      align: "right",
      render: (value) => (
        <span className="text-sm text-gray-400">
          {new Date(value as string).toLocaleDateString()}
        </span>
      ),
    },
  ]

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#c4703f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Scoring Analytics</h1>
          <p className="mt-1 text-gray-400">Constitutional AI and scoring system performance</p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={scenarioType}
            onValueChange={(v) => setScenarioType(v as typeof scenarioType)}
          >
            <SelectTrigger className="w-40 border-gray-700 bg-gray-800 text-white">
              <SelectValue placeholder="Scenario Type" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-800">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="dsa">DSA</SelectItem>
              <SelectItem value="system_design">System Design</SelectItem>
              <SelectItem value="bug_fix">Bug Fix</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-32 border-gray-700 bg-gray-800 text-white">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-800">
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {data && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="border border-gray-700 bg-gray-800/50 p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#c4703f] data-[state=active]:text-black"
            >
              <Scale className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="interventions"
              className="data-[state=active]:bg-[#c4703f] data-[state=active]:text-black"
            >
              <Brain className="mr-2 h-4 w-4" />
              Interventions
            </TabsTrigger>
            <TabsTrigger
              value="conflicts"
              className="data-[state=active]:bg-[#c4703f] data-[state=active]:text-black"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Conflicts
            </TabsTrigger>
            <TabsTrigger
              value="trends"
              className="data-[state=active]:bg-[#c4703f] data-[state=active]:text-black"
            >
              <Activity className="mr-2 h-4 w-4" />
              Trends
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <MetricCard
                title="Total Sessions"
                value={data.stats.totalSessions}
                subtitle="With scoring"
                icon={Target}
              />
              <MetricCard
                title="AI Accuracy"
                value={formatPercentage(data.stats.scoreAccuracy.accuracyRate)}
                subtitle="Correct initial scores"
                icon={CheckCircle}
                valueColor={
                  data.stats.scoreAccuracy.accuracyRate >= 80
                    ? "text-green-400"
                    : data.stats.scoreAccuracy.accuracyRate >= 60
                      ? "text-yellow-400"
                      : "text-red-400"
                }
              />
              <MetricCard
                title="Score Changes"
                value={data.stats.scoreCritiqueStats.totalChanges}
                subtitle={formatPercentage(data.stats.scoreCritiqueStats.changeRate) + " rate"}
                icon={Scale}
                iconColor="text-purple-400"
              />
              <MetricCard
                title="Feedback Changes"
                value={data.stats.feedbackCritiqueStats.totalChanges}
                subtitle={formatPercentage(data.stats.feedbackCritiqueStats.changeRate) + " rate"}
                icon={MessageSquare}
                iconColor="text-orange-400"
              />
            </div>

            {/* Score Adjustment Stats */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border-gray-800 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    Score Adjustments
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    How Constitutional AI modifies initial scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-green-600/30 bg-green-900/20 p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">
                        +{data.stats.scoreCritiqueStats.avgScoreIncrease.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-400">Avg Increase</div>
                    </div>
                    <div className="rounded-lg border border-red-600/30 bg-red-900/20 p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">
                        -{data.stats.scoreCritiqueStats.avgScoreDecrease.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-400">Avg Decrease</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-gray-800/50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Evidence Floor Applied</span>
                      <span className="font-medium text-blue-400">
                        {data.stats.scoreCritiqueStats.evidenceFloorApplied} times
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Aspects Pie Chart */}
              <Card className="border-gray-800 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-white">
                    <Shield className="h-5 w-5 text-[#c4703f]" />
                    Violations by Aspect
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Constitutional principles most often violated
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {aspectPieData.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={aspectPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {aspectPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#fff" }}
                          />
                          <Legend
                            formatter={(value) => <span className="text-gray-300">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-gray-500">
                      No violations recorded
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Category Adjustments */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <BarChart3 className="h-5 w-5 text-[#c4703f]" />
                  Adjustments by Category
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Score changes per grading category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9ca3af" />
                      <YAxis dataKey="category" type="category" stroke="#9ca3af" width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Bar dataKey="increases" fill="#3fb883" name="Increases" />
                      <Bar dataKey="decreases" fill="#ff6b6b" name="Decreases" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interventions Tab */}
          <TabsContent value="interventions">
            <DataTable
              title="Recent Interventions"
              description="Constitutional AI reviews and adjustments"
              icon={Brain}
              data={data.recentInterventions}
              columns={interventionColumns}
              keyExtractor={(row) => row.sessionId}
              loading={loading}
              onRefresh={loadData}
              emptyMessage="No interventions recorded yet"
            />
          </TabsContent>

          {/* Conflicts Tab */}
          <TabsContent value="conflicts">
            <DataTable
              title="Scoring Conflicts"
              description="Cases where Constitutional AI disagreed with initial scoring"
              icon={AlertTriangle}
              data={data.stats.conflicts}
              columns={conflictColumns}
              keyExtractor={(row) => `${row.sessionId}-${row.conflictType}`}
              loading={loading}
              onRefresh={loadData}
              emptyMessage="No conflicts recorded"
            />
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            {data.timeSeries && data.timeSeries.length > 0 ? (
              <>
                {/* Accuracy Over Time */}
                <Card className="border-gray-800 bg-gray-900/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">AI Accuracy Over Time</CardTitle>
                    <CardDescription className="text-gray-400">
                      Percentage of initial scores that didn't need correction
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.timeSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9ca3af" />
                          <YAxis stroke="#9ca3af" domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#fff" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="accuracyRate"
                            stroke="#3fb883"
                            strokeWidth={2}
                            dot={{ fill: "#3fb883" }}
                            name="Accuracy %"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Intervention Volume */}
                <Card className="border-gray-800 bg-gray-900/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Intervention Volume</CardTitle>
                    <CardDescription className="text-gray-400">
                      Sessions analyzed and changes made over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.timeSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9ca3af" />
                          <YAxis stroke="#9ca3af" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#fff" }}
                          />
                          <Bar dataKey="totalSessions" fill="#374151" name="Total Sessions" />
                          <Bar dataKey="scoreCritiqueChanges" fill="#c4703f" name="Score Changes" />
                          <Bar
                            dataKey="feedbackCritiqueChanges"
                            fill="#ffd93d"
                            name="Feedback Changes"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Average Score Delta */}
                <Card className="border-gray-800 bg-gray-900/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Average Score Delta</CardTitle>
                    <CardDescription className="text-gray-400">
                      Net score adjustment per session (positive = scores raised)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.timeSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9ca3af" />
                          <YAxis stroke="#9ca3af" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                            }}
                            labelStyle={{ color: "#fff" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="avgScoreDelta"
                            stroke="#c4703f"
                            strokeWidth={2}
                            dot={{ fill: "#c4703f" }}
                            name="Avg Delta"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-gray-800 bg-gray-900/50">
                <div className="text-center text-gray-500">
                  <Activity className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No time series data available</p>
                  <p className="text-sm">Data will appear as sessions are scored</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
