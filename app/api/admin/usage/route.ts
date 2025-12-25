/**
 * Admin Usage API
 *
 * Endpoints for viewing and managing user usage data.
 * Requires admin authentication via Firebase ID token.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { getAdminUsageStats, getUserUsageSummary, BUDGET_CAPS } from '@/lib/usage-tracking'
import { getCacheStats } from '@/lib/ai-cache'

// Admin user IDs - requires proper env configuration
const ADMIN_USER_IDS = [
  process.env.ADMIN_USER_ID,
].filter((id): id is string => Boolean(id))

/**
 * Verify admin access using Firebase Auth token verification
 */
async function verifyAdmin(request: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false }
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the Firebase ID token properly
    if (!adminAuth) {
      return { authorized: false }
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // SECURITY: Only trust hardcoded admin list from environment variables
    // Never read admin status from user-writable Firestore fields
    if (ADMIN_USER_IDS.includes(userId)) {
      return { authorized: true, userId }
    }

    return { authorized: false }
  } catch (error) {
    // Token verification failed - don't expose error details
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
  // Always require authentication - no dev bypass
  const auth = await verifyAdmin(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  // Always require authentication - no dev bypass
  const auth = await verifyAdmin(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
