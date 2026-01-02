/**
 * Admin Users API
 *
 * GET: List all users with pagination
 * DELETE: Delete a user and all their data (with rate limiting and idempotency)
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { verifyAdminAccess, requirePermission, successResponse, unauthorizedResponse, errorResponse } from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { logAdminAction } from "@/lib/admin/audit"
import Stripe from "stripe"
import { Pinecone } from "@pinecone-database/pinecone"
import { logger } from "@/lib/logger"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
})

// Rate limiting: Track recent deletions to prevent abuse
const deletionRateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_DELETIONS = 5 // Max 5 deletions per minute per admin

// Protected emails that cannot be deleted via API
const PROTECTED_EMAILS = [
  "alinikayeljamal@gmail.com",
  "nikayeeljamaljan@gmail.com",
]

function checkRateLimit(adminId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = deletionRateLimit.get(adminId)

  if (!record || now >= record.resetAt) {
    deletionRateLimit.set(adminId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }

  if (record.count >= RATE_LIMIT_MAX_DELETIONS) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) }
  }

  record.count++
  return { allowed: true }
}

// Collections to delete when removing a user
const collectionsToDelete = [
  { name: "profiles", field: null, docId: null }, // Will be set to userId
  { name: "sessions", field: "userId" },
  { name: "interview_sessions", field: "user_id" },
  { name: "profile_quota", field: "user_id" },
  { name: "payment_history", field: "user_id" },
  { name: "email_notifications", field: "user_id" },
  { name: "session_vectors", field: "userId" },
  { name: "performance_profiles", field: "userId" },
  { name: "promo_code_usage", field: "userId" },
  { name: "analytics", field: "userId" },
  { name: "user_learning_state", field: null, docId: null }, // Will be set to userId
  { name: "problem_mastery", field: "userId" },
  { name: "user_roadmaps", field: "userId" },
  { name: "analytics_events", field: "userId" },
]

/**
 * GET /api/admin/users
 * List all users with pagination
 *
 * PERFORMANCE: Uses Firestore cursor-based pagination when no search.
 * For search, loads up to MAX_SEARCH_RESULTS and filters in memory.
 */
