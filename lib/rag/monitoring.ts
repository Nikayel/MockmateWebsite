/**
 * RAG Health Monitoring and Analytics
 *
 * Provides comprehensive monitoring, metrics, and analytics for the RAG system:
 * - Health checks for all components
 * - Performance metrics tracking
 * - Usage analytics
 * - Error tracking and alerting
 * - Cost estimation
 */

import { getHybridProvider } from './embeddings/hybrid-provider'
import { isOpenAIAvailable } from './embeddings/openai-provider'
import { vectorDB, getVectorDBProvider } from './vectordb'
import { isKnowledgeBaseSeeded } from './knowledge-base/seeder'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * Component health status
 */
export interface ComponentHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
  lastChecked: Date
  responseTimeMs?: number
  details?: Record<string, unknown>
}

/**
 * Overall system health
 */
export interface RAGSystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: ComponentHealth[]
  timestamp: Date
  uptime?: number
}

/**
 * RAG usage metrics
 */
export interface RAGMetrics {
  // Embedding metrics
  embeddings: {
    total: number
    byProvider: Record<string, number>
    avgLatencyMs: number
    cacheHitRate: number
    totalTokensUsed: number  // For OpenAI
  }

  // Retrieval metrics
  retrieval: {
    totalQueries: number
    avgResultCount: number
    avgRetrievalTimeMs: number
    avgRerankingTimeMs: number
  }

  // Knowledge base metrics
  knowledgeBase: {
    totalDocuments: number
    documentsByType: Record<string, number>
    lastSeeded: Date | null
  }

  // Usage by feature
  usageByFeature: {
    roadmapGeneration: number
    hintGeneration: number
    performanceAnalysis: number
    recommendations: number
  }

  // Time period
  periodStart: Date
  periodEnd: Date
}

/**
 * Error tracking entry
 */
export interface RAGError {
  id: string
  component: string
  errorType: string
  message: string
  stack?: string
  context?: Record<string, unknown>
  timestamp: Date
  resolved: boolean
}

/**
 * Cost estimation
 */
export interface CostEstimate {
  embeddings: {
    openaiTokens: number
    estimatedCostUSD: number
  }
  vectorDB: {
    storageGB: number
    queriesCount: number
    estimatedCostUSD: number
  }
  total: number
  period: string
}

/**
 * RAG Monitor class
 */
export class RAGMonitor {
  private static instance: RAGMonitor | null = null
  private startTime: Date
  private metricsBuffer: {
    embeddings: { provider: string; latencyMs: number; timestamp: Date }[]
    retrievals: { resultCount: number; retrievalMs: number; rerankMs: number; timestamp: Date }[]
    errors: RAGError[]
  }

  private constructor() {
    this.startTime = new Date()
    this.metricsBuffer = {
      embeddings: [],
      retrievals: [],
      errors: [],
    }
  }

  static getInstance(): RAGMonitor {
    if (!RAGMonitor.instance) {
      RAGMonitor.instance = new RAGMonitor()
    }
    return RAGMonitor.instance
  }

  /**
   * Perform comprehensive health check
   */
  async healthCheck(): Promise<RAGSystemHealth> {
    const components: ComponentHealth[] = []

    // Check embedding provider
    components.push(await this.checkEmbeddingProvider())

    // Check vector database
    components.push(await this.checkVectorDB())

    // Check knowledge base
    components.push(await this.checkKnowledgeBase())

    // Check Firestore
    components.push(await this.checkFirestore())

    // Determine overall status
    const unhealthyCount = components.filter(c => c.status === 'unhealthy').length
    const degradedCount = components.filter(c => c.status === 'degraded').length

    let status: RAGSystemHealth['status']
    if (unhealthyCount > 0) {
      status = 'unhealthy'
    } else if (degradedCount > 0) {
      status = 'degraded'
    } else {
      status = 'healthy'
    }

    return {
      status,
      components,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
    }
  }

