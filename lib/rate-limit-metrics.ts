/**
 * Rate Limiting Metrics Tracking
 *
 * Tracks rate limit events for monitoring and abuse detection.
 * - Tracks blocked requests by endpoint
 * - Identifies repeat offenders
 * - Provides visibility into API abuse patterns
 */

import { adminDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from './logger'

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
 * Track a rate limit check (both allowed and blocked)
 */
export async function trackRateLimitEvent(event: Omit<RateLimitEvent, 'id' | 'timestamp'>): Promise<void> {
  try {
    // Only store blocked events to save space
    // For allowed requests, just increment counters
    if (event.blocked) {
      await adminDb.collection('rate_limit_events').add({
        ...event,
        timestamp: FieldValue.serverTimestamp(),
      })
    }

    // Update aggregate counters
    const now = new Date()
    const hourKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`

    const aggregateRef = adminDb.collection('rate_limit_aggregates').doc(hourKey)

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(aggregateRef)

      if (!doc.exists) {
        transaction.set(aggregateRef, {
          hour: hourKey,
          total: 1,
          blocked: event.blocked ? 1 : 0,
          byEndpoint: {
            [event.endpoint]: {
              total: 1,
              blocked: event.blocked ? 1 : 0,
            },
          },
          uniqueIdentifiers: [event.identifier],
          createdAt: FieldValue.serverTimestamp(),
        })
      } else {
        const data = doc.data()!
        const byEndpoint = data.byEndpoint || {}

        if (!byEndpoint[event.endpoint]) {
          byEndpoint[event.endpoint] = { total: 0, blocked: 0 }
        }
        byEndpoint[event.endpoint].total++
        if (event.blocked) byEndpoint[event.endpoint].blocked++

        const identifiers = new Set(data.uniqueIdentifiers || [])
        identifiers.add(event.identifier)

        transaction.update(aggregateRef, {
          total: FieldValue.increment(1),
          blocked: FieldValue.increment(event.blocked ? 1 : 0),
          byEndpoint,
          uniqueIdentifiers: Array.from(identifiers),
        })
      }
    })

    // Track repeat offenders
    if (event.blocked) {
      const offenderRef = adminDb.collection('rate_limit_offenders').doc(event.identifier.replace(/[\/\.]/g, '_'))

      await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(offenderRef)

        if (!doc.exists) {
          transaction.set(offenderRef, {
            identifier: event.identifier,
            blockedCount: 1,
            firstBlocked: FieldValue.serverTimestamp(),
            lastBlocked: FieldValue.serverTimestamp(),
            endpoints: [event.endpoint],
          })
        } else {
          const endpoints = new Set(doc.data()?.endpoints || [])
          endpoints.add(event.endpoint)

          transaction.update(offenderRef, {
            blockedCount: FieldValue.increment(1),
            lastBlocked: FieldValue.serverTimestamp(),
            endpoints: Array.from(endpoints),
          })
        }
      })
    }
  } catch (error) {
    // Don't let metrics tracking break the app
    logger.error('Failed to track rate limit event', { error, endpoint: event.endpoint })
  }
}

/**
 * Get rate limit metrics for admin dashboard
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
    const now = new Date()
    const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000)

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
