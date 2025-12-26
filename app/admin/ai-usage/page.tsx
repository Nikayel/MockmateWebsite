"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/admin/charts"
import { Cpu, DollarSign, Zap, Database, RefreshCw, Users, Mic, Code, MessageSquare } from "lucide-react"
import { getProviderCostInfo, AI_BUDGET_CAPS } from "@/lib/pricing"

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
  services?: {
    llm: { requests: number; cost: number; tokens: number }
    voice: { requests: number; cost: number; durationSeconds: number }
    embeddings: { requests: number; cost: number; characterCount: number }
  }
  providers?: Record<string, { requests: number; cost: number }>
}

export default function AIUsagePage() {
  const { firebaseUser } = useAuth()
  const [aiUsage, setAiUsage] = useState<AIUsageData | null>(null)
  const [loading, setLoading] = useState(true)

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
      console.error("Error loading AI usage:", error)
    } finally {
      setLoading(false)
    }
  }, [firebaseUser])

  useEffect(() => {
    loadData()
  }, [loadData])

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
          <p className="text-gray-400 mt-1">AI API costs and usage tracking</p>
        </div>

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

      {/* Key Metrics */}
      {aiUsage && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total AI Cost"
              value={`$${aiUsage.overview.totalCost.toFixed(4)}`}
              subtitle="This month"
              icon={DollarSign}
              valueColor="text-green-400"
              iconColor="text-green-400"
            />
            <MetricCard
              title="AI Requests"
              value={aiUsage.overview.totalRequests}
              icon={Zap}
            />
            <MetricCard
              title="Cache Entries"
              value={aiUsage.cache.memoryCacheSize}
              icon={Database}
              iconColor="text-purple-400"
            />
            <MetricCard
              title="Cache Hits"
              value={aiUsage.cache.memoryHits}
              subtitle="Requests served from cache"
              icon={Cpu}
              iconColor="text-[#00d9ff]"
            />
          </div>

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
                        <span className="text-white font-mono">{aiUsage.services.llm.tokens.toLocaleString()}</span>
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
                        <span className="text-gray-400 text-sm">Characters</span>
                        <span className="text-white font-mono">{Math.round(aiUsage.services.embeddings.characterCount / 1000)}K</span>
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
    </div>
  )
}
