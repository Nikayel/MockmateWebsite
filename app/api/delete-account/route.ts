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
import { deleteAllUserData } from "./delete-user-data"

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

    // 3. Delete all user data from Firestore.
    //
    // The collection map and the chunked execution both live in ./delete-user-data
    // and ./user-data-map. Deletes are chunked so the 500-op batch cap cannot be
    // hit, and per-collection failures are returned rather than swallowed: this
    // route must never claim a complete erasure it did not perform.
    const { deletedDocuments, failedCollections } = await deleteAllUserData(adminDb, userId)

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
          "mockmate_user-performance",
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
        failedCollections.push("pinecone")
      }
    }

    // 5. Delete the Firebase Auth user account.
    //
    // This one is not survivable. If the auth record remains, the person can
    // still sign in to an account whose data we just removed, and a fresh
    // profile gets built under the same uid on their next visit. Reporting
    // success in that state is the single most misleading thing this route
    // could do, so it fails loudly instead.
    try {
      await adminAuth.deleteUser(userId)
    } catch (authDeleteError) {
      logger.error("Failed to delete Firebase Auth user", { error: authDeleteError, userId })
      return NextResponse.json(
        {
          success: false,
          error:
            "We removed your stored data but could not close your sign-in account. Please contact privacy@codesparring.dev so we can finish the deletion.",
          deletedDocuments,
        },
        { status: 500 }
      )
    }

    // Honest reporting: only claim a complete erasure when every collection
    // actually completed. A partial deletion announced as total is worse than a
    // visible failure, because no one ever retries it.
    if (failedCollections.length > 0) {
      logger.error("Account deletion completed with failures", {
        userId,
        failedCollections,
        deletedDocuments,
      })

      return NextResponse.json({
        success: true,
        complete: false,
        message:
          "Your account is closed and most of your data is deleted, but some records could not be removed automatically. Our team has been alerted and will finish the deletion. Email privacy@codesparring.dev if you would like confirmation.",
        deletedDocuments,
        failedCollections,
      })
    }

    logger.info("Account deletion complete", { userId, deletedDocuments })

    return NextResponse.json({
      success: true,
      complete: true,
      message:
        "Your account and the data we hold for it have been permanently deleted. Stripe keeps its own record of any payments, as tax law requires.",
      deletedDocuments,
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