  /**
   * Check embedding provider health
   */
  private async checkEmbeddingProvider(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const provider = getHybridProvider()
      const health = await provider.healthCheck()

      return {
        name: 'Embedding Provider',
        status: health.healthy ? 'healthy' : 'degraded',
        message: health.healthy
          ? `Active: ${provider.getActiveProvider()}`
          : 'Falling back to TF-IDF',
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
        details: {
          mode: health.mode,
          openaiAvailable: health.openaiAvailable,
          tfidfAvailable: health.tfidfAvailable,
        },
      }
    } catch (error) {
      return {
        name: 'Embedding Provider',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Check vector database health
   */
  private async checkVectorDB(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const healthy = await vectorDB.healthCheck()
      const provider = getVectorDBProvider()

      return {
        name: 'Vector Database',
        status: healthy ? 'healthy' : 'unhealthy',
        message: healthy ? `Provider: ${provider}` : `${provider} is not responding`,
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
        details: {
          provider,
        },
      }
    } catch (error) {
      return {
        name: 'Vector Database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Check knowledge base health
   */
  private async checkKnowledgeBase(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      const seeded = await isKnowledgeBaseSeeded()

      if (!seeded) {
        return {
          name: 'Knowledge Base',
          status: 'degraded',
          message: 'Knowledge base not seeded - RAG will use fallback data',
          lastChecked: new Date(),
          responseTimeMs: Date.now() - startTime,
        }
      }

      // Check document count
      const configDoc = await adminDb.collection('system_config').doc('knowledge_base').get()
      const docCount = configDoc.data()?.documentCount || 0

      return {
        name: 'Knowledge Base',
        status: 'healthy',
        message: `${docCount} documents indexed`,
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
        details: {
          documentCount: docCount,
          lastSeeded: configDoc.data()?.lastSeededAt?.toDate(),
          version: configDoc.data()?.version,
        },
      }
    } catch (error) {
      return {
        name: 'Knowledge Base',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Check Firestore health
   */
  private async checkFirestore(): Promise<ComponentHealth> {
    const startTime = Date.now()

    try {
      // Simple read test
      await adminDb.collection('system_config').doc('health_check').get()

      return {
        name: 'Firestore',
        status: 'healthy',
        message: 'Connected and responsive',
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: 'Firestore',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Record embedding operation
   */
  recordEmbedding(provider: string, latencyMs: number): void {
    this.metricsBuffer.embeddings.push({
      provider,
      latencyMs,
      timestamp: new Date(),
    })

    // Keep only last 1000 records
    if (this.metricsBuffer.embeddings.length > 1000) {
      this.metricsBuffer.embeddings = this.metricsBuffer.embeddings.slice(-1000)
    }
  }

  /**
   * Record retrieval operation
   */
  recordRetrieval(resultCount: number, retrievalMs: number, rerankMs: number): void {
    this.metricsBuffer.retrievals.push({
      resultCount,
      retrievalMs,
      rerankMs,
      timestamp: new Date(),
    })

    // Keep only last 1000 records
    if (this.metricsBuffer.retrievals.length > 1000) {
      this.metricsBuffer.retrievals = this.metricsBuffer.retrievals.slice(-1000)
    }
  }

  /**
   * Record error
   */
  recordError(component: string, errorType: string, error: Error, context?: Record<string, unknown>): void {
    const ragError: RAGError = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      component,
      errorType,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      resolved: false,
    }

    this.metricsBuffer.errors.push(ragError)

    // Keep only last 100 errors
    if (this.metricsBuffer.errors.length > 100) {
      this.metricsBuffer.errors = this.metricsBuffer.errors.slice(-100)
    }

    // Log for monitoring
    console.error(`[RAG Error] ${component}: ${errorType}`, error)
  }

  /**
   * Get current metrics
   */
  async getMetrics(periodHours: number = 24): Promise<RAGMetrics> {
    const periodStart = new Date(Date.now() - periodHours * 60 * 60 * 1000)
    const periodEnd = new Date()

    // Filter metrics by period
    const recentEmbeddings = this.metricsBuffer.embeddings.filter(
      e => e.timestamp >= periodStart
    )
    const recentRetrievals = this.metricsBuffer.retrievals.filter(
      r => r.timestamp >= periodStart
    )

    // Calculate embedding metrics
    const embeddingsByProvider: Record<string, number> = {}
    let totalLatency = 0
    for (const e of recentEmbeddings) {
      embeddingsByProvider[e.provider] = (embeddingsByProvider[e.provider] || 0) + 1
      totalLatency += e.latencyMs
    }

    // Calculate retrieval metrics
    let totalResultCount = 0
    let totalRetrievalTime = 0
    let totalRerankTime = 0
    for (const r of recentRetrievals) {
      totalResultCount += r.resultCount
      totalRetrievalTime += r.retrievalMs
      totalRerankTime += r.rerankMs
    }

    // Get knowledge base stats
    let kbStats = { totalDocuments: 0, documentsByType: {} as Record<string, number>, lastSeeded: null as Date | null }
    try {
      const configDoc = await adminDb.collection('system_config').doc('knowledge_base').get()
      if (configDoc.exists) {
        kbStats = {
          totalDocuments: configDoc.data()?.documentCount || 0,
          documentsByType: configDoc.data()?.documentsByType || {},
          lastSeeded: configDoc.data()?.lastSeededAt?.toDate() || null,
        }
      }
    } catch (e) {
      console.error('[RAGMonitor] Error getting KB stats:', e)
    }

    // Get usage stats from Firestore
    let usageByFeature = {
      roadmapGeneration: 0,
      hintGeneration: 0,
      performanceAnalysis: 0,
      recommendations: 0,
    }
    try {
      const usageDoc = await adminDb.collection('rag_analytics').doc('usage').get()
      if (usageDoc.exists) {
        usageByFeature = usageDoc.data()?.features || usageByFeature
      }
    } catch (e) {
      // Ignore - analytics may not exist yet
    }

    // Get provider metrics
    const provider = getHybridProvider()
    const providerMetrics = provider.getMetrics()

    return {
      embeddings: {
        total: recentEmbeddings.length,
        byProvider: embeddingsByProvider,
        avgLatencyMs: recentEmbeddings.length > 0 ? totalLatency / recentEmbeddings.length : 0,
        cacheHitRate: providerMetrics.cacheHitRate,
        totalTokensUsed: 0, // Would need OpenAI tracking
      },
      retrieval: {
        totalQueries: recentRetrievals.length,
        avgResultCount: recentRetrievals.length > 0 ? totalResultCount / recentRetrievals.length : 0,
        avgRetrievalTimeMs: recentRetrievals.length > 0 ? totalRetrievalTime / recentRetrievals.length : 0,
        avgRerankingTimeMs: recentRetrievals.length > 0 ? totalRerankTime / recentRetrievals.length : 0,
      },
      knowledgeBase: kbStats,
      usageByFeature,
      periodStart,
      periodEnd,
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): RAGError[] {
    return [...this.metricsBuffer.errors]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Estimate costs
   */
  async estimateCosts(periodDays: number = 30): Promise<CostEstimate> {
    const metrics = await this.getMetrics(periodDays * 24)

    // OpenAI embedding costs (text-embedding-3-small: $0.00002 per 1K tokens)
    // Estimate ~250 tokens per embedding on average
    const estimatedTokens = metrics.embeddings.byProvider['openai'] * 250 * (periodDays / 1)
    const openaiCost = (estimatedTokens / 1000) * 0.00002

    // Firestore costs (very rough estimate)
    // Reads: $0.036 per 100K
    // Writes: $0.108 per 100K
    const estimatedReads = metrics.retrieval.totalQueries * 10 // ~10 docs per query
    const firestoreCost = (estimatedReads / 100000) * 0.036

    return {
      embeddings: {
        openaiTokens: estimatedTokens,
        estimatedCostUSD: Math.round(openaiCost * 100) / 100,
      },
      vectorDB: {
        storageGB: 0.1, // Placeholder
        queriesCount: metrics.retrieval.totalQueries,
        estimatedCostUSD: Math.round(firestoreCost * 100) / 100,
      },
      total: Math.round((openaiCost + firestoreCost) * 100) / 100,
      period: `${periodDays} days`,
    }
  }

  /**
   * Record feature usage
   */
  async recordFeatureUsage(feature: 'roadmapGeneration' | 'hintGeneration' | 'performanceAnalysis' | 'recommendations'): Promise<void> {
    try {
      await adminDb.collection('rag_analytics').doc('usage').set({
        features: {
          [feature]: FieldValue.increment(1),
        },
        lastUpdated: Timestamp.now(),
      }, { merge: true })
    } catch (e) {
      console.error('[RAGMonitor] Error recording feature usage:', e)
    }
  }

  /**
   * Get uptime
   */
  getUptime(): { uptimeMs: number; startTime: Date } {
    return {
      uptimeMs: Date.now() - this.startTime.getTime(),
      startTime: this.startTime,
    }
  }

  /**
   * Save metrics snapshot to Firestore
   */
  async saveMetricsSnapshot(): Promise<void> {
    try {
      const metrics = await this.getMetrics(24)
      const health = await this.healthCheck()

      await adminDb.collection('rag_analytics').doc('daily_snapshot').set({
        metrics,
        health: {
          status: health.status,
          componentCount: health.components.length,
          healthyCount: health.components.filter(c => c.status === 'healthy').length,
        },
        timestamp: Timestamp.now(),
      })

      console.log('[RAGMonitor] Metrics snapshot saved')
    } catch (error) {
      console.error('[RAGMonitor] Error saving metrics snapshot:', error)
    }
  }
}

/**
 * Get RAG monitor singleton
 */
export function getRAGMonitor(): RAGMonitor {
  return RAGMonitor.getInstance()
}

/**
 * Convenience functions
 */
export async function checkRAGHealth(): Promise<RAGSystemHealth> {
  return getRAGMonitor().healthCheck()
}

export async function getRAGMetrics(periodHours?: number): Promise<RAGMetrics> {
  return getRAGMonitor().getMetrics(periodHours)
}

export function recordRAGError(component: string, errorType: string, error: Error, context?: Record<string, unknown>): void {
  getRAGMonitor().recordError(component, errorType, error, context)
}
