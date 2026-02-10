/**
 * Delete Account API Route
 *
 * Handles GDPR-compliant account deletion requests.
 * Deletes all user data from Firestore and cancels any active subscriptions.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"
import { Pinecone } from "@pinecone-database/pinecone"
import { logger } from "@/lib/logger"
import { sensitiveOperationRateLimit } from "@/lib/rate-limit"
import { csrfProtection } from "@/lib/csrf"

export const dynamic = "force-dynamic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover" as any,
})

export async function DELETE(request: NextRequest) {
  try {
    // SECURITY: CSRF protection for state-changing operation
    const csrfResult = csrfProtection(request)
    if (csrfResult) {
      logger.warn("Delete account CSRF validation failed", {
        ip: request.headers.get("x-forwarded-for") || "unknown",
      })
      return csrfResult
    }

    // SECURITY FIX: Apply strict rate limiting to prevent abuse
    const rateLimitResponse = await sensitiveOperationRateLimit(request)
    if (rateLimitResponse) {
      logger.warn("Delete account rate limit exceeded", {
        ip: request.headers.get("x-forwarded-for") || "unknown",
      })
      return rateLimitResponse
    }

    // Get authorization token
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]

    // Verify the token and get user ID
    let userId: string
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken)
      userId = decodedToken.uid
    } catch (error) {
      logger.error("Token verification failed", { error })
      return NextResponse.json(
        { success: false, error: "Invalid authentication token" },
        { status: 401 }
      )
    }

    logger.info("Starting account deletion", { userId })

    // 1. Get user profile to check for Stripe subscription
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    const profileData = profileDoc.data()

    // 2. Cancel any active Stripe subscription
    if (profileData?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profileData.stripe_subscription_id)
      } catch (stripeError) {
        logger.error("Failed to cancel Stripe subscription", {
          error: stripeError,
          subscriptionId: profileData.stripe_subscription_id,
        })
      }
    }

    // 3. Delete all user data from Firestore collections
    const batch = adminDb.batch()
    const collectionsToDelete = [
      { name: "profiles", field: null, docId: userId }, // Profile uses userId as doc ID
      { name: "sessions", field: "userId" },
      { name: "interview_sessions", field: "user_id" },
      { name: "profile_quota", field: "user_id" },
      { name: "payment_history", field: "user_id" },
      { name: "email_notifications", field: "user_id" },
      { name: "session_vectors", field: "userId" },
      { name: "performance_profiles", field: "userId" },
      { name: "promo_code_usage", field: "userId" },
      { name: "analytics", field: "userId" },
      { name: "user_learning_state", field: null, docId: userId }, // Doc ID is userId
      { name: "problem_mastery", field: "userId" },
      { name: "user_roadmaps", field: "userId" },
      { name: "analytics_events", field: "userId" },
      { name: "referral_relationships", field: "referrer_id" },
      { name: "referral_relationships", field: "referred_id" },
      { name: "referral_rewards", field: "user_id" },
      { name: "subscription_history", field: "user_id" },
      { name: "webhook_events", field: null }, // No user reference, skip
    ]

    let deletedDocCount = 0

    for (const col of collectionsToDelete) {
      try {
        if (col.docId) {
          // Delete specific document by ID
          const docRef = adminDb.collection(col.name).doc(col.docId)
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

    // 4. Delete user vectors from Pinecone (GDPR compliance)
    if (process.env.PINECONE_API_KEY) {
      try {
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
        const indexName = process.env.PINECONE_INDEX_NAME || "codesparring-rag"
        const index = pinecone.index(indexName)

        // Delete from all namespaces that might contain user data
        const userNamespaces = [
          "mockmate_solution",
          "mockmate_feedback",
          "mockmate_hint",
          "mockmate_onboarding",
          "mockmate_general",
        ]

        for (const namespace of userNamespaces) {
          try {
            // Delete vectors by userId metadata filter
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
    try {
      await adminAuth.deleteUser(userId)
    } catch (authDeleteError) {
      logger.error("Failed to delete Firebase Auth user", { error: authDeleteError, userId })
    }

    return NextResponse.json({
      success: true,
      message: "Account and all associated data have been permanently deleted",
      deletedDocuments: deletedDocCount,
    })
  } catch (error) {
    logger.error("Delete account error", { error })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete account",
      },
      { status: 500 }
    )
  }
}
