/**
 * Delete Account API Route
 *
 * Handles GDPR-compliant account deletion requests.
 * Deletes all user data from Firestore and cancels any active subscriptions.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
})

export async function DELETE(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const idToken = authHeader.split("Bearer ")[1]

    // Verify the token and get user ID
    let userId: string
    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken)
      userId = decodedToken.uid
    } catch (error) {
      console.error("Token verification failed:", error)
      return NextResponse.json(
        { success: false, error: "Invalid authentication token" },
        { status: 401 }
      )
    }

    console.log(`Starting account deletion for user: ${userId}`)

    // 1. Get user profile to check for Stripe subscription
    const profileDoc = await adminDb.collection("profiles").doc(userId).get()
    const profileData = profileDoc.data()

    // 2. Cancel any active Stripe subscription
    if (profileData?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profileData.stripe_subscription_id)
        console.log(`Cancelled Stripe subscription: ${profileData.stripe_subscription_id}`)
      } catch (stripeError) {
        console.error("Failed to cancel Stripe subscription:", stripeError)
        // Continue with deletion even if Stripe cancellation fails
      }
    }

    // 3. Delete all user data from Firestore collections
    const batch = adminDb.batch()
    const collectionsToDelete = [
      { name: "profiles", field: null, docId: userId }, // Profile uses userId as doc ID
      { name: "sessions", field: "userId" },
      { name: "interview_sessions", field: "user_id" },
      { name: "profile_quota", field: "user_id" },
      { name: "session_vectors", field: "userId" },
      { name: "performance_profiles", field: "userId" },
      { name: "promo_code_usage", field: "userId" },
      { name: "analytics", field: "userId" },
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
        console.error(`Error deleting from ${col.name}:`, colError)
        // Continue with other collections
      }
    }

    // Commit the batch delete
    await batch.commit()
    console.log(`Deleted ${deletedDocCount} documents for user: ${userId}`)

    // 4. Delete the Firebase Auth user account
    try {
      await adminAuth.deleteUser(userId)
      console.log(`Deleted Firebase Auth user: ${userId}`)
    } catch (authDeleteError) {
      console.error("Failed to delete Firebase Auth user:", authDeleteError)
      // Data is already deleted, so consider this a success
    }

    return NextResponse.json({
      success: true,
      message: "Account and all associated data have been permanently deleted",
      deletedDocuments: deletedDocCount,
    })
  } catch (error) {
    console.error("Delete account error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete account",
      },
      { status: 500 }
    )
  }
}
