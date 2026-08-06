"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetricCard } from "@/components/admin/charts"
import { DataTable, Column, renderBadge } from "@/components/admin/shared/DataTable"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Cpu,
  DollarSign,
  Zap,
  Database,
  RefreshCw,
  Users,
  Mic,
  Code,
  MessageSquare,
  Trash2,
  Settings,
  CheckCircle,
  AlertCircle,
  Hash,
  Target,
  FileText,
  ChevronRight,
  X,
} from "lucide-react"
import { SpendHealthPanel } from "./_components/SpendHealthPanel"
import { getProviderCostInfo, AI_BUDGET_CAPS } from "@/lib/pricing"
import { logger } from "@/lib/logger"

// Types
interface PatternUsage {
  pattern: string
  requests: number
  tokens: number
  cost: number
  scenarios: string[]
}

interface ScenarioUsage {
  scenarioId: string
  scenarioTitle: string
  pattern: string
  difficulty: string
  requests: number
  tokens: number
  cost: number
  avgTokensPerRequest: number
  sessionCount?: number
  /** Distinct users who ran this problem. Absent on the overview breakdown. */
  uniqueUsers?: number
  avgCostPerSession?: number
}

interface SessionData {
  sessionId: string
  userId: string
  userEmail: string
  scenarioTitle: string
  scenarioId: string
  scenarioType: string
  difficulty: string
  pattern: string
  status: string
  cost: number
  tokens: number
  requestCount: number
  performanceScore?: number
  createdAt: string
  completedAt?: string
}

interface UserData {
  userId: string
  email: string
  tier: string
  cost: number
  requests: number
  budgetUsedPercent: number
}

/** How much of the underlying data an aggregate actually saw. */
interface ScanCoverage {
  scanned: number
  limit: number
  truncated: boolean
}

/** Today's platform spend against the kill switch in lib/global-spend-guard.ts. */
interface GlobalSpendStatus {
  spendToday: number
  ceiling: number
  usedPercent: number | null
  disabled: boolean
  exceeded: boolean
  approaching: boolean
}

