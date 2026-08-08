/**
 * Database Query Performance Reporting
 *
 * Reads whatever query timings have been recorded in `query_metrics` and
 * `query_performance_aggregates` and turns them into the admin view.
 *
 * NOTHING CURRENTLY WRITES THOSE COLLECTIONS. This module used to export
 * `trackQuery`, a wrapper meant to be wound around every Firestore call, and it
 * was never wound around a single one. A wrapper nobody wraps does not collect
 * data, it just makes the dashboard look instrumented: the admin page rendered
 * "0 slow queries" in green, which is what perfect health also looks like.
 *
 * The wrapper is gone rather than left uncalled. Re-instrumenting means putting
 * timing at the real call sites (or, better, one shared Firestore accessor) and
 * pointing it at these collections. Until then the reader below reports zeros,
 * and every surface that renders it must say the metric is not collected.
 */

import { adminDb } from './firebase-admin'
import { logger } from './logger'

/**
 * Shape of a `query_metrics` document. Kept because the reader below still
 * parses documents in this shape, and because it is the contract any future
 * instrumentation has to write.
 */
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

/**
 * Get query performance statistics.
 *
 * Reports zeros until something writes the underlying collections. See the file
 * header: the wrapper that was supposed to write them had no call sites and has
 * been removed.
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
