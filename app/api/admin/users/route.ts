/**
 * Admin Users API
 *
 * GET: List all users with pagination
 * DELETE: Delete a user and all their data (with rate limiting and idempotency)
 */

import { NextRequest, NextResponse } from "next/server"
import { FieldPath } from "firebase-admin/firestore"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import {
  withPermission,
  requirePermission,
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/admin/middleware"
import { PERMISSIONS } from "@/lib/admin/rbac"
import { parseBoundedInt } from "@/lib/admin/query-params"
import { logAdminAction } from "@/lib/admin/audit"
import Stripe from "stripe"
import { Pinecone } from "@pinecone-database/pinecone"
import { logger } from "@/lib/logger"
import { rateLimit } from "@/lib/rate-limit"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover" as any,
})

// Distributed rate limiting for admin deletions (works across serverless instances)
const adminDeletionRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 100,
  maxRequests: 5, // Max 5 deletions per minute per admin
  prefix: "rl:admin-delete",
})

// Protected emails that cannot be deleted via API
// SECURITY: Load from environment variable instead of hardcoding in source
const PROTECTED_EMAILS = (process.env.ADMIN_PROTECTED_EMAILS || "")
  .split(",")
  .map((email: string) => email.trim().toLowerCase())
  .filter((email: string) => email.length > 0)

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
 * List all users with pagination (from Firebase Auth - includes Google, GitHub, etc.)
 *
 * Fetches from Firebase Auth (source of truth for all sign-ups) and merges with
 * Firestore profiles for subscription/onboarding data.
 */
const MAX_AUTH_USERS = 5000 // Cap to prevent timeout on listUsers
const AUTH_BATCH_SIZE = 1000 // Firebase listUsers max per call

function getAuthProvider(authUser: import("firebase-admin/auth").UserRecord): string {
  const provider = authUser.providerData?.[0]?.providerId
  if (provider === "google.com") return "google"
  if (provider === "github.com") return "github"
  return provider || "unknown"
}

