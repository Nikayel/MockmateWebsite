/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains subscription management logic and is not part of the MIT license.
 * All rights reserved.
 *
 * Stripe helper functions for subscription management
 * Uses Firebase Admin SDK for server-side writes (bypasses security rules)
 */

import Stripe from "stripe"
import { adminDb } from "./firebase-admin"
import { Profile } from "./types"
import { PRICING_CONFIG } from "./config"

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null
try {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (secretKey) {
    stripe = new Stripe(secretKey, {
      apiVersion: "2024-11-20.acacia",
    })
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error)
}

/**
 * Update user quota for subscription tier using Admin SDK
 */
async function updateQuotaForSubscriptionTierAdmin(userId: string, subscriptionTier: "free" | "pro" | "enterprise"): Promise<void> {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const sessionsLimit = subscriptionTier === "pro"
    ? PRICING_CONFIG.pro.sessionsPerMonth
    : PRICING_CONFIG.free.sessionsPerMonth

  // Query for existing quota
  const quotaSnapshot = await adminDb.collection("profile_quota")
    .where("user_id", "==", userId)
    .get()

  // Find current period quota
  let currentQuotaDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null
  quotaSnapshot.docs.forEach(doc => {
    const data = doc.data()
    const quotaStart = new Date(data.period_start)
    if (quotaStart >= periodStart && quotaStart <= periodEnd) {
      currentQuotaDoc = doc
    }
  })

  if (currentQuotaDoc) {
    // Update existing quota
    await currentQuotaDoc.ref.update({
      sessions_limit: sessionsLimit,
      updated_at: new Date().toISOString(),
    })
    console.log(`Updated quota for user ${userId}: ${sessionsLimit} sessions`)
  } else {
    // Create new quota
    await adminDb.collection("profile_quota").add({
      user_id: userId,
      sessions_used: 0,
      sessions_limit: sessionsLimit,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    console.log(`Created quota for user ${userId}: ${sessionsLimit} sessions`)
  }
}

/**
 * Sync user subscription status from Stripe
 * Checks Stripe subscription and updates Firestore profile accordingly
 * Uses Firebase Admin SDK to bypass security rules for server-side operations
 *
 * IMPORTANT: This function now searches for subscriptions by:
 * 1. Existing stripe_subscription_id in profile
 * 2. Existing stripe_customer_id in profile
 * 3. User's email address (for new subscribers who haven't been linked yet)
 */
export async function syncSubscriptionFromStripe(userId: string): Promise<Profile | null> {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.warn("Stripe not initialized - cannot sync subscription")
      const profileRef = adminDb.collection("profiles").doc(userId)
      const profileSnap = await profileRef.get()
      return profileSnap.exists ? (profileSnap.data() as Profile) : null
    }

    // Get user profile using Admin SDK
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (!profileSnap.exists) {
      console.error(`Profile not found for user ${userId}`)
      return null
    }

    const profile = profileSnap.data() as Profile
    const stripeSubscriptionId = profile.stripe_subscription_id as string | undefined
    const stripeCustomerId = profile.stripe_customer_id as string | undefined
    const userEmail = profile.email

    console.log(`Syncing subscription for user ${userId}`)
    console.log(`  - Has stripe_subscription_id: ${!!stripeSubscriptionId}`)
    console.log(`  - Has stripe_customer_id: ${!!stripeCustomerId}`)
    console.log(`  - User email: ${userEmail}`)

    let subscription: Stripe.Subscription | null = null
    let customerId: string | null = stripeCustomerId || null

    // Step 1: Try to get subscription by existing subscription ID
    if (stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
        customerId = subscription.customer as string
        console.log(`Found subscription by ID: ${stripeSubscriptionId}`)
      } catch (error) {
        console.error(`Error retrieving subscription ${stripeSubscriptionId}:`, error)
      }
    }

    // Step 2: If no subscription found, try to find via existing customer ID
    if (!subscription && stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "all",
          limit: 1,
        })

        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0]
          console.log(`Found subscription via customer ID: ${stripeCustomerId}`)
        }
      } catch (error) {
        console.error(`Error listing subscriptions for customer ${stripeCustomerId}:`, error)
      }
    }

    // Step 3: If STILL no subscription found, search by user's email
    // This is critical for NEW subscribers who just completed checkout
    if (!subscription && userEmail) {
      console.log(`Searching for Stripe customer by email: ${userEmail}`)
      try {
        // Search for customers with this email
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 10, // Get multiple in case of duplicates
        })

        console.log(`Found ${customers.data.length} customers with email ${userEmail}`)

        // Check each customer for an active subscription
        for (const customer of customers.data) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
            limit: 1,
          })

          if (subscriptions.data.length > 0) {
            subscription = subscriptions.data[0]
            customerId = customer.id
            console.log(`Found active subscription for customer ${customer.id}`)
            break
          }

          // Also check for trialing subscriptions
          const trialingSubscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: "trialing",
            limit: 1,
          })

          if (trialingSubscriptions.data.length > 0) {
            subscription = trialingSubscriptions.data[0]
            customerId = customer.id
            console.log(`Found trialing subscription for customer ${customer.id}`)
            break
          }
        }
      } catch (error) {
        console.error(`Error searching customers by email ${userEmail}:`, error)
      }
    }

    // Now process the subscription (or lack thereof)
    if (subscription) {
      console.log(`Processing subscription: ${subscription.id}, status: ${subscription.status}`)

      // Check if subscription is active
      if (subscription.status === "active" || subscription.status === "trialing") {
        // Extract subscription dates
        const subscriptionStartDate = subscription.created
          ? new Date(subscription.created * 1000).toISOString()
          : undefined
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : undefined

        // Update profile with subscription info
        await profileRef.set({
          subscription_tier: "pro",
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          subscription_start_date: subscriptionStartDate,
          subscription_current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        }, { merge: true })

        // Update quota to Pro limit
        await updateQuotaForSubscriptionTierAdmin(userId, "pro")

        console.log(`✅ Synced user ${userId} to Pro from Stripe subscription ${subscription.id}`)
      } else {
        // Subscription is canceled, past_due, etc. - downgrade to free
        await profileRef.set({
          subscription_tier: "free",
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        }, { merge: true })

        // Update quota to free limit
        await updateQuotaForSubscriptionTierAdmin(userId, "free")

        console.log(`Synced user ${userId} to Free - subscription status: ${subscription.status}`)
      }
    } else {
      console.log(`No subscription found for user ${userId}`)

      // No subscription found - if user was Pro, downgrade them
      if (profile.subscription_tier === "pro") {
        await profileRef.set({
          subscription_tier: "free",
          subscription_status: "none",
          updated_at: new Date().toISOString(),
        }, { merge: true })

        await updateQuotaForSubscriptionTierAdmin(userId, "free")

        console.log(`Synced user ${userId} to Free - no active subscription found`)
      }
    }

    // Return updated profile
    const updatedProfileSnap = await profileRef.get()
    return updatedProfileSnap.exists ? (updatedProfileSnap.data() as Profile) : null
  } catch (error) {
    console.error(`Error syncing subscription for user ${userId}:`, error)
    throw error
  }
}