const MAX_SEARCH_RESULTS = 1000 // Cap for search to prevent memory issues

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAccess(request)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 401)
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const search = searchParams.get("search") || ""
    const cursor = searchParams.get("cursor") || "" // For cursor-based pagination

    // Helper to map profile doc to user object
    const mapProfileToUser = (doc: FirebaseFirestore.DocumentSnapshot) => {
      const data = doc.data() || {}
      return {
        id: doc.id,
        email: data.email || "",
        full_name: data.full_name || "",
        subscription_tier: data.subscription_tier || "free",
        subscription_status: data.subscription_status || "none",
        created_at: data.created_at || "",
        updated_at: data.updated_at || "",
        onboarding_completed: data.onboarding_completed || false,
        stripe_customer_id: data.stripe_customer_id || null,
      }
    }

    // If search is provided, we need to load and filter in memory (Firestore limitation)
    if (search) {
      const searchLower = search.toLowerCase()

      // Load limited set of profiles for search
      const profilesSnap = await adminDb
        .collection("profiles")
        .orderBy("created_at", "desc")
        .limit(MAX_SEARCH_RESULTS)
        .get()

      let users = profilesSnap.docs.map(mapProfileToUser)

      // Filter by search query
      users = users.filter(
        (user) =>
          user.email.toLowerCase().includes(searchLower) ||
          user.full_name.toLowerCase().includes(searchLower) ||
          user.id.toLowerCase().includes(searchLower)
      )

      // Paginate filtered results
      const total = users.length
      const startIndex = (page - 1) * limit
      const paginatedUsers = users.slice(startIndex, startIndex + limit)

      return successResponse({
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          isSearchResult: true,
          searchCapped: profilesSnap.size >= MAX_SEARCH_RESULTS,
        },
      })
    }

    // No search: Use efficient Firestore cursor-based pagination
    let query = adminDb
      .collection("profiles")
      .orderBy("created_at", "desc")
      .limit(limit + 1) // Fetch one extra to check if there's a next page

    // Apply cursor if provided (for subsequent pages)
    if (cursor) {
      const cursorDoc = await adminDb.collection("profiles").doc(cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }

    const profilesSnap = await query.get()
    const hasNextPage = profilesSnap.size > limit
    const docs = hasNextPage ? profilesSnap.docs.slice(0, limit) : profilesSnap.docs
    const users = docs.map(mapProfileToUser)

    // Get next cursor (last doc id)
    const nextCursor = hasNextPage ? docs[docs.length - 1].id : null

    // Get total count (cached for performance - updates every few minutes)
    const countSnap = await adminDb.collection("profiles").count().get()
    const total = countSnap.data().count

    return successResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        nextCursor,
        hasNextPage,
      },
    })
  } catch (error: any) {
    logger.error("Error listing users", { error })
    return errorResponse(error.message || "Failed to list users", 500)
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user and all their data
 *
 * Features:
 * - Rate limiting (max 5 deletions per minute per admin)
 * - Idempotency (returns success if user already deleted)
 * - Protected emails (cannot delete certain accounts)
 * - Full audit logging
 */
export async function DELETE(request: NextRequest) {
  // Require MANAGE_USERS permission
  const authResult = await requirePermission(request, PERMISSIONS.MANAGE_USERS)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 401)
  }

  const adminId = authResult.context!.userId

  try {
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string') {
      return errorResponse("userId is required and must be a string", 400)
    }

    // Rate limiting check
    const rateCheck = checkRateLimit(adminId)
    if (!rateCheck.allowed) {
      logger.warn("Rate limit exceeded for user deletion", { adminId, userId })
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Too many deletion requests.",
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfter) },
        }
      )
    }

    // 1. Get user profile to check existence and protected status
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    const profileData = profileDoc.data()

    // Idempotency check: If user doesn't exist, return success (already deleted)
    if (!profileDoc.exists) {
      logger.info("User already deleted (idempotent)", { userId, adminId })
      return successResponse({
        message: "User not found or already deleted",
        userId,
        alreadyDeleted: true,
      })
    }

    // Protected email check
    if (profileData?.email && PROTECTED_EMAILS.includes(profileData.email.toLowerCase())) {
      logger.warn("Attempted to delete protected user", { userId, email: profileData.email, adminId })
      return errorResponse("This user account is protected and cannot be deleted", 403)
    }

    logger.info("Admin deleting user", { userId, email: profileData?.email, adminId })

    // 2. Cancel any active Stripe subscription
    if (profileData?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profileData.stripe_subscription_id)
        logger.info("Cancelled Stripe subscription", { userId, subscriptionId: profileData.stripe_subscription_id })
      } catch (stripeError) {
        logger.error("Failed to cancel Stripe subscription", { error: stripeError, subscriptionId: profileData.stripe_subscription_id })
      }
    }

    // 3. Delete all user data from Firestore collections
    const batch = adminDb.batch()
    let deletedDocCount = 0

    for (const col of collectionsToDelete) {
      try {
        // Collections where document ID is the userId
        if (col.name === "profiles" || col.name === "user_learning_state") {
          const docRef = adminDb.collection(col.name).doc(userId)
          const doc = await docRef.get()
          if (doc.exists) {
            batch.delete(docRef)
            deletedDocCount++
          }
        } else if (col.field) {
          // Query and delete documents by field
          const snapshot = await adminDb
            .collection(col.name)
            .where(col.field, "==", userId)
            .get()

          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref)
            deletedDocCount++
          })
        }
      } catch (colError) {
        logger.error("Error deleting from collection", { collection: col.name, error: colError })
      }
    }

    // Commit the batch delete
    await batch.commit()

    // 4. Delete user vectors from Pinecone (if configured)
    if (process.env.PINECONE_API_KEY) {
      try {
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
        const indexName = process.env.PINECONE_INDEX_NAME || "skillon-raggemini"
        const index = pinecone.index(indexName)

        const userNamespaces = [
          "mockmate_solution",
          "mockmate_feedback",
          "mockmate_hint",
          "mockmate_onboarding",
          "mockmate_general",
        ]

        for (const namespace of userNamespaces) {
          try {
            await index.namespace(namespace).deleteMany({
              filter: {
                $or: [
                  { userId: { $eq: userId } },
                  { user_id: { $eq: userId } },
                ],
              },
            })
          } catch (nsError) {
            // Namespace might not exist, continue
          }
        }
      } catch (pineconeError) {
        logger.error("Failed to delete Pinecone vectors", { error: pineconeError, userId })
      }
    }

    // 5. Delete the Firebase Auth user account
    let authDeleted = false
    try {
      await adminAuth.deleteUser(userId)
      authDeleted = true
      logger.info("Deleted Firebase Auth user", { userId })
    } catch (authDeleteError: any) {
      // User might already be deleted from Auth
      if (authDeleteError.code === 'auth/user-not-found') {
        authDeleted = true
        logger.info("Firebase Auth user already deleted", { userId })
      } else {
        logger.error("Failed to delete Firebase Auth user", { error: authDeleteError, userId })
      }
    }

    // 6. Log the admin action for audit trail
    await logAdminAction(adminId, 'delete_user', {
      targetUserId: userId,
      targetEmail: profileData?.email,
      targetTier: profileData?.subscription_tier,
      deletedDocuments: deletedDocCount,
      stripeSubscriptionCancelled: !!profileData?.stripe_subscription_id,
      authDeleted,
    })

    return successResponse({
      message: "User and all associated data have been permanently deleted",
      deletedDocuments: deletedDocCount,
      userId,
      email: profileData?.email,
    })
  } catch (error: any) {
    logger.error("Error deleting user", { error, adminId })
    return errorResponse(error.message || "Failed to delete user", 500)
  }
}

