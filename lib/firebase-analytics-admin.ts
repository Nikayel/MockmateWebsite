/**
 * Firebase Analytics Admin Helper
 * 
 * Fetches Firebase Analytics data using Google Analytics Data API (GA4)
 * 
 * Setup required:
 * 1. Enable Google Analytics Data API in Google Cloud Console
 * 2. Get your GA4 Property ID (from Firebase Console > Analytics > Settings)
 * 3. Create a service account with Analytics Viewer role
 * 4. Set GOOGLE_ANALYTICS_PROPERTY_ID environment variable
 * 5. Use the same service account credentials as Firebase Admin SDK
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'

// Initialize Analytics Data API client
let analyticsClient: BetaAnalyticsDataClient | null = null

function getAnalyticsClient(): BetaAnalyticsDataClient | null {
  if (analyticsClient) {
    return analyticsClient
  }

  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID

  if (!propertyId) {
    console.warn('⚠️ GOOGLE_ANALYTICS_PROPERTY_ID not set. Firebase Analytics data will not be available.')
    return null
  }

  try {
    // Uses the same credentials as Firebase Admin SDK (GOOGLE_APPLICATION_CREDENTIALS or service account)
    analyticsClient = new BetaAnalyticsDataClient()
    return analyticsClient
  } catch (error) {
    console.error('❌ Failed to initialize Analytics Data API client:', error)
    return null
  }
}

/**
 * Get date range for analytics queries
 */
function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

/**
 * Get Firebase Analytics overview metrics
 */
export async function getFirebaseAnalyticsOverview(days: number = 7) {
  const client = getAnalyticsClient()
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID

  if (!client || !propertyId) {
    return null
  }

  try {
    const { startDate, endDate } = getDateRange(days)

    // Get active users
    const [activeUsersResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'sessions' },
      ],
    })

    // Get event counts
    const [eventsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 20,
    })

    // Get user engagement metrics
    const [engagementResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'engagementRate' },
      ],
    })

    // Parse active users data
    const activeUsersData = activeUsersResponse.rows?.[0]?.metricValues || []
    const activeUsers = parseInt(activeUsersData[0]?.value || '0', 10)
    const newUsers = parseInt(activeUsersData[1]?.value || '0', 10)
    const pageViews = parseInt(activeUsersData[2]?.value || '0', 10)
    const sessions = parseInt(activeUsersData[3]?.value || '0', 10)

    // Parse events data
    const eventsByType: Record<string, number> = {}
    eventsResponse.rows?.forEach((row) => {
      const eventName = row.dimensionValues?.[0]?.value || 'unknown'
      const eventCount = parseInt(row.metricValues?.[0]?.value || '0', 10)
      eventsByType[eventName] = eventCount
    })

    // Parse engagement data
    const engagementData = engagementResponse.rows?.[0]?.metricValues || []
    const avgSessionDuration = parseFloat(engagementData[0]?.value || '0')
    const bounceRate = parseFloat(engagementData[1]?.value || '0')
    const engagementRate = parseFloat(engagementData[2]?.value || '0')

    return {
      activeUsers,
      newUsers,
      pageViews,
      sessions,
      eventsByType,
      avgSessionDuration: Math.round(avgSessionDuration),
      bounceRate: Math.round(bounceRate * 100) / 100,
      engagementRate: Math.round(engagementRate * 100) / 100,
    }
  } catch (error) {
    console.error('Error fetching Firebase Analytics overview:', error)
    return null
  }
}

/**
 * Get specific event metrics
 */
export async function getFirebaseAnalyticsEvents(
  eventNames: string[],
  days: number = 7
) {
  const client = getAnalyticsClient()
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID

  if (!client || !propertyId) {
    return null
  }

  try {
    const { startDate, endDate } = getDateRange(days)

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: {
            values: eventNames,
          },
        },
      },
    })

    const events: Record<string, number> = {}
    response.rows?.forEach((row) => {
      const eventName = row.dimensionValues?.[0]?.value || 'unknown'
      const eventCount = parseInt(row.metricValues?.[0]?.value || '0', 10)
      events[eventName] = eventCount
    })

    return events
  } catch (error) {
    console.error('Error fetching Firebase Analytics events:', error)
    return null
  }
}

/**
 * Get user acquisition metrics
 */
export async function getFirebaseAnalyticsAcquisition(days: number = 7) {
  const client = getAnalyticsClient()
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID

  if (!client || !propertyId) {
    return null
  }

  try {
    const { startDate, endDate } = getDateRange(days)

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'firstUserSource' }],
      metrics: [{ name: 'newUsers' }],
      orderBys: [{ metric: { metricName: 'newUsers' }, desc: true }],
      limit: 10,
    })

    const acquisition: Array<{ source: string; users: number }> = []
    response.rows?.forEach((row) => {
      const source = row.dimensionValues?.[0]?.value || 'direct'
      const users = parseInt(row.metricValues?.[0]?.value || '0', 10)
      acquisition.push({ source, users })
    })

    return acquisition
  } catch (error) {
    console.error('Error fetching Firebase Analytics acquisition:', error)
    return null
  }
}

/**
 * Get conversion funnel metrics
 */
export async function getFirebaseAnalyticsConversions(days: number = 7) {
  const client = getAnalyticsClient()
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID

  if (!client || !propertyId) {
    return null
  }

  try {
    const { startDate, endDate } = getDateRange(days)

    // Track key conversion events
    const conversionEvents = [
      'sign_up',
      'login',
      'session_start',
      'session_complete',
      'purchase',
    ]

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: {
            values: conversionEvents,
          },
        },
      },
    })

    const conversions: Record<string, number> = {}
    response.rows?.forEach((row) => {
      const eventName = row.dimensionValues?.[0]?.value || 'unknown'
      const eventCount = parseInt(row.metricValues?.[0]?.value || '0', 10)
      conversions[eventName] = eventCount
    })

    return conversions
  } catch (error) {
    console.error('Error fetching Firebase Analytics conversions:', error)
    return null
  }
}
