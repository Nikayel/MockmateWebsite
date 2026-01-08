"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/admin/charts"
import {
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Cpu,
  Search,
  BookOpen,
  Zap,
  Clock,
  TrendingUp,
  Play,
  Loader2,
  AlertTriangle,
  Sparkles,
  Bug,
  Server,
  Bell,
  Users,
  FileCode,
  RotateCcw,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface ComponentHealth {
  name: string
  status: "healthy" | "degraded" | "unhealthy"
  message: string
  responseTimeMs?: number
  details?: Record<string, unknown>
}

interface CategoryMetadata {
  category: string
  documentCount: number
  version: string
  lastSeededAt: string | null
  sourceCount: number
  needsSync: boolean
}

interface KnowledgeBaseStatus {
  seeded: boolean
  totalDocuments: number
  lastSeededAt: string | null
  version: string
  categories: CategoryMetadata[]
  needsSync: boolean
}

interface RAGHealthData {
  health: {
    status: "healthy" | "degraded" | "unhealthy"
    components: ComponentHealth[]
    uptime?: number
  }
  metrics: {
    embeddings: {
      total: number
      byProvider: Record<string, number>
      avgLatencyMs: number
      cacheHitRate: number
    }
    retrieval: {
      totalQueries: number
      avgResultCount: number
      avgRetrievalTimeMs: number
    }
    knowledgeBase: {
      totalDocuments: number
      lastSeeded: string | null
    }
  }
  config: {
    embeddingProvider: string
    vectorDB: string
    pineconeEnabled: boolean
    knowledgeBaseSeeded: boolean
    dimensions: number
  }
  providerMetrics: {
    total: number
    byProvider: Record<string, number>
    avgLatencyMs: number
    cacheHitRate: number
  }
  knowledgeBaseStatus?: KnowledgeBaseStatus
}

interface EvalResult {
  query: string
  category: string
  passed: boolean
  expected: string
  gotTopId: string
  score?: number
  error?: string
}

interface EvalData {
  results: EvalResult[]
  summary: {
    total: number
    passed: number
    failed: number
    passRate: number
    status: "good" | "ok" | "needs_attention"
  }
  timestamp: string
}

export default function RAGHealthPage() {
  const { firebaseUser } = useAuth()
  const [healthData, setHealthData] = useState<RAGHealthData | null>(null)
  const [evalData, setEvalData] = useState<EvalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [runningEval, setRunningEval] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedingCategories, setSeedingCategories] = useState<string[]>([])
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadHealth = useCallback(async () => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/rag-health?action=health", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setHealthData(data.data)
        }
      }
    } catch (error) {
      logger.error("Error loading RAG health", { error })
    } finally {
      setLoading(false)
    }
  }, [firebaseUser])

  const runQuickEval = async () => {
    if (!firebaseUser) return

    setRunningEval(true)
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/rag-health?action=quick-eval", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEvalData(data.data)
        }
      }
    } catch (error) {
      logger.error("Error running quick eval", { error })
    } finally {
      setRunningEval(false)
    }
  }

  const seedKnowledgeBase = async (categories?: string[], force?: boolean) => {
    if (!firebaseUser) return

    setSeeding(true)
    if (categories) {
      setSeedingCategories(categories)
    }
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/rag-health", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "seed-knowledge-base",
          force: force || false,
          categories: categories,
        }),
      })

      if (response.ok) {
        // Reload health after seeding
        await loadHealth()
      }
    } catch (error) {
      logger.error("Error seeding knowledge base", { error })
    } finally {
      setSeeding(false)
      setSeedingCategories([])
    }
  }

  const seedCategory = async (category: string) => {
    await seedKnowledgeBase([category], true)
  }

  const seedAllOutOfSync = async () => {
    if (!healthData?.knowledgeBaseStatus) return
    const outOfSync = healthData.knowledgeBaseStatus.categories
      .filter((c) => c.needsSync)
      .map((c) => c.category)
    if (outOfSync.length > 0) {
      await seedKnowledgeBase(outOfSync, true)
    }
  }

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      loadHealth()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadHealth])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "good":
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case "degraded":
      case "ok":
        return <AlertCircle className="h-5 w-5 text-yellow-400" />
      default:
        return <XCircle className="h-5 w-5 text-red-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "good":
        return "text-green-400"
      case "degraded":
      case "ok":
        return "text-yellow-400"
      default:
        return "text-red-400"
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00d9ff]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">RAG Health</h1>
          <p className="mt-1 text-gray-400">Monitor retrieval quality and system health</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-800"
            />
            Auto-refresh
          </label>
          <Button
            onClick={runQuickEval}
            disabled={runningEval}
            className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
          >
            {runningEval ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Run Quick Eval
          </Button>
          <Button
            onClick={() => loadHealth()}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {healthData && (
        <>
          {/* Overall Status */}
          <div className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900/50 p-6">
            {getStatusIcon(healthData.health.status)}
            <div>
              <h2 className={`text-xl font-bold ${getStatusColor(healthData.health.status)}`}>
                System{" "}
                {healthData.health.status.charAt(0).toUpperCase() +
                  healthData.health.status.slice(1)}
              </h2>
              <p className="text-sm text-gray-400">
                {healthData.health.components.filter((c) => c.status === "healthy").length}/
                {healthData.health.components.length} components healthy
              </p>
            </div>
            {healthData.health.uptime && (
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-400">Uptime</p>
                <p className="font-mono text-white">
                  {Math.floor(healthData.health.uptime / 1000 / 60)} min
                </p>
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Embedding Provider"
              value={healthData.config.embeddingProvider.toUpperCase()}
              subtitle={`${healthData.config.dimensions}D`}
              icon={Cpu}
              iconColor="text-blue-400"
            />
            <MetricCard
              title="Vector DB"
              value={healthData.config.vectorDB.toUpperCase()}
              subtitle={healthData.config.pineconeEnabled ? "Production" : "Fallback"}
              icon={Database}
              iconColor="text-purple-400"
            />
            <MetricCard
              title="Cache Hit Rate"
              value={`${(healthData.providerMetrics.cacheHitRate * 100).toFixed(1)}%`}
              subtitle={`${healthData.providerMetrics.total} requests`}
              icon={Zap}
              iconColor="text-yellow-400"
            />
            <MetricCard
              title="Avg Latency"
              value={`${healthData.providerMetrics.avgLatencyMs.toFixed(0)}ms`}
              subtitle="Embedding generation"
              icon={Clock}
              iconColor="text-green-400"
            />
          </div>

          {/* Component Health */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-[#00d9ff]" />
                Component Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData.health.components.map((component) => (
                  <div
                    key={component.name}
                    className="flex items-center justify-between rounded-lg bg-gray-800/30 p-4"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(component.status)}
                      <div>
                        <span className="font-medium text-white">{component.name}</span>
                        <p className="text-sm text-gray-400">{component.message}</p>
                      </div>
                    </div>
                    {component.responseTimeMs && (
                      <span className="font-mono text-sm text-gray-500">
                        {component.responseTimeMs}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Knowledge Base Status - Enhanced */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BookOpen className="h-5 w-5 text-[#00d9ff]" />
                    Knowledge Base
                    {healthData.knowledgeBaseStatus?.needsSync && (
                      <Badge className="ml-2 border-yellow-600/30 bg-yellow-600/20 text-yellow-400">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Sync Required
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {healthData.knowledgeBaseStatus?.totalDocuments || 0} documents across{" "}
                    {healthData.knowledgeBaseStatus?.categories.length || 0} categories
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {healthData.knowledgeBaseStatus?.needsSync && (
                    <Button
                      onClick={seedAllOutOfSync}
                      disabled={seeding}
                      className="bg-yellow-600 text-white hover:bg-yellow-700"
                      size="sm"
                    >
                      {seeding ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-4 w-4" />
                      )}
                      Sync All
                    </Button>
                  )}
                  <Button
                    onClick={() => seedKnowledgeBase(undefined, true)}
                    disabled={seeding}
                    variant="outline"
                    size="sm"
                    className="border-[#00d9ff]/30 text-[#00d9ff] hover:bg-[#00d9ff]/10"
                  >
                    {seeding && seedingCategories.length === 0 ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Database className="mr-2 h-4 w-4" />
                    )}
                    Reseed All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {healthData.knowledgeBaseStatus?.categories.map((category) => {
                  const getCategoryIcon = (cat: string) => {
                    switch (cat) {
                      case "dsa-patterns":
                        return <FileCode className="h-4 w-4" />
                      case "company-knowledge":
                        return <Users className="h-4 w-4" />
                      case "interview-tips":
                        return <Sparkles className="h-4 w-4" />
                      case "notification-knowledge":
                        return <Bell className="h-4 w-4" />
                      case "debugging-knowledge":
                        return <Bug className="h-4 w-4" />
                      case "system-design-knowledge":
                        return <Server className="h-4 w-4" />
                      default:
                        return <Database className="h-4 w-4" />
                    }
                  }

                  const formatCategoryName = (cat: string) => {
                    return cat
                      .split("-")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")
                  }

                  const isSeeding = seedingCategories.includes(category.category)

                  return (
                    <div
                      key={category.category}
                      className={`rounded-lg border p-4 ${
                        category.needsSync
                          ? "border-yellow-600/30 bg-yellow-900/10"
                          : "border-gray-700 bg-gray-800/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={category.needsSync ? "text-yellow-400" : "text-[#00d9ff]"}
                          >
                            {getCategoryIcon(category.category)}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {formatCategoryName(category.category)}
                          </span>
                        </div>
                        {category.needsSync && (
                          <Button
                            onClick={() => seedCategory(category.category)}
                            disabled={seeding}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-yellow-400 hover:bg-yellow-900/30 hover:text-yellow-300"
                          >
                            {isSeeding ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Vectorized</span>
                          <span className="text-gray-300">{category.documentCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Source</span>
                          <span
                            className={category.needsSync ? "text-yellow-400" : "text-gray-300"}
                          >
                            {category.sourceCount}
                            {category.needsSync &&
                              category.sourceCount > category.documentCount && (
                                <span className="ml-1 text-yellow-400">
                                  (+{category.sourceCount - category.documentCount} new)
                                </span>
                              )}
                          </span>
                        </div>
                        {category.lastSeededAt && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Last sync</span>
                            <span className="text-gray-400">
                              {new Date(category.lastSeededAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {!category.lastSeededAt && (
                          <div className="text-xs text-yellow-400">Never vectorized</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {healthData.knowledgeBaseStatus?.lastSeededAt && (
                <p className="mt-4 text-center text-xs text-gray-500">
                  Last full sync:{" "}
                  {new Date(healthData.knowledgeBaseStatus.lastSeededAt).toLocaleString()} •
                  Version: {healthData.knowledgeBaseStatus.version}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Retrieval Metrics */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Search className="h-5 w-5 text-[#00d9ff]" />
                Retrieval Metrics (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-gray-800/50 p-4">
                  <p className="text-sm text-gray-400">Total Queries</p>
                  <p className="text-2xl font-bold text-white">
                    {healthData.metrics.retrieval.totalQueries}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-4">
                  <p className="text-sm text-gray-400">Avg Results/Query</p>
                  <p className="text-2xl font-bold text-white">
                    {healthData.metrics.retrieval.avgResultCount.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/50 p-4">
                  <p className="text-sm text-gray-400">Avg Retrieval Time</p>
                  <p className="text-2xl font-bold text-white">
                    {healthData.metrics.retrieval.avgRetrievalTimeMs.toFixed(0)}ms
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Usage */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Cpu className="h-5 w-5 text-[#00d9ff]" />
                Embedding Provider Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {Object.entries(healthData.metrics.embeddings.byProvider).map(
                  ([provider, count]) => (
                    <div key={provider} className="rounded-lg bg-gray-800/50 p-4">
                      <p className="text-sm text-gray-400 capitalize">{provider}</p>
                      <p className="text-2xl font-bold text-white">{count}</p>
                      <p className="text-xs text-gray-500">
                        {((count / healthData.metrics.embeddings.total) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Quick Eval Results */}
      {evalData && (
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Search className="h-5 w-5 text-[#00d9ff]" />
                  Quick Evaluation Results
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Last run: {new Date(evalData.timestamp).toLocaleString()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {getStatusIcon(evalData.summary.status)}
                <div className="text-right">
                  <p className={`text-2xl font-bold ${getStatusColor(evalData.summary.status)}`}>
                    {evalData.summary.passRate.toFixed(0)}%
                  </p>
                  <p className="text-sm text-gray-400">
                    {evalData.summary.passed}/{evalData.summary.total} passed
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {evalData.results.map((result, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    result.passed ? "bg-green-900/20" : "bg-red-900/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <div>
                      <span className="text-sm text-white">{result.query}</span>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="border-gray-700 text-xs text-gray-400">
                          {result.category}
                        </Badge>
                        {!result.passed && (
                          <span className="text-xs text-red-400">Expected: {result.expected}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs text-gray-500">
                      {result.gotTopId.slice(0, 30)}
                    </span>
                    {result.score !== undefined && (
                      <p className="text-xs text-gray-500">
                        Score: {(result.score * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-white">CLI Commands</CardTitle>
          <CardDescription className="text-gray-400">
            Run these locally for more detailed analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 font-mono text-sm">
            <div className="rounded bg-gray-800 p-3">
              <span className="text-gray-400"># Full RAG evaluation (more test cases)</span>
              <br />
              <span className="text-[#00d9ff]">npx tsx scripts/eval-rag.ts</span>
            </div>
            <div className="rounded bg-gray-800 p-3">
              <span className="text-gray-400"># Vectorize all problems</span>
              <br />
              <span className="text-[#00d9ff]">npx tsx scripts/vectorize-problems.ts</span>
            </div>
            <div className="rounded bg-gray-800 p-3">
              <span className="text-gray-400"># Setup Pinecone index</span>
              <br />
              <span className="text-[#00d9ff]">npx tsx scripts/setup-pinecone.ts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