interface UsageHealth {
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

interface AIUsageData {
  overview: {
    totalUsers: number
    activeUsers: number
    totalCost: number
    totalRequests: number
    totalTokens: number
    averageCostPerUser: number
    averageTokensPerRequest: number
  }
  health?: UsageHealth
  coverage?: {
    anyTruncated: boolean
    events: ScanCoverage
    sessions: ScanCoverage
  }
  cache: {
    memoryCacheSize: number
    memoryHits: number
  }
  topUsers: UserData[]
  budgetCaps: Record<string, number>
  services?: {
    llm: { requests: number; cost: number; tokens: number }
    voice: { requests: number; cost: number; durationSeconds: number }
    embeddings: { requests: number; cost: number; tokens: number; characterCount: number }
  }
  providers?: Record<string, { requests: number; cost: number; tokens: number }>
  granular?: {
    byPattern: Record<string, PatternUsage>
    byDifficulty: Record<string, { requests: number; tokens: number; cost: number }>
    topCostlyScenarios: ScenarioUsage[]
    topTokenScenarios: ScenarioUsage[]
  }
}

export default function AIUsagePage() {
  const { firebaseUser } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [aiUsage, setAiUsage] = useState<AIUsageData | null>(null)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [scenarios, setScenarios] = useState<ScenarioUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const [clearCacheDialogOpen, setClearCacheDialogOpen] = useState(false)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [userDrawerOpen, setUserDrawerOpen] = useState(false)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [loadingUserDetails, setLoadingUserDetails] = useState(false)
  const [newBudget, setNewBudget] = useState("")
  const [settingBudget, setSettingBudget] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const providerCosts = getProviderCostInfo()

  // Load overview data
  const loadOverviewData = useCallback(async () => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/usage?view=overview", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAiUsage(data.data)
        }
      }
    } catch (error) {
      logger.error("Error loading AI usage", { error })
    } finally {
      setLoading(false)
    }
  }, [firebaseUser])

  // Load sessions data
  const loadSessionsData = useCallback(async () => {
    if (!firebaseUser) return

    setLoadingSessions(true)
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/usage?view=sessions&limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success && data.data?.sessions) {
        setSessions(data.data.sessions)
      } else {
        logger.warn("Sessions API returned no data", { data })
      }
    } catch (error) {
      logger.error("Error loading sessions", { error })
    } finally {
      setLoadingSessions(false)
    }
  }, [firebaseUser])

  // Load scenarios data
  const loadScenariosData = useCallback(async () => {
    if (!firebaseUser) return

    setLoadingScenarios(true)
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/usage?view=scenarios", {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success && data.data?.scenarios) {
        setScenarios(data.data.scenarios)
      } else {
        logger.warn("Scenarios API returned no data", { data })
      }
    } catch (error) {
      logger.error("Error loading scenarios", { error })
    } finally {
      setLoadingScenarios(false)
    }
  }, [firebaseUser])

  // Load user details
  const loadUserDetails = useCallback(
    async (userId: string) => {
      if (!firebaseUser) return

      setLoadingUserDetails(true)
      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch(`/api/admin/usage?view=user&userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUserDetails(data.data)
          }
        }
      } catch (error) {
        logger.error("Error loading user details", { error })
      } finally {
        setLoadingUserDetails(false)
      }
    },
    [firebaseUser]
  )

  useEffect(() => {
    loadOverviewData()
  }, [loadOverviewData])

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === "sessions" && sessions.length === 0) {
      loadSessionsData()
    } else if (activeTab === "scenarios" && scenarios.length === 0) {
      loadScenariosData()
    }
  }, [activeTab, sessions.length, scenarios.length, loadSessionsData, loadScenariosData])

  const handleClearCache = async () => {
    if (!firebaseUser) return

    setClearingCache(true)
    setActionError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/usage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "clear_cache" }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setActionSuccess("AI cache cleared successfully")
        await loadOverviewData()
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        setActionError(data.error || "Failed to clear cache")
      }
    } catch (error) {
      logger.error("Error clearing cache", { error })
      setActionError("Failed to clear cache")
    } finally {
      setClearingCache(false)
      setClearCacheDialogOpen(false)
    }
  }

  const handleSetBudget = async () => {
    if (!firebaseUser || !selectedUser) return

    const budgetNum = parseFloat(newBudget)
    if (isNaN(budgetNum) || budgetNum < 0 || budgetNum > 10000) {
      setActionError("Budget must be between $0 and $10,000")
      return
    }

    setSettingBudget(true)
    setActionError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/usage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set_budget",
          userId: selectedUser.userId,
          budget: budgetNum,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setActionSuccess(`Budget set to $${budgetNum} for ${selectedUser.email}`)
        setBudgetDialogOpen(false)
        setSelectedUser(null)
        setNewBudget("")
        await loadOverviewData()
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        setActionError(data.error || "Failed to set budget")
      }
    } catch (error) {
      logger.error("Error setting budget", { error })
      setActionError("Failed to set budget")
    } finally {
      setSettingBudget(false)
    }
  }

  const openUserDrawer = (user: UserData) => {
    setSelectedUser(user)
    setUserDrawerOpen(true)
    loadUserDetails(user.userId)
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
    return tokens.toString()
  }

  const formatCost = (cost: number) => {
    if (cost >= 1) return `$${cost.toFixed(2)}`
    if (cost >= 0.01) return `$${cost.toFixed(3)}`
    return `$${cost.toFixed(4)}`
  }

  const getDifficultyColor = (difficulty: string) => difficultyColorClass(difficulty)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success"
      case "in_progress":
        return "warning"
      case "abandoned":
        return "error"
      default:
        return "default"
    }
  }

  // Session table columns
  const sessionColumns: Column<SessionData>[] = [
    {
      key: "scenarioTitle",
      label: "Problem",
      render: (_, row) => (
        <div>
          <span className="text-sm text-white">{row.scenarioTitle}</span>
          <div className="mt-1 flex items-center gap-1">
            <Badge variant="outline" className="border-gray-700 text-xs text-gray-400">
              {row.pattern}
            </Badge>
            <Badge className={`text-xs ${getDifficultyColor(row.difficulty)}`}>
              {row.difficulty}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: "userEmail",
      label: "User",
      render: (_, row) => (
        <span className="block max-w-[150px] truncate text-sm text-gray-300">{row.userEmail}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => renderBadge(value, getStatusColor(value) as any),
    },
    {
      key: "tokens",
      label: "Tokens",
      align: "right",
      render: (value) => <span className="font-mono text-[#c4703f]">{formatTokens(value)}</span>,
    },
    {
      key: "cost",
      label: "Cost",
      align: "right",
      render: (value) => <span className="font-mono text-green-400">{formatCost(value)}</span>,
    },
    {
      key: "createdAt",
      label: "Date",
      align: "right",
      render: (value) => (
        <span className="text-sm text-gray-400">{new Date(value).toLocaleDateString()}</span>
      ),
    },
  ]

  // Scenario table columns
  const scenarioColumns: Column<ScenarioUsage>[] = [
    {
      key: "scenarioTitle",
      label: "Problem",
      render: (_, row) => (
        <div>
          <span className="text-sm text-white">{row.scenarioTitle}</span>
          <div className="mt-1 flex items-center gap-1">
            <Badge variant="outline" className="border-gray-700 text-xs text-gray-400">
              {row.pattern}
            </Badge>
            <Badge className={`text-xs ${getDifficultyColor(row.difficulty)}`}>
              {row.difficulty}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: "sessionCount",
      label: "Sessions",
      align: "center",
      render: (value) => <span className="text-white">{value || 0}</span>,
    },
    {
      key: "uniqueUsers",
      label: "Users",
      align: "center",
      render: (value) =>
        typeof value === "number" ? (
          <span className="text-white">{value}</span>
        ) : (
          <span className="text-gray-500">-</span>
        ),
    },
    {
      key: "requests",
      label: "API Calls",
      align: "right",
      render: (value) => <span className="text-gray-300">{value.toLocaleString()}</span>,
    },
    {
      key: "tokens",
      label: "Total Tokens",
      align: "right",
      render: (value) => <span className="font-mono text-[#c4703f]">{formatTokens(value)}</span>,
    },
    {
      key: "avgTokensPerRequest",
      label: "Avg/Request",
      align: "right",
      render: (value) => <span className="text-gray-400">{formatTokens(value)}</span>,
    },
    {
      key: "cost",
      label: "Total Cost",
      align: "right",
      render: (value) => <span className="font-mono text-green-400">{formatCost(value)}</span>,
    },
    {
      key: "avgCostPerSession",
      label: "Avg/Session",
      align: "right",
      render: (value) => <span className="text-gray-400">{value ? formatCost(value) : "-"}</span>,
    },
  ]

  if (loading) {
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
          <h1 className="font-heading text-3xl font-bold text-white">AI Usage</h1>
          <p className="mt-1 text-gray-400">Comprehensive cost tracking and analytics</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setClearCacheDialogOpen(true)}
            variant="outline"
            size="sm"
            className="border-red-700 text-red-400 hover:bg-red-900/20 hover:text-red-300"
            disabled={clearingCache}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cache
          </Button>
          <Button
            onClick={loadOverviewData}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-900/20 p-3">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-sm text-green-300">{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 p-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-sm text-red-300">{actionError}</span>
          <Button
            onClick={() => setActionError(null)}
            variant="ghost"
            size="sm"
            className="ml-auto text-red-400 hover:text-red-300"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="border border-gray-700 bg-gray-800/50 p-1">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-[#c4703f] data-[state=active]:text-black"
          >
            <Zap className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="data-[state=active]:bg-[#c4703f] data-[state=active]:text-black"
          >
            <FileText className="mr-2 h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger
            value="scenarios"
            className="data-[state=active]:bg-[#c4703f] data-[state=active]:text-black"
          >
            <Target className="mr-2 h-4 w-4" />
            Problems
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-[#c4703f] data-[state=active]:text-black"
          >
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger
            value="providers"
            className="data-[state=active]:bg-[#c4703f] data-[state=active]:text-black"
          >
            <Cpu className="mr-2 h-4 w-4" />
            Providers
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {aiUsage && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard
                  title="Total Cost"
                  value={formatCost(aiUsage.overview.totalCost)}
                  subtitle="This month"
                  icon={DollarSign}
                  valueColor="text-green-400"
                  iconColor="text-green-400"
                />
                <MetricCard
                  title="Total Tokens"
                  value={formatTokens(aiUsage.overview.totalTokens || 0)}
                  subtitle="Accurate count"
                  icon={Hash}
                  iconColor="text-blue-400"
                />
                <MetricCard
                  title="API Requests"
                  value={aiUsage.overview.totalRequests}
                  icon={Zap}
                />
                <MetricCard
                  title="Cache Hits"
                  value={aiUsage.cache.memoryHits}
                  subtitle={`${aiUsage.cache.memoryCacheSize} cached`}
                  icon={Database}
                  iconColor="text-purple-400"
                />
              </div>

              {/* Spend health: kill-switch headroom, anomalies, unit economics */}
              {aiUsage.health && (
                <SpendHealthPanel health={aiUsage.health} coverage={aiUsage.coverage} />
              )}

              {/* Service Breakdown - Compact */}
              {aiUsage.services && (
                <Card className="border-gray-800 bg-gray-900/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-white">
                      <Zap className="h-5 w-5 text-[#c4703f]" />
                      Cost by Service
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg bg-gray-800/50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium text-white">LLM</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          {formatCost(aiUsage.services.llm.cost)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatTokens(aiUsage.services.llm.tokens)} tokens
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-800/50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Mic className="h-4 w-4 text-purple-400" />
                          <span className="text-sm font-medium text-white">Voice</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          {formatCost(aiUsage.services.voice.cost)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {Math.round(aiUsage.services.voice.durationSeconds / 60)} min
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-800/50 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Code className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm font-medium text-white">Embeddings</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400">
                          {formatCost(aiUsage.services.embeddings.cost)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatTokens(aiUsage.services.embeddings.tokens || 0)} tokens
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pattern & Difficulty Summary */}
              {aiUsage.granular && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* By Pattern */}
                  <Card className="border-gray-800 bg-gray-900/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg text-white">
                        <Target className="h-5 w-5 text-[#c4703f]" />
                        Top Patterns by Cost
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(aiUsage.granular.byPattern)
                          .sort((a, b) => b[1].cost - a[1].cost)
                          .slice(0, 5)
                          .map(([pattern, data]) => (
                            <div
                              key={pattern}
                              className="flex items-center justify-between rounded bg-gray-800/30 p-2"
                            >
                              <span className="text-sm text-white capitalize">
                                {pattern.replace(/-/g, " ")}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-gray-400">
                                  {formatTokens(data.tokens)}
                                </span>
                                <span className="font-mono text-sm text-green-400">
                                  {formatCost(data.cost)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* By Difficulty */}
                  <Card className="border-gray-800 bg-gray-900/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-white">Cost by Difficulty</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3">
                        {["easy", "medium", "hard"].map((diff) => {
                          const data = aiUsage.granular?.byDifficulty[diff]
                          if (!data) return null
                          return (
                            <div
                              key={diff}
                              className={`rounded-lg p-3 text-center ${
                                diff === "easy"
                                  ? "border border-green-600/30 bg-green-900/20"
                                  : diff === "medium"
                                    ? "border border-yellow-600/30 bg-yellow-900/20"
                                    : "border border-red-600/30 bg-red-900/20"
                              }`}
                            >
                              <div
                                className={`mb-1 text-xs font-medium ${
                                  diff === "easy"
                                    ? "text-green-400"
                                    : diff === "medium"
                                      ? "text-yellow-400"
                                      : "text-red-400"
                                }`}
                              >
                                {diff.toUpperCase()}
                              </div>
                              <div className="text-lg font-bold text-white">
                                {formatCost(data.cost)}
                              </div>
                              <div className="text-xs text-gray-500">{data.requests} calls</div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <DataTable
            title="Session Costs"
            description="Per-session AI usage breakdown"
            icon={FileText}
            data={sessions}
            columns={sessionColumns}
            keyExtractor={(row) => row.sessionId}
            loading={loadingSessions}
            onRefresh={loadSessionsData}
            searchable
            searchPlaceholder="Search sessions..."
            emptyMessage="No sessions found"
          />
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios">
          <DataTable
            title="Problem Costs"
            description="AI costs aggregated by interview problem"
            icon={Target}
            data={scenarios}
            columns={scenarioColumns}
            keyExtractor={(row) => row.scenarioId}
            loading={loadingScenarios}
            onRefresh={loadScenariosData}
            searchable
            searchPlaceholder="Search problems..."
            emptyMessage="No scenario data found"
          />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          {aiUsage?.topUsers && (
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="h-5 w-5 text-[#c4703f]" />
                  User AI Costs
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Click on a user to see their session breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aiUsage.topUsers.map((user) => (
                    <div
                      key={user.userId}
                      onClick={() => openUserDrawer(user)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          openUserDrawer(user)
                        }
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-800/30 p-3 transition-colors hover:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-white">{user.email}</span>
                        <Badge
                          className={
                            user.tier === "enterprise"
                              ? "border-purple-600/30 bg-purple-600/20 text-purple-400"
                              : user.tier === "pro"
                                ? "border-yellow-600/30 bg-yellow-600/20 text-yellow-400"
                                : "border-gray-600/30 bg-gray-600/20 text-gray-400"
                          }
                        >
                          {user.tier}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-green-400">{formatCost(user.cost)}</span>
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-700">
                          <div
                            className={`h-full rounded-full ${
                              user.budgetUsedPercent > 80
                                ? "bg-red-500"
                                : user.budgetUsedPercent > 50
                                  ? "bg-yellow-500"
                                  : "bg-[#3fb883]"
                            }`}
                            style={{ width: `${Math.min(100, user.budgetUsedPercent)}%` }}
                          />
                        </div>
                        <span className="w-12 text-xs text-gray-500">
                          {user.budgetUsedPercent.toFixed(0)}%
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Provider Costs Reference */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Cpu className="h-5 w-5 text-[#c4703f]" />
                  Provider Pricing
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Cost per 1K tokens (updated Jan 2026)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {providerCosts.map((provider) => (
                    <div
                      key={provider.provider}
                      className="flex items-center justify-between rounded-lg bg-gray-800/30 p-3"
                    >
                      <span className="text-white">{provider.displayName}</span>
                      <span className="font-mono text-[#3fb883]">
                        ${provider.costPer1kTokens.toFixed(6)}/1K
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Budget Caps */}
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-[#c4703f]" />
                  Budget Caps by Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(AI_BUDGET_CAPS).map(([tier, cap]) => (
                    <div key={tier} className="rounded-lg bg-gray-800/50 p-4 text-center">
                      <div className="text-2xl font-bold text-white">${cap}</div>
                      <div className="text-sm text-gray-400 capitalize">{tier}</div>
                      <div className="text-xs text-gray-500">per month</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Details Drawer */}
      {userDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close user details"
            className="absolute inset-0 bg-black/50"
            onClick={() => setUserDrawerOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-y-auto border-l border-gray-800 bg-gray-900">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-800 bg-gray-900 p-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedUser.email}</h2>
                <Badge
                  className={
                    selectedUser.tier === "enterprise"
                      ? "border-purple-600/30 bg-purple-600/20 text-purple-400"
                      : selectedUser.tier === "pro"
                        ? "border-yellow-600/30 bg-yellow-600/20 text-yellow-400"
                        : "border-gray-600/30 bg-gray-600/20 text-gray-400"
                  }
                >
                  {selectedUser.tier}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewBudget("")
                    setBudgetDialogOpen(true)
                  }}
                  className="border-gray-700 text-gray-400 hover:text-white"
                >
                  <Settings className="mr-1 h-4 w-4" />
                  Set Budget
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserDrawerOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {loadingUserDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#c4703f]"></div>
                </div>
              ) : userDetails ? (
                <>
                  {/* Usage Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-800/50 p-3">
                      <div className="text-xs text-gray-400">Total Cost</div>
                      <div className="text-xl font-bold text-green-400">
                        {formatCost(userDetails.usage?.totalCost || 0)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-gray-800/50 p-3">
                      <div className="text-xs text-gray-400">Budget Used</div>
                      <div className="text-xl font-bold text-white">
                        {(userDetails.usage?.budgetUsedPercent || 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Sessions */}
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-400">Recent Sessions</h3>
                    <div className="space-y-2">
                      {userDetails.sessions?.length > 0 ? (
                        userDetails.sessions.map((session: any) => (
                          <div key={session.sessionId} className="rounded-lg bg-gray-800/30 p-3">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm text-white">{session.scenarioTitle}</span>
                              <span className="font-mono text-sm text-green-400">
                                {formatCost(session.cost)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-gray-700 text-xs text-gray-400"
                              >
                                {session.pattern}
                              </Badge>
                              <Badge
                                className={`text-xs ${getDifficultyColor(session.difficulty)}`}
                              >
                                {session.difficulty}
                              </Badge>
                              <span className="ml-auto text-xs text-gray-500">
                                {formatTokens(session.tokens)} tokens
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-gray-500">No sessions found</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-gray-500">Failed to load user details</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Cache Dialog */}
      <AlertDialog open={clearCacheDialogOpen} onOpenChange={setClearCacheDialogOpen}>
        <AlertDialogContent className="border-gray-800 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Clear AI Cache</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will clear all cached AI responses. This may temporarily increase API costs as
              the cache rebuilds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCache}
              disabled={clearingCache}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {clearingCache ? "Clearing..." : "Clear Cache"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set Budget Dialog */}
      <AlertDialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <AlertDialogContent className="border-gray-800 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Set Custom Budget</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Set a custom monthly AI budget for{" "}
              <strong className="text-white">{selectedUser?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <span className="text-white">$</span>
              <Input
                type="number"
                placeholder="e.g., 50.00"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="border-gray-700 bg-gray-800 text-white"
                min={0}
                max={10000}
                step={0.01}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Default: Free $0.50 | Pro $25 | Enterprise $100
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
              onClick={() => {
                setNewBudget("")
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSetBudget}
              disabled={settingBudget || !newBudget}
              className="bg-[#c4703f] text-black hover:bg-[#c4703f]/80"
            >
              {settingBudget ? "Setting..." : "Set Budget"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
