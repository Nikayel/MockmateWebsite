/**
 * Admin Users API
 * 
 * GET: List all users with pagination
 * DELETE: Delete a user and all their data
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { verifyAdminAccess, successResponse, unauthorizedResponse, errorResponse } from "@/lib/admin/middleware"
import Stripe from "stripe"
import { Pinecone } from "@pinecone-database/pinecone"
import { logger } from "@/lib/logger"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
})

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
 */
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

    // Get all profiles
    const profilesSnap = await adminDb.collection("profiles").get()
    
    // Filter by search if provided
    let users = profilesSnap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email || "",
        full_name: data.full_name || data.display_name || "",
        subscription_tier: data.subscription_tier || "free",
        subscription_status: data.subscription_status || "none",
        created_at: data.created_at || "",
        updated_at: data.updated_at || "",
        onboarding_completed: data.onboarding_completed || false,
        stripe_customer_id: data.stripe_customer_id || null,
      }
    })

    // Filter by search query
    if (search) {
      const searchLower = search.toLowerCase()
      users = users.filter(
        (user) =>
          user.email.toLowerCase().includes(searchLower) ||
          user.full_name.toLowerCase().includes(searchLower) ||
          user.id.toLowerCase().includes(searchLower)
      )
    }

    // Sort by created_at descending (newest first)
    users.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })

    // Paginate
    const total = users.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUsers = users.slice(startIndex, endIndex)

    return successResponse({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
 */
export async function DELETE(request: NextRequest) {
  const authResult = await verifyAdminAccess(request)
  if (!authResult.authorized) {
    return unauthorizedResponse(authResult.error!, authResult.status || 401)
  }

  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return errorResponse("userId is required", 400)
    }

    logger.info("Admin deleting user", { userId, adminId: authResult.context?.userId })

    // 1. Get user profile to check for Stripe subscription
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    const profileData = profileDoc.data()

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
    try {
      await adminAuth.deleteUser(userId)
      logger.info("Deleted Firebase Auth user", { userId })
    } catch (authDeleteError) {
      logger.error("Failed to delete Firebase Auth user", { error: authDeleteError, userId })
    }

    return successResponse({
      message: "User and all associated data have been permanently deleted",
      deletedDocuments: deletedDocCount,
      userId,
    })
  } catch (error: any) {
    logger.error("Error deleting user", { error })
    return errorResponse(error.message || "Failed to delete user", 500)
  }
}

