"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MetricCard } from "@/components/admin/charts"
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
  TrendingUp,
  Hash,
  BarChart3,
  Target,
} from "lucide-react"
import { getProviderCostInfo, AI_BUDGET_CAPS } from "@/lib/pricing"
import { logger } from "@/lib/logger"

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
}

interface AIUsageData {
  overview: {
    totalUsers: number
    totalCost: number
    totalRequests: number
    totalTokens: number
    averageCostPerUser: number
    averageTokensPerRequest: number
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
  trends?: {
    daily: Array<{ date: string; requests: number; tokens: number; cost: number; uniqueUsers: number }>
    totals: { requests: number; tokens: number; cost: number; uniqueUsers: number }
  }
}

export default function AIUsagePage() {
  const { firebaseUser } = useAuth()
  const [aiUsage, setAiUsage] = useState<AIUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearingCache, setClearingCache] = useState(false)
  const [cacheCleared, setCacheCleared] = useState(false)
  const [clearCacheDialogOpen, setClearCacheDialogOpen] = useState(false)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ userId: string; email: string; currentBudget?: number } | null>(null)
  const [newBudget, setNewBudget] = useState("")
  const [settingBudget, setSettingBudget] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const providerCosts = getProviderCostInfo()

  const loadData = useCallback(async () => {
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
      logger.error("Error loading AI usage", { error, timeRange, userFilter, detailed })
    } finally {
      setLoading(false)
    }
  }, [firebaseUser])

  useEffect(() => {
    loadData()
  }, [loadData])

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
        setCacheCleared(true)
        setActionSuccess("AI cache cleared successfully")
        await loadData()
        setTimeout(() => {
          setCacheCleared(false)
          setActionSuccess(null)
        }, 3000)
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
        await loadData()
        setTimeout(() => setActionSuccess(null), 3000)
      } else {
        setActionError(data.error || "Failed to set budget")
      }
    } catch (error) {
      logger.error("Error setting budget", { error, userId: selectedUser?.userId, budget: budgetNum })
      setActionError("Failed to set budget")
    } finally {
      setSettingBudget(false)
    }
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
    return tokens.toString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">AI Usage</h1>
          <p className="text-gray-400 mt-1">Accurate token tracking and cost analytics</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setClearCacheDialogOpen(true)}
            variant="outline"
            size="sm"
            className="border-red-700 text-red-400 hover:text-red-300 hover:bg-red-900/20"
            disabled={clearingCache}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {actionSuccess && (
        <div className="flex items-center gap-2 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-green-300">{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-300">{actionError}</span>
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

      {/* Key Metrics */}
      {aiUsage && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <MetricCard
              title="Total AI Cost"
              value={`$${aiUsage.overview.totalCost.toFixed(4)}`}
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
              title="AI Requests"
              value={aiUsage.overview.totalRequests}
              icon={Zap}
            />
            <MetricCard
              title="Avg Tokens/Request"
              value={aiUsage.overview.averageTokensPerRequest || 0}
              icon={TrendingUp}
              iconColor="text-yellow-400"
            />
            <MetricCard
              title="Cache Hits"
              value={aiUsage.cache.memoryHits}
              subtitle={`${aiUsage.cache.memoryCacheSize} cached`}
              icon={Database}
              iconColor="text-purple-400"
            />
          </div>

          {/* Usage by Pattern - NEW */}
          {aiUsage.granular && Object.keys(aiUsage.granular.byPattern).length > 0 && (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#00d9ff]" />
                  Usage by DSA Pattern
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Token and cost breakdown by algorithm pattern
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(aiUsage.granular.byPattern)
                    .sort((a, b) => b[1].cost - a[1].cost)
                    .slice(0, 9)
                    .map(([pattern, data]) => (
                      <div key={pattern} className="p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium capitalize">
                            {pattern.replace(/-/g, ' ')}
                          </span>
                          <Badge className="bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]/30">
                            {data.scenarios.length} problems
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500 block">Requests</span>
                            <span className="text-white font-mono">{data.requests}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Tokens</span>
                            <span className="text-white font-mono">{formatTokens(data.tokens)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Cost</span>
                            <span className="text-green-400 font-mono">${data.cost.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage by Difficulty - NEW */}
          {aiUsage.granular && Object.keys(aiUsage.granular.byDifficulty).length > 0 && (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#00d9ff]" />
                  Usage by Difficulty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['easy', 'medium', 'hard'].map((diff) => {
                    const data = aiUsage.granular?.byDifficulty[diff]
                    if (!data) return null
                    return (
                      <div key={diff} className="p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={
                            diff === 'easy' ? 'bg-green-600/20 text-green-400 border-green-600/30' :
                            diff === 'medium' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' :
                            'bg-red-600/20 text-red-400 border-red-600/30'
                          }>
                            {diff.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Requests</span>
                            <span className="text-white font-mono">{data.requests}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Tokens</span>
                            <span className="text-white font-mono">{formatTokens(data.tokens)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-sm">Cost</span>
                            <span className="text-green-400 font-mono">${data.cost.toFixed(4)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Token-Heavy Scenarios - NEW */}
          {aiUsage.granular?.topTokenScenarios && aiUsage.granular.topTokenScenarios.length > 0 && (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Hash className="h-5 w-5 text-[#00d9ff]" />
                  Most Token-Heavy Problems
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Problems consuming the most tokens - useful for optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiUsage.granular.topTokenScenarios.slice(0, 5).map((scenario, idx) => (
                    <div
                      key={scenario.scenarioId}
                      className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-mono w-6">#{idx + 1}</span>
                        <div>
                          <span className="text-white text-sm block">{scenario.scenarioTitle}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs text-gray-400 border-gray-700">
                              {scenario.pattern}
                            </Badge>
                            <Badge className={
                              scenario.difficulty === 'easy' ? 'bg-green-600/20 text-green-400 text-xs' :
                              scenario.difficulty === 'medium' ? 'bg-yellow-600/20 text-yellow-400 text-xs' :
                              'bg-red-600/20 text-red-400 text-xs'
                            }>
                              {scenario.difficulty}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[#00d9ff] font-mono block">{formatTokens(scenario.tokens)} tokens</span>
                        <span className="text-gray-500 text-xs">{scenario.requests} requests</span>
                        <span className="text-gray-500 text-xs"> | avg {scenario.avgTokensPerRequest}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Breakdown */}
          {aiUsage.services && (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#00d9ff]" />
                  Usage by Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* LLM Usage */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-5 w-5 text-blue-400" />
                      <span className="text-white font-medium">LLM (Chat/Feedback)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Requests</span>
                        <span className="text-white font-mono">{aiUsage.services.llm.requests.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Tokens</span>
                        <span className="text-white font-mono">{formatTokens(aiUsage.services.llm.tokens)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Cost</span>
                        <span className="text-green-400 font-mono">${aiUsage.services.llm.cost.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Voice Usage */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Mic className="h-5 w-5 text-purple-400" />
                      <span className="text-white font-medium">Voice (Deepgram)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Sessions</span>
                        <span className="text-white font-mono">{aiUsage.services.voice.requests.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Duration</span>
                        <span className="text-white font-mono">{Math.round(aiUsage.services.voice.durationSeconds / 60)} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Cost</span>
                        <span className="text-green-400 font-mono">${aiUsage.services.voice.cost.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Embeddings Usage */}
                  <div className="p-4 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Code className="h-5 w-5 text-yellow-400" />
                      <span className="text-white font-medium">Embeddings (RAG)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Requests</span>
                        <span className="text-white font-mono">{aiUsage.services.embeddings.requests.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Tokens</span>
                        <span className="text-white font-mono">{formatTokens(aiUsage.services.embeddings.tokens || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Characters</span>
                        <span className="text-gray-500 font-mono text-xs">{Math.round(aiUsage.services.embeddings.characterCount / 1000)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Cost</span>
                        <span className="text-green-400 font-mono">${aiUsage.services.embeddings.cost.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget Caps */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#00d9ff]" />
                Budget Caps by Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(AI_BUDGET_CAPS).map(([tier, cap]) => (
                  <div key={tier} className="text-center p-4 bg-gray-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-white">${cap}</div>
                    <div className="text-sm text-gray-400 capitalize">{tier}</div>
                    <div className="text-xs text-gray-500">per month</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Users */}
          {aiUsage.topUsers && aiUsage.topUsers.length > 0 && (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#00d9ff]" />
                  Top Users by AI Cost
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Click the settings icon to set a custom budget for a user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiUsage.topUsers.slice(0, 10).map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                    >
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
                        <span className="text-[#00ff88] font-mono">
                          ${user.cost.toFixed(4)}
                        </span>
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              user.budgetUsedPercent > 80
                                ? "bg-red-500"
                                : user.budgetUsedPercent > 50
                                ? "bg-yellow-500"
                                : "bg-[#00ff88]"
                            }`}
                            style={{ width: `${Math.min(100, user.budgetUsedPercent)}%` }}
                          />
                        </div>
                        <span className="text-gray-500 text-xs w-12">
                          {user.budgetUsedPercent.toFixed(0)}%
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser({
                              userId: user.userId,
                              email: user.email,
                            })
                            setNewBudget("")
                            setBudgetDialogOpen(true)
                          }}
                          className="text-gray-400 hover:text-white hover:bg-gray-700 p-1 h-7 w-7"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Provider Costs Reference */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#00d9ff]" />
            AI Provider Costs
          </CardTitle>
          <CardDescription className="text-gray-400">
            Current pricing per 1K tokens (updated Dec 2025)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {providerCosts.map((provider) => (
              <div
                key={provider.provider}
                className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
              >
                <span className="text-white">{provider.displayName}</span>
                <span className="text-[#00ff88] font-mono">
                  ${provider.costPer1kTokens.toFixed(6)}/1K
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clear Cache Dialog */}
      <AlertDialog open={clearCacheDialogOpen} onOpenChange={setClearCacheDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Clear AI Cache</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will clear all cached AI responses. This action is useful when:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>AI responses seem stale or outdated</li>
                <li>You&apos;ve updated prompts or system instructions</li>
                <li>You want to force fresh responses for testing</li>
              </ul>
              <br />
              <span className="text-yellow-400">Note: This may temporarily increase API costs as the cache rebuilds.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
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
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Set Custom Budget</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Set a custom monthly AI budget cap for <strong className="text-white">{selectedUser?.email}</strong>.
              <br /><br />
              This overrides the default tier-based budget cap. Enter a value between $0 and $10,000.
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
                className="bg-gray-800 border-gray-700 text-white"
                min={0}
                max={10000}
                step={0.01}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Default tier budgets: Free $0.50 | Pro $25 | Enterprise $100
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
              onClick={() => {
                setSelectedUser(null)
                setNewBudget("")
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSetBudget}
              disabled={settingBudget || !newBudget}
              className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
            >
              {settingBudget ? "Setting..." : "Set Budget"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
