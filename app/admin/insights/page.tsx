"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Users,
  MousePointerClick,
  CheckCircle,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  BarChart3,
  Zap,
  Clock,
  Target,
  Brain,
  Sparkles,
} from "lucide-react"

// Insight type display names and icons
const INSIGHT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> =
  {
    "critical-weakness": {
      label: "Critical Gap",
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-red-400",
    },
    "skill-decay": {
      label: "Skill Fading",
      icon: <TrendingDown className="h-4 w-4" />,
      color: "text-orange-400",
    },
    misconception: {
      label: "Fix Mistake",
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-amber-400",
    },
    "interview-hot": {
      label: "Interview Hot",
      icon: <Zap className="h-4 w-4" />,
      color: "text-red-400",
    },
    "weakness-practice": {
      label: "Focus Area",
      icon: <Target className="h-4 w-4" />,
      color: "text-blue-400",
    },
    "spaced-review": {
      label: "Review Time",
      icon: <Clock className="h-4 w-4" />,
      color: "text-purple-400",
    },
    "strength-challenge": {
      label: "Challenge",
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-green-400",
    },
    "new-pattern": {
      label: "New Pattern",
      icon: <Sparkles className="h-4 w-4" />,
      color: "text-indigo-400",
    },
    warmup: { label: "Warmup", icon: <Brain className="h-4 w-4" />, color: "text-yellow-400" },
    "daily-practice": {
      label: "Daily Practice",
      icon: <BarChart3 className="h-4 w-4" />,
      color: "text-gray-400",
    },
  }

interface InsightStats {
  shown: number
  clicked: number
  completed: number
}

interface InsightEffectivenessData {
  global: {
    byInsightType: Record<string, InsightStats>
    mostEffective: string | null
    leastEffective: string | null
    totalInteractions: number
    overallClickThroughRate: number
    overallCompletionRate: number
  }
  topUsers: Array<{
    userId: string
    email?: string
    totalInteractions: number
    mostUsedInsightType: string | null
    completionRate: number
  }>
  recentTrends: {
    last7Days: { date: string; interactions: number }[]
    interactionsByType: Record<string, number>
  }
}

export default function InsightsEffectivenessPage() {
  const { firebaseUser } = useAuth()
  const [data, setData] = useState<InsightEffectivenessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!firebaseUser) return

    setLoading(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/insight-effectiveness", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [firebaseUser])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#00d9ff]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-400">{error}</p>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Lightbulb className="h-12 w-12 text-gray-600" />
        <p className="text-gray-400">
          No insight data yet. Users need to interact with recommendations.
        </p>
      </div>
    )
  }

  const { global, topUsers, recentTrends } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <Lightbulb className="h-7 w-7 text-[#00d9ff]" />
            Insight Effectiveness
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Track how well AI recommendations are helping users
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Interactions</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {global.totalInteractions.toLocaleString()}
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Click-Through Rate</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {(global.overallClickThroughRate * 100).toFixed(1)}%
                </p>
              </div>
              <MousePointerClick className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Completion Rate</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {(global.overallCompletionRate * 100).toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Most Effective</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {global.mostEffective
                    ? INSIGHT_TYPE_CONFIG[global.mostEffective]?.label || global.mostEffective
                    : "N/A"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="by-type" className="space-y-4">
        <TabsList className="bg-gray-800/50">
          <TabsTrigger value="by-type">By Insight Type</TabsTrigger>
          <TabsTrigger value="trends">Recent Trends</TabsTrigger>
          <TabsTrigger value="users">Top Users</TabsTrigger>
        </TabsList>

        {/* By Type Tab */}
        <TabsContent value="by-type" className="space-y-4">
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-lg text-white">Effectiveness by Insight Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(global.byInsightType)
                  .sort((a, b) => {
                    const aRate = a[1].clicked > 0 ? a[1].completed / a[1].clicked : 0
                    const bRate = b[1].clicked > 0 ? b[1].completed / b[1].clicked : 0
                    return bRate - aRate
                  })
                  .map(([type, stats]) => {
                    const config = INSIGHT_TYPE_CONFIG[type] || {
                      label: type,
                      icon: <Lightbulb className="h-4 w-4" />,
                      color: "text-gray-400",
                    }
                    const ctr = stats.shown > 0 ? (stats.clicked / stats.shown) * 100 : 0
                    const completionRate =
                      stats.clicked > 0 ? (stats.completed / stats.clicked) * 100 : 0

                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={config.color}>{config.icon}</div>
                          <div>
                            <p className="font-medium text-white">{config.label}</p>
                            <p className="text-xs text-gray-400">
                              {stats.shown} shown · {stats.clicked} clicked · {stats.completed}{" "}
                              completed
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-400">CTR</p>
                            <p className="font-mono text-sm text-white">{ctr.toFixed(1)}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">Completion</p>
                            <p
                              className={`font-mono text-sm ${completionRate > 50 ? "text-green-400" : completionRate > 20 ? "text-yellow-400" : "text-red-400"}`}
                            >
                              {completionRate.toFixed(1)}%
                            </p>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-700">
                            <div
                              className="h-full bg-gradient-to-r from-[#00d9ff] to-[#00ff88]"
                              style={{ width: `${Math.min(completionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                {Object.keys(global.byInsightType).length === 0 && (
                  <p className="py-8 text-center text-gray-500">
                    No insight type data available yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-lg text-white">Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-40 items-end gap-2">
                {recentTrends.last7Days.map((day, i) => {
                  const maxInteractions = Math.max(
                    ...recentTrends.last7Days.map((d) => d.interactions),
                    1
                  )
                  const height = (day.interactions / maxInteractions) * 100

                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs text-gray-400">{day.interactions}</span>
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-[#00d9ff] to-[#00ff88]"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-[10px] text-gray-500">
                        {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-lg text-white">Interactions by Type (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(recentTrends.interactionsByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const config = INSIGHT_TYPE_CONFIG[type]
                    return (
                      <Badge
                        key={type}
                        variant="outline"
                        className="border-gray-700 bg-gray-800/50"
                      >
                        <span className={config?.color || "text-gray-400"}>
                          {config?.label || type}
                        </span>
                        <span className="ml-2 text-gray-400">{count}</span>
                      </Badge>
                    )
                  })}
                {Object.keys(recentTrends.interactionsByType).length === 0 && (
                  <p className="text-gray-500">No recent interactions</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Users className="h-5 w-5" />
                Top Users by Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topUsers.map((user, i) => (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {user.email || user.userId.slice(0, 12) + "..."}
                        </p>
                        <p className="text-xs text-gray-400">
                          {user.totalInteractions} interactions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {user.mostUsedInsightType && (
                        <Badge variant="outline" className="border-gray-700">
                          {INSIGHT_TYPE_CONFIG[user.mostUsedInsightType]?.label ||
                            user.mostUsedInsightType}
                        </Badge>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Completion</p>
                        <p
                          className={`font-mono text-sm ${user.completionRate > 0.5 ? "text-green-400" : "text-yellow-400"}`}
                        >
                          {(user.completionRate * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {topUsers.length === 0 && (
                  <p className="py-8 text-center text-gray-500">No user data available yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