export const GET = withPermission(PERMISSIONS.VIEW_USERS, async (request) => {
  try {
    if (!adminDb) {
      return errorResponse("Database not available", 503)
    }

    const { searchParams } = new URL(request.url)
    // The existing Math.min/Math.max pair did not survive garbage: parseInt("abc")
    // is NaN, and every comparison against NaN is false, so ?limit=abc produced
    // NaN and paginated to an empty slice with totalPages NaN.
    const pageParam = parseBoundedInt(searchParams.get("page"), {
      min: 1,
      max: 10_000,
      fallback: 1,
    })
    const limitParam = parseBoundedInt(searchParams.get("limit"), {
      min: 1,
      max: 100,
      fallback: 50,
    })
    if (!pageParam.ok || !limitParam.ok) {
      return errorResponse("page and limit must be integers", 400)
    }
    const page = pageParam.value
    const limit = limitParam.value
    const search = (searchParams.get("search") || "").toLowerCase()

    // 1. Fetch all users from Firebase Auth (Google, GitHub, etc.)
    const authUsers: import("firebase-admin/auth").UserRecord[] = []
    let pageToken: string | undefined

    do {
      const result = await adminAuth.listUsers(AUTH_BATCH_SIZE, pageToken)
      authUsers.push(...result.users)
      pageToken = result.pageToken
      if (authUsers.length >= MAX_AUTH_USERS) break
    } while (pageToken)

    // 2. Batch fetch profiles for these users (Firestore 'in' supports up to 30)
    const profileMap = new Map<string, FirebaseFirestore.DocumentData>()
    const PROFILE_BATCH = 30
    for (let i = 0; i < authUsers.length; i += PROFILE_BATCH) {
      const batch = authUsers.slice(i, i + PROFILE_BATCH)
      const ids = batch.map((u) => u.uid)
      const profilesSnap = await adminDb
        .collection("profiles")
        .where(FieldPath.documentId(), "in", ids)
        .get()
      profilesSnap.docs.forEach((doc) => profileMap.set(doc.id, doc.data()))
    }

    // 3. Merge auth + profile, sort by creation (newest first)
    let users = authUsers.map((authUser) => {
      const profile = profileMap.get(authUser.uid)
      const createdAt =
        authUser.metadata?.creationTime || profile?.created_at || new Date().toISOString()
      const email = authUser.email || profile?.email || ""
      return {
        id: authUser.uid,
        email,
        // Computed server-side from the non-public ADMIN_PROTECTED_EMAILS so
        // the client never ships the protected-admin list (DISCLOSE-1).
        is_protected: !!email && PROTECTED_EMAILS.includes(email.toLowerCase()),
        full_name: authUser.displayName || profile?.full_name || "",
        auth_provider: getAuthProvider(authUser),
        subscription_tier: profile?.subscription_tier || "free",
        subscription_status: profile?.subscription_status || "none",
        created_at: createdAt,
        updated_at: profile?.updated_at || "",
        onboarding_completed: profile?.onboarding_completed || false,
        stripe_customer_id: profile?.stripe_customer_id || null,
      }
    })

    users.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))

    // 4. Apply search filter
    if (search) {
      users = users.filter(
        (user) =>
          user.email.toLowerCase().includes(search) ||
          (user.full_name || "").toLowerCase().includes(search) ||
          user.id.toLowerCase().includes(search) ||
          (user.auth_provider || "").toLowerCase().includes(search)
      )
    }

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
        isSearchResult: !!search,
        searchCapped: authUsers.length >= MAX_AUTH_USERS,
      },
    })
  } catch (error: unknown) {
    logger.error("Error listing users", { error })
    return errorResponse("Failed to list users", 500)
  }
})

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

    if (!userId || typeof userId !== "string") {
      return errorResponse("userId is required and must be a string", 400)
    }

    // Distributed rate limiting check (works across serverless instances)
    const rateLimitResult = await adminDeletionRateLimit(request)
    if (rateLimitResult) {
      logger.warn("Rate limit exceeded for user deletion", { adminId, userId })
      return rateLimitResult
    }

    // 1. Get user profile and auth user for protected check
    const [profileDoc, authUser] = await Promise.all([
      adminDb.collection("profiles").doc(userId).get(),
      adminAuth.getUser(userId).catch(() => null),
    ])
    const profileData = profileDoc.exists ? profileDoc.data() : null

    // Idempotency: If neither profile nor auth user exists, already deleted
    if (!profileDoc.exists && !authUser) {
      logger.info("User already deleted (idempotent)", { userId, adminId })
      return successResponse({
        message: "User not found or already deleted",
        userId,
        alreadyDeleted: true,
      })
    }

    const emailForCheck = profileData?.email || authUser?.email || ""
    if (emailForCheck && PROTECTED_EMAILS.includes(emailForCheck.toLowerCase())) {
      logger.warn("Attempted to delete protected user", {
        userId,
        email: emailForCheck,
        adminId,
      })
      return errorResponse("This user account is protected and cannot be deleted", 403)
    }

    logger.info("Admin deleting user", { userId, email: emailForCheck, adminId })

    // 2. Cancel any active Stripe subscription
    if (profileData?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profileData.stripe_subscription_id)
        logger.info("Cancelled Stripe subscription", {
          userId,
          subscriptionId: profileData.stripe_subscription_id,
        })
      } catch (stripeError) {
        logger.error("Failed to cancel Stripe subscription", {
          error: stripeError,
          subscriptionId: profileData.stripe_subscription_id,
        })
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
          const snapshot = await adminDb.collection(col.name).where(col.field, "==", userId).get()

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
        const indexName = process.env.PINECONE_INDEX_NAME || "codesparring-rag"
        const index = pinecone.index(indexName)

        const userNamespaces = [
          "mockmate_solution",
          "mockmate_feedback",
          "mockmate_hint",
          "mockmate_onboarding",
          "mockmate_user-performance",
          "mockmate_general",
        ]

        for (const namespace of userNamespaces) {
          try {
            await index.namespace(namespace).deleteMany({
              filter: {
                $or: [{ userId: { $eq: userId } }, { user_id: { $eq: userId } }],
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
      if (authDeleteError.code === "auth/user-not-found") {
        authDeleted = true
        logger.info("Firebase Auth user already deleted", { userId })
      } else {
        logger.error("Failed to delete Firebase Auth user", { error: authDeleteError, userId })
      }
    }

    // 6. Log the admin action for audit trail.
    //
    // The context and the request are passed, not the bare uid. Called with a uid
    // string the helper records adminEmail, ip and userAgent as null, and this is
    // the most sensitive action the platform has: an irreversible deletion of
    // somebody's account and every document attached to it. "Some admin did this"
    // is not an answer an audit log should be able to give here.
    await logAdminAction(
      authResult.context!,
      "delete_user",
      {
        targetUserId: userId,
        targetEmail: emailForCheck,
        targetTier: profileData?.subscription_tier,
        deletedDocuments: deletedDocCount,
        stripeSubscriptionCancelled: !!profileData?.stripe_subscription_id,
        authDeleted,
      },
      {
        request,
        target: { type: "profiles", id: userId, label: emailForCheck ?? null },
      }
    )

    return successResponse({
      message: "User and all associated data have been permanently deleted",
      deletedDocuments: deletedDocCount,
      userId,
      email: emailForCheck,
    })
  } catch (error: unknown) {
    // Deletion touches Stripe and Pinecone; their messages name customer ids,
    // index hosts and API versions, so only the log gets the detail.
    logger.error("Error deleting user", { error, adminId })
    return errorResponse("Failed to delete user", 500)
  }
}
