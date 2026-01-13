/**
 * Database Query Performance Tracking
 *
 * Monitors Firestore query performance to identify:
 * - Slow queries that need optimization
 * - Missing indexes
 * - Expensive queries (high document reads)
 * - Query patterns that could be optimized
 */

import { adminDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from './logger'

export interface QueryMetric {
  id?: string
  collection: string
  operation: 'get' | 'list' | 'query' | 'write' | 'batch' | 'transaction'
  durationMs: number
  documentCount: number
  // Query details
  filters?: string[] // e.g., ["userId == X", "createdAt >= Y"]
  orderBy?: string
  limit?: number
  // Context
  endpoint?: string
  userId?: string
  // Performance indicators
  isSlowQuery: boolean // > 1000ms
  isCostlyQuery: boolean // > 100 documents
  timestamp: Date
}

export interface QueryPerformanceStats {
  totalQueries: number
  averageDurationMs: number
  slowQueries: number // > 1000ms
  slowQueryRate: number
  costlyQueries: number // > 100 docs
  byCollection: Record<string, {
    count: number
    avgDurationMs: number
    avgDocumentCount: number
    slowCount: number
  }>
  byOperation: Record<string, {
    count: number
    avgDurationMs: number
  }>
  slowestQueries: Array<{
    collection: string
    operation: string
    durationMs: number
    documentCount: number
    filters?: string[]
    timestamp: Date
  }>
  recommendations: string[]
}

// Thresholds
const SLOW_QUERY_THRESHOLD_MS = 1000
const COSTLY_QUERY_THRESHOLD_DOCS = 100
const SAMPLE_RATE = 0.1 // Only store 10% of queries to save space

/**
 * Track a query's performance
 * Call this wrapper around Firestore operations
 */
export async function trackQuery<T>(
  collection: string,
  operation: QueryMetric['operation'],
  queryFn: () => Promise<T>,
  options?: {
    filters?: string[]
    orderBy?: string
    limit?: number
    endpoint?: string
    userId?: string
  }
): Promise<T> {
  const startTime = Date.now()
  let documentCount = 0

  try {
    const result = await queryFn()

    // Count documents if result is a snapshot
    if (result && typeof result === 'object') {
      if ('docs' in result && Array.isArray((result as any).docs)) {
        documentCount = (result as any).docs.length
      } else if ('exists' in result) {
        documentCount = (result as any).exists ? 1 : 0
      }
    }

    const durationMs = Date.now() - startTime
    const isSlowQuery = durationMs > SLOW_QUERY_THRESHOLD_MS
    const isCostlyQuery = documentCount > COSTLY_QUERY_THRESHOLD_DOCS

    // Always log slow/costly queries, sample others
    const shouldStore = isSlowQuery || isCostlyQuery || Math.random() < SAMPLE_RATE

    if (shouldStore) {
      await storeQueryMetric({
        collection,
        operation,
        durationMs,
        documentCount,
        filters: options?.filters,
        orderBy: options?.orderBy,
        limit: options?.limit,
        endpoint: options?.endpoint,
        userId: options?.userId,
        isSlowQuery,
        isCostlyQuery,
        timestamp: new Date(),
      })
    }

    // Always log slow queries
    if (isSlowQuery) {
      logger.warn('Slow query detected', {
        collection,
        operation,
        durationMs,
        documentCount,
        filters: options?.filters,
      })
    }

    return result
  } catch (error) {
    const durationMs = Date.now() - startTime

    logger.error('Query failed', {
      collection,
      operation,
      durationMs,
      error,
    })

    throw error
  }
}

/**
 * Store query metric
 */
async function storeQueryMetric(metric: Omit<QueryMetric, 'id'>): Promise<void> {
  try {
    await adminDb.collection('query_metrics').add({
      ...metric,
      timestamp: FieldValue.serverTimestamp(),
    })

    // Update hourly aggregates
    const now = new Date()
    const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`

    const aggregateRef = adminDb.collection('query_performance_aggregates').doc(hourKey)

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(aggregateRef)

      if (!doc.exists) {
        transaction.set(aggregateRef, {
          hour: hourKey,
          totalQueries: 1,
          totalDurationMs: metric.durationMs,
          totalDocuments: metric.documentCount,
          slowQueries: metric.isSlowQuery ? 1 : 0,
          costlyQueries: metric.isCostlyQuery ? 1 : 0,
          byCollection: {
            [metric.collection]: {
              count: 1,
              totalDurationMs: metric.durationMs,
              totalDocuments: metric.documentCount,
              slowCount: metric.isSlowQuery ? 1 : 0,
            },
          },
          byOperation: {
            [metric.operation]: {
              count: 1,
              totalDurationMs: metric.durationMs,
            },
          },
          createdAt: FieldValue.serverTimestamp(),
        })
      } else {
        const data = doc.data()!
        const byCollection = data.byCollection || {}
        const byOperation = data.byOperation || {}

        if (!byCollection[metric.collection]) {
          byCollection[metric.collection] = { count: 0, totalDurationMs: 0, totalDocuments: 0, slowCount: 0 }
        }
        byCollection[metric.collection].count++
        byCollection[metric.collection].totalDurationMs += metric.durationMs
        byCollection[metric.collection].totalDocuments += metric.documentCount
        if (metric.isSlowQuery) byCollection[metric.collection].slowCount++

        if (!byOperation[metric.operation]) {
          byOperation[metric.operation] = { count: 0, totalDurationMs: 0 }
        }
        byOperation[metric.operation].count++
        byOperation[metric.operation].totalDurationMs += metric.durationMs

        transaction.update(aggregateRef, {
          totalQueries: FieldValue.increment(1),
          totalDurationMs: FieldValue.increment(metric.durationMs),
          totalDocuments: FieldValue.increment(metric.documentCount),
          slowQueries: FieldValue.increment(metric.isSlowQuery ? 1 : 0),
          costlyQueries: FieldValue.increment(metric.isCostlyQuery ? 1 : 0),
          byCollection,
          byOperation,
        })
      }
    })
  } catch (error) {
    // Don't let tracking break the app
    logger.error('Failed to store query metric', { error, collection: metric.collection })
  }
}

/**
 * Get query performance statistics
 */
export async function getQueryPerformanceStats(hours: number = 24): Promise<QueryPerformanceStats> {
  const stats: QueryPerformanceStats = {
    totalQueries: 0,
    averageDurationMs: 0,
    slowQueries: 0,
    slowQueryRate: 0,
    costlyQueries: 0,
    byCollection: {},
    byOperation: {},
    slowestQueries: [],
    recommendations: [],
  }

  try {
    // Get aggregates
    const aggregatesSnapshot = await adminDb
      .collection('query_performance_aggregates')
      .orderBy('createdAt', 'desc')
      .limit(hours)
      .get()

    let totalDurationMs = 0

    for (const doc of aggregatesSnapshot.docs) {
      const data = doc.data()

      stats.totalQueries += data.totalQueries || 0
      totalDurationMs += data.totalDurationMs || 0
      stats.slowQueries += data.slowQueries || 0
      stats.costlyQueries += data.costlyQueries || 0

      // Merge collection stats
      for (const [collection, collStats] of Object.entries(data.byCollection || {})) {
        const cs = collStats as any
        if (!stats.byCollection[collection]) {
          stats.byCollection[collection] = {
            count: 0,
            avgDurationMs: 0,
            avgDocumentCount: 0,
            slowCount: 0,
          }
        }
        stats.byCollection[collection].count += cs.count
        stats.byCollection[collection].avgDurationMs += cs.totalDurationMs
        stats.byCollection[collection].avgDocumentCount += cs.totalDocuments
        stats.byCollection[collection].slowCount += cs.slowCount
      }

      // Merge operation stats
      for (const [operation, opStats] of Object.entries(data.byOperation || {})) {
        const os = opStats as any
        if (!stats.byOperation[operation]) {
          stats.byOperation[operation] = { count: 0, avgDurationMs: 0 }
        }
        stats.byOperation[operation].count += os.count
        stats.byOperation[operation].avgDurationMs += os.totalDurationMs
      }
    }

    // Calculate averages
    if (stats.totalQueries > 0) {
      stats.averageDurationMs = totalDurationMs / stats.totalQueries
      stats.slowQueryRate = (stats.slowQueries / stats.totalQueries) * 100
    }

    for (const collection of Object.keys(stats.byCollection)) {
      const cs = stats.byCollection[collection]
      if (cs.count > 0) {
        cs.avgDurationMs = cs.avgDurationMs / cs.count
        cs.avgDocumentCount = cs.avgDocumentCount / cs.count
      }
    }

    for (const operation of Object.keys(stats.byOperation)) {
      const os = stats.byOperation[operation]
      if (os.count > 0) {
        os.avgDurationMs = os.avgDurationMs / os.count
      }
    }

    // Get slowest queries
    const slowestSnapshot = await adminDb
      .collection('query_metrics')
      .where('isSlowQuery', '==', true)
      .orderBy('durationMs', 'desc')
      .limit(10)
      .get()

    stats.slowestQueries = slowestSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        collection: data.collection,
        operation: data.operation,
        durationMs: data.durationMs,
        documentCount: data.documentCount,
        filters: data.filters,
        timestamp: data.timestamp?.toDate() || new Date(),
      }
    })

    // Generate recommendations
    stats.recommendations = generateRecommendations(stats)

  } catch (error) {
    logger.error('Failed to get query performance stats', { error })
  }

  return stats
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(stats: QueryPerformanceStats): string[] {
  const recommendations: string[] = []

  // High slow query rate
  if (stats.slowQueryRate > 5) {
    recommendations.push(`High slow query rate (${stats.slowQueryRate.toFixed(1)}%). Consider adding indexes or optimizing queries.`)
  }

  // Collections with many slow queries
  for (const [collection, cs] of Object.entries(stats.byCollection)) {
    if (cs.slowCount > 10) {
      recommendations.push(`Collection "${collection}" has ${cs.slowCount} slow queries. Review query patterns and indexes.`)
    }
    if (cs.avgDocumentCount > 50) {
      recommendations.push(`Collection "${collection}" averages ${cs.avgDocumentCount.toFixed(0)} docs/query. Consider adding pagination or narrower filters.`)
    }
  }

  // Slow operations
  for (const [operation, os] of Object.entries(stats.byOperation)) {
    if (os.avgDurationMs > 500) {
      recommendations.push(`Operation "${operation}" averages ${os.avgDurationMs.toFixed(0)}ms. Consider batching or caching.`)
    }
  }

  // Overall performance
  if (stats.averageDurationMs > 200) {
    recommendations.push(`Average query duration (${stats.averageDurationMs.toFixed(0)}ms) is high. Consider implementing a caching layer.`)
  }

  return recommendations
}

/**
 * Clean up old query metrics
 */
export async function cleanupQueryMetrics(daysToKeep: number = 3): Promise<void> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    // Delete old metrics (keep slow queries longer)
    const oldMetricsSnapshot = await adminDb
      .collection('query_metrics')
      .where('isSlowQuery', '==', false)
      .where('timestamp', '<', cutoffDate)
      .limit(500)
      .get()

    const batch = adminDb.batch()
    for (const doc of oldMetricsSnapshot.docs) {
      batch.delete(doc.ref)
    }
    await batch.commit()

    logger.info('Cleaned up old query metrics', {
      deleted: oldMetricsSnapshot.size,
    })
  } catch (error) {
    logger.error('Failed to cleanup query metrics', { error })
  }
}
