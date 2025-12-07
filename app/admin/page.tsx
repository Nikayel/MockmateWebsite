"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import {
  Users,
  Crown,
  BarChart3,
  Terminal,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Activity,
  Target,
  Zap,
  Database,
  Cpu,
} from "lucide-react"

interface AnalyticsMetrics {
  users: {
    total: number
    byTier: {
      free: number
      pro: number
      enterprise: number
    }
  }
  sessions: {
    total: number
    completed: number
    inProgress: number
    avgPerformanceScore: number
    byType: Record<string, number>
    byDifficulty: Record<string, number>
  }
  revenue: {
    mrr: number
    arr: number
  }
  analytics: {
    totalEvents: number
    byEventType: Record<string, number>
    codeExecutions: {
      total: number
      passed: number
      passRate: number
    }
  }
  errors: {
    total: number
    recent: Array<{
      timestamp: string
      errorType: string
      errorMessage: string
      page?: string
      userId?: string
    }>
  }
}

interface AIUsageData {
  overview: {
    totalUsers: number
    totalCost: number
    totalRequests: number
    averageCostPerUser: number
  }
  cache: {
    memoryCacheSize: number
    memoryHits: number
  }
  topUsers: Array<{
    userId: string
    email: string
    tier: string
    cost: number
    requests: number
    budgetUsedPercent: number
  }>
  budgetCaps: Record<string, number>
}

