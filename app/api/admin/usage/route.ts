/**
 * Admin Usage API
 *
 * Endpoints for viewing and managing user usage data.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { getAdminUsageStats, getUserUsageSummary, BUDGET_CAPS } from '@/lib/usage-tracking'
import { getCacheStats } from '@/lib/ai-cache'

// Admin user IDs (you can also use Firestore roles)
const ADMIN_USER_IDS = [
  process.env.ADMIN_USER_ID || '',
  // Add more admin IDs as needed
].filter(Boolean)

/**
 * Verify admin access
 */
async function verifyAdmin(request: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  try {
    // Get user ID from authorization header or cookie
    const authHeader = request.headers.get('authorization')
    const userId = authHeader?.replace('Bearer ', '')

    if (!userId) {
      return { authorized: false }
    }

    // Check if user is admin
    if (ADMIN_USER_IDS.includes(userId)) {
      return { authorized: true, userId }
    }

    // Check Firestore for admin role
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (userData?.role === 'admin' || userData?.subscription_tier === 'enterprise') {
      return { authorized: true, userId }
    }

    return { authorized: false }
  } catch (error) {
    console.error('[Admin API] Auth error:', error)
    return { authorized: false }
  }
}

/**
 * GET /api/admin/usage
 *
 * Get usage statistics
 *
 * Query params:
 * - view: 'overview' | 'users' | 'user' (default: 'overview')
 * - userId: string (required if view=user)
 */
export async function GET(request: NextRequest) {
  // For development, allow access without auth
  const isDev = process.env.NODE_ENV === 'development'

  if (!isDev) {
    const auth = await verifyAdmin(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'overview'
  const userId = searchParams.get('userId')

  try {
    switch (view) {
      case 'overview': {
        // Get overall usage stats
        const stats = await getAdminUsageStats()
        const cacheStats = getCacheStats()

        return NextResponse.json({
          success: true,
          data: {
            overview: {
              totalUsers: stats.totalUsers,
              totalCost: stats.totalCost,
              totalRequests: stats.totalRequests,
              averageCostPerUser: stats.totalUsers > 0 ? stats.totalCost / stats.totalUsers : 0,
            },
            cache: cacheStats,
            topUsers: stats.userStats.slice(0, 20),
            budgetCaps: BUDGET_CAPS,
          },
        })
      }

      case 'users': {
        // Get all users with usage
        const stats = await getAdminUsageStats()

        return NextResponse.json({
          success: true,
          data: {
            users: stats.userStats,
            total: stats.userStats.length,
          },
        })
      }

      case 'user': {
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required for user view' },
            { status: 400 }
          )
        }

        const summary = await getUserUsageSummary(userId)
        if (!summary) {
          return NextResponse.json(
            { error: 'User not found or no usage data' },
            { status: 404 }
          )
        }

        // Get user profile
        const userDoc = await adminDb.collection('users').doc(userId).get()
        const profile = userDoc.data()

        return NextResponse.json({
          success: true,
          data: {
            user: {
              id: userId,
              email: profile?.email,
              tier: profile?.subscription_tier || 'free',
              createdAt: profile?.created_at,
            },
            usage: summary,
          },
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown view: ${view}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Admin API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/usage
 *
 * Admin actions
 *
 * Body:
 * - action: 'set_budget' | 'clear_cache'
 * - userId: string (for set_budget)
 * - budget: number (for set_budget)
 */
export async function POST(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development'

  if (!isDev) {
    const auth = await verifyAdmin(request)
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const body = await request.json()
    const { action, userId, budget } = body

    switch (action) {
      case 'set_budget': {
        if (!userId || budget === undefined) {
          return NextResponse.json(
            { error: 'userId and budget are required' },
            { status: 400 }
          )
        }

        // Update user's custom budget
        await adminDb.collection('users').doc(userId).update({
          custom_budget_cap: budget,
          updated_at: new Date().toISOString(),
        })

        return NextResponse.json({
          success: true,
          message: `Budget set to $${budget} for user ${userId}`,
        })
      }

      case 'clear_cache': {
        // Import clearCache dynamically to avoid circular deps
        const { clearCache } = await import('@/lib/ai-cache')
        await clearCache()

        return NextResponse.json({
          success: true,
          message: 'Cache cleared',
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Admin API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}
