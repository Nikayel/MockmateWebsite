/**
 * Rate Limiting Metrics Reporting
 *
 * Reads `rate_limit_aggregates`, `rate_limit_events` and `rate_limit_offenders`
 * and turns them into the abuse view on the admin pages.
 *
 * NOTHING CURRENTLY WRITES THOSE COLLECTIONS. This module used to export
 * `trackRateLimitEvent`, meant to be called from the limiter in lib/rate-limit,
 * and the limiter never called it. The result was an abuse dashboard that
 * reported a 0.00% block rate, zero offenders and no DDoS indicator no matter
 * what was happening, which is indistinguishable from a platform under no
 * attack at all.
 *
 * The writer is gone rather than left uncalled. Re-instrumenting means calling
 * into these collections from the limiter itself, and it is worth pricing first:
 * the original writer ran two Firestore transactions per request, which is a
 * real cost on the hot path and probably wants sampling or a counter store.
 */

import { adminDb } from './firebase-admin'
import { logger } from './logger'

/**
 * Shape of a `rate_limit_events` document. Kept as the contract any future
 * instrumentation has to write, not because anything writes it today.
 */
export interface RateLimitEvent {
  id?: string
  identifier: string // IP address or user ID
  endpoint: string // API endpoint that was rate limited
  blocked: boolean // Was the request blocked?
  remaining: number // Requests remaining in window
  resetTime: number // When the window resets
  timestamp: Date
  userAgent?: string
  country?: string // If available from headers
}

export interface RateLimitMetrics {
  totalRequests: number
  blockedRequests: number
  blockRate: number // Percentage of requests blocked
  uniqueIdentifiers: number // Unique IPs/users
  byEndpoint: Record<string, {
    total: number
    blocked: number
    blockRate: number
  }>
  topOffenders: Array<{
    identifier: string
    blockedCount: number
    lastBlocked: Date
    endpoints: string[]
  }>
  hourlyTrend: Array<{
    hour: string
    total: number
    blocked: number
  }>
  // Alert indicators
  alerts: {
    highBlockRate: boolean // Block rate > 10%
    ddosIndicator: boolean // Many blocks from single IP
    bruteForceIndicator: boolean // Repeated blocks on sensitive endpoints
  }
}

/**
 * Get rate limit metrics for the admin dashboard.
 *
 * Reports zeros until something writes the underlying collections. See the file
 * header: the writer that was supposed to fill them had no call sites and has
 * been removed.
 */
export async function getRateLimitMetrics(hours: number = 24): Promise<RateLimitMetrics> {
  const metrics: RateLimitMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    blockRate: 0,
    uniqueIdentifiers: 0,
    byEndpoint: {},
    topOffenders: [],
    hourlyTrend: [],
    alerts: {
      highBlockRate: false,
      ddosIndicator: false,
      bruteForceIndicator: false,
    },
  }

  try {
    // Get hourly aggregates
    const aggregatesSnapshot = await adminDb
      .collection('rate_limit_aggregates')
      .orderBy('createdAt', 'desc')
      .limit(hours)
      .get()

    const allIdentifiers = new Set<string>()

    for (const doc of aggregatesSnapshot.docs) {
      const data = doc.data()

      metrics.totalRequests += data.total || 0
      metrics.blockedRequests += data.blocked || 0

      // Merge endpoint stats
      for (const [endpoint, stats] of Object.entries(data.byEndpoint || {})) {
        if (!metrics.byEndpoint[endpoint]) {
          metrics.byEndpoint[endpoint] = { total: 0, blocked: 0, blockRate: 0 }
        }
        const s = stats as { total: number; blocked: number }
        metrics.byEndpoint[endpoint].total += s.total
        metrics.byEndpoint[endpoint].blocked += s.blocked
      }

      // Track unique identifiers
      for (const id of data.uniqueIdentifiers || []) {
        allIdentifiers.add(id)
      }

      // Add to hourly trend
      metrics.hourlyTrend.push({
        hour: data.hour,
        total: data.total || 0,
        blocked: data.blocked || 0,
      })
    }

    metrics.uniqueIdentifiers = allIdentifiers.size

    // Calculate block rates
    if (metrics.totalRequests > 0) {
      metrics.blockRate = (metrics.blockedRequests / metrics.totalRequests) * 100
    }

    for (const endpoint of Object.keys(metrics.byEndpoint)) {
      const stats = metrics.byEndpoint[endpoint]
      if (stats.total > 0) {
        stats.blockRate = (stats.blocked / stats.total) * 100
      }
    }

    // Get top offenders
    const offendersSnapshot = await adminDb
      .collection('rate_limit_offenders')
      .orderBy('blockedCount', 'desc')
      .limit(20)
      .get()

    metrics.topOffenders = offendersSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        identifier: data.identifier,
        blockedCount: data.blockedCount,
        lastBlocked: data.lastBlocked?.toDate() || new Date(),
        endpoints: data.endpoints || [],
      }
    })

    // Set alerts
    metrics.alerts.highBlockRate = metrics.blockRate > 10

    // DDoS indicator: single IP with > 100 blocks in 24h
    metrics.alerts.ddosIndicator = metrics.topOffenders.some(o => o.blockedCount > 100)

    // Brute force indicator: multiple blocks on sensitive endpoints
    const sensitiveEndpoints = ['rl:sensitive', 'rl:promo', 'rl:guest']
    metrics.alerts.bruteForceIndicator = metrics.topOffenders.some(o =>
      o.blockedCount > 10 && o.endpoints.some(e => sensitiveEndpoints.some(s => e.includes(s)))
    )

    // Sort hourly trend
    metrics.hourlyTrend.sort((a, b) => a.hour.localeCompare(b.hour))

  } catch (error) {
    logger.error('Failed to get rate limit metrics', { error })
  }

  return metrics
}

/**
 * Clear old rate limit data (run daily via cron)
 */
export async function cleanupRateLimitData(daysToKeep: number = 7): Promise<void> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    // Delete old events
    const oldEventsSnapshot = await adminDb
      .collection('rate_limit_events')
      .where('timestamp', '<', cutoffDate)
      .limit(500)
      .get()

    const batch = adminDb.batch()
    for (const doc of oldEventsSnapshot.docs) {
      batch.delete(doc.ref)
    }
    await batch.commit()

    logger.info('Cleaned up old rate limit data', {
      deletedEvents: oldEventsSnapshot.size,
    })
  } catch (error) {
    logger.error('Failed to cleanup rate limit data', { error })
  }
}