export default function AdminDashboard() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [aiUsage, setAiUsage] = useState<AIUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")

  useEffect(() => {
    const loadMetrics = async () => {
      if (authLoading) return

      // TODO: Add proper admin authentication
      // For now, any logged-in user can access
      if (!firebaseUser) {
        router.push("/login?redirect=admin")
        return
      }

      try {
        // Fetch main analytics
        const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`)
        const data = await response.json()

        if (data.success) {
          setMetrics(data.metrics)
        } else {
          console.error("Failed to load metrics:", data.error)
        }

        // Fetch AI usage data
        try {
          const usageResponse = await fetch('/api/admin/usage?view=overview', {
            headers: { Authorization: `Bearer ${firebaseUser?.uid}` },
          })
          const usageData = await usageResponse.json()
          if (usageData.success) {
            setAiUsage(usageData.data)
          }
        } catch (usageError) {
          console.error("Error loading AI usage:", usageError)
        }
      } catch (error) {
        console.error("Error loading admin metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [authLoading, firebaseUser, router, timeRange])

  if (loading || authLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
      </main>
    )
  }

  if (!metrics) {
    return (
      <main className="min-h-screen bg-black">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <Card className="bg-red-900/20 border-red-500/30">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 font-medium">Failed to load analytics data</p>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const conversionRate = metrics.users.total > 0
    ? Math.round((metrics.users.byTier.pro / metrics.users.total) * 100)
    : 0

  const completionRate = metrics.sessions.total > 0
    ? Math.round((metrics.sessions.completed / metrics.sessions.total) * 100)
    : 0

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-heading font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-gray-400">Platform analytics and metrics</p>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2">
              {["7d", "30d", "90d", "all"].map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  onClick={() => setTimeRange(range)}
                  className={
                    timeRange === range
                      ? "bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
                      : "border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                  }
                >
                  {range === "all" ? "All Time" : range.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{metrics.users.total}</div>
                <p className="text-xs text-gray-400">{metrics.users.byTier.pro} Pro ({conversionRate}%)</p>
              </CardContent>
            </Card>

            {/* MRR */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  MRR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-400 mb-1">
                  ${metrics.revenue.mrr.toLocaleString()}
                </div>
                <p className="text-xs text-gray-400">ARR: ${metrics.revenue.arr.toLocaleString()}</p>
              </CardContent>
            </Card>

            {/* Total Sessions */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center">
                  <Terminal className="h-4 w-4 mr-2" />
                  Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{metrics.sessions.total}</div>
                <p className="text-xs text-gray-400">{completionRate}% completion rate</p>
              </CardContent>
            </Card>

            {/* Avg Performance */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Avg Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#00d9ff] mb-1">
                  {metrics.sessions.avgPerformanceScore}%
                </div>
                <p className="text-xs text-gray-400">Across all sessions</p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Code Execution Stats */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-[#00d9ff]" />
                  Code Executions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Total</span>
                    <span className="text-white font-semibold">{metrics.analytics.codeExecutions.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Passed</span>
                    <span className="text-green-400 font-semibold">{metrics.analytics.codeExecutions.passed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Pass Rate</span>
                    <span className="text-[#00d9ff] font-semibold">{metrics.analytics.codeExecutions.passRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Types */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Target className="h-5 w-5 mr-2 text-[#00d9ff]" />
                  Session Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.sessions.byType).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="text-gray-400 text-sm capitalize">{type}</span>
                      <span className="text-white font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Session Difficulty */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-[#00d9ff]" />
                  Difficulty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.sessions.byDifficulty).map(([difficulty, count]) => (
                    <div key={difficulty} className="flex justify-between">
                      <Badge
                        className={
                          difficulty === "easy"
                            ? "bg-green-600/20 text-green-400 border-green-600/30"
                            : difficulty === "medium"
                            ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                            : "bg-red-600/20 text-red-400 border-red-600/30"
                        }
                      >
                        {difficulty.toUpperCase()}
                      </Badge>
                      <span className="text-white font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Breakdown */}
          <Card className="bg-gray-900/50 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Crown className="h-5 w-5 mr-2 text-yellow-400" />
                Subscription Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-400 mb-2">{metrics.users.byTier.free}</div>
                  <p className="text-gray-400 text-sm">Free Users</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.users.total > 0 ? Math.round((metrics.users.byTier.free / metrics.users.total) * 100) : 0}% of total
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-yellow-400 mb-2">{metrics.users.byTier.pro}</div>
                  <p className="text-yellow-400 text-sm">Pro Users</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.users.total > 0 ? Math.round((metrics.users.byTier.pro / metrics.users.total) * 100) : 0}% of total
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-400 mb-2">{metrics.users.byTier.enterprise}</div>
                  <p className="text-purple-400 text-sm">Enterprise Users</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metrics.users.total > 0 ? Math.round((metrics.users.byTier.enterprise / metrics.users.total) * 100) : 0}% of total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Events */}
          <Card className="bg-gray-900/50 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="h-5 w-5 mr-2 text-[#00d9ff]" />
                Analytics Events ({metrics.analytics.totalEvents} total)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(metrics.analytics.byEventType).map(([eventType, count]) => (
                  <div key={eventType} className="bg-gray-800/50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-white mb-1">{count}</div>
                    <p className="text-xs text-gray-400 capitalize">{eventType.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Usage & Costs */}
          {aiUsage && (
            <Card className="bg-gray-900/50 border-gray-700 mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Cpu className="h-5 w-5 mr-2 text-[#00ff88]" />
                  AI Usage & Costs (This Month)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* AI Cost Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-[#00ff88]">${aiUsage.overview.totalCost.toFixed(4)}</div>
                    <p className="text-xs text-gray-400">Total AI Cost</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-white">{aiUsage.overview.totalRequests}</div>
                    <p className="text-xs text-gray-400">AI Requests</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-[#00d9ff]">{aiUsage.cache.memoryCacheSize}</div>
                    <p className="text-xs text-gray-400">Cache Entries</p>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{aiUsage.cache.memoryHits}</div>
                    <p className="text-xs text-gray-400">Cache Hits</p>
                  </div>
                </div>

                {/* Budget Caps */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Budget Caps by Tier</h4>
                  <div className="flex gap-4">
                    {aiUsage.budgetCaps && Object.entries(aiUsage.budgetCaps).map(([tier, cap]) => (
                      <div key={tier} className="bg-gray-800/30 px-3 py-2 rounded">
                        <span className="text-gray-400 text-xs capitalize">{tier}:</span>
                        <span className="text-white text-sm font-medium ml-2">${cap}/mo</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Users by AI Cost */}
                {aiUsage.topUsers && aiUsage.topUsers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Top Users by AI Cost</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {aiUsage.topUsers.slice(0, 10).map((user) => (
                        <div key={user.userId} className="flex items-center justify-between bg-gray-800/30 px-3 py-2 rounded">
                          <div className="flex items-center gap-3">
                            <span className="text-white text-sm">{user.email}</span>
                            <Badge
                              className={
                                user.tier === "enterprise"
                                  ? "bg-purple-600/20 text-purple-400 border-purple-600/30"
                                  : user.tier === "pro"
                                  ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                                  : "bg-gray-600/20 text-gray-400 border-gray-600/30"
                              }
                            >
                              {user.tier}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[#00ff88] text-sm font-medium">${user.cost.toFixed(4)}</span>
                            <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  user.budgetUsedPercent > 80 ? "bg-red-500" :
                                  user.budgetUsedPercent > 50 ? "bg-yellow-500" :
                                  "bg-[#00ff88]"
                                }`}
                                style={{ width: `${Math.min(100, user.budgetUsedPercent)}%` }}
                              />
                            </div>
                            <span className="text-gray-500 text-xs w-10">{user.budgetUsedPercent.toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Errors */}
          {metrics.errors.total > 0 && (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-red-400" />
                    Recent Errors ({metrics.errors.total} total)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {metrics.errors.recent.slice(0, 10).map((error, index) => (
                    <div key={index} className="bg-red-900/10 border border-red-500/20 p-3 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                          {error.errorType}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(error.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-red-300 mb-1">{error.errorMessage}</p>
                      {error.page && <p className="text-xs text-gray-500">Page: {error.page}</p>}
                      {error.userId && <p className="text-xs text-gray-500">User: {error.userId.substring(0, 8)}...</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
