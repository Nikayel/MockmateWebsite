/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains subscription management logic and is not part of the MIT license.
 * All rights reserved.
 * 
 * Stripe helper functions for subscription management
 */

import Stripe from "stripe"
import { db } from "./firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { Profile } from "./types"
import { updateQuotaForSubscriptionTier } from "./firestore-helpers"

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
 * Sync user subscription status from Stripe
 * Checks Stripe subscription and updates Firestore profile accordingly
 */
export async function syncSubscriptionFromStripe(userId: string): Promise<Profile | null> {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      console.warn("Stripe not initialized - cannot sync subscription")
      // Return existing profile if Stripe is not configured
      const profileRef = doc(db, "profiles", userId)
      const profileSnap = await getDoc(profileRef)
      return profileSnap.exists() ? (profileSnap.data() as Profile) : null
    }

    // Get user profile
    const profileRef = doc(db, "profiles", userId)
    const profileSnap = await getDoc(profileRef)
    
    if (!profileSnap.exists()) {
      return null
    }

    const profile = profileSnap.data() as Profile
    const stripeSubscriptionId = profile.stripe_subscription_id as string | undefined
    const stripeCustomerId = profile.stripe_customer_id as string | undefined

    // If no Stripe IDs, user is free tier
    if (!stripeSubscriptionId && !stripeCustomerId) {
      return profile
    }

    let subscription: Stripe.Subscription | null = null

    // Try to get subscription by subscription ID first
    if (stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
      } catch (error) {
        console.error(`Error retrieving subscription ${stripeSubscriptionId}:`, error)
        // Subscription might not exist, try customer lookup
      }
    }

    // If subscription not found, try to find it via customer ID
    if (!subscription && stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: "all",
          limit: 1,
        })
        
        if (subscriptions.data.length > 0) {
          subscription = subscriptions.data[0]
        }
      } catch (error) {
        console.error(`Error listing subscriptions for customer ${stripeCustomerId}:`, error)
      }
    }

    // Determine subscription tier based on Stripe status
    let subscriptionTier: "free" | "pro" | "enterprise" = "free"
    let subscriptionStatus = "inactive"

    if (subscription) {
      // Check if subscription is active
      if (subscription.status === "active" || subscription.status === "trialing") {
        subscriptionTier = "pro"
        subscriptionStatus = subscription.status
        
        // Update profile with latest subscription info
        await setDoc(profileRef, {
          subscription_tier: "pro",
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          updated_at: new Date().toISOString(),
        }, { merge: true })

        // Update quota to Pro limit
        await updateQuotaForSubscriptionTier(userId, "pro")

        console.log(`Synced user ${userId} to Pro from Stripe subscription ${subscription.id}`)
      } else {
        // Subscription is canceled, past_due, etc. - downgrade to free
        subscriptionTier = "free"
        subscriptionStatus = subscription.status

        await setDoc(profileRef, {
          subscription_tier: "free",
          subscription_status: subscription.status,
          updated_at: new Date().toISOString(),
        }, { merge: true })

        // Update quota to free limit
        await updateQuotaForSubscriptionTier(userId, "free")

        console.log(`Synced user ${userId} to Free - subscription status: ${subscription.status}`)
      }
    } else {
      // No active subscription found - ensure user is free
      if (profile.subscription_tier === "pro") {
        await setDoc(profileRef, {
          subscription_tier: "free",
          subscription_status: "none",
          updated_at: new Date().toISOString(),
        }, { merge: true })

        await updateQuotaForSubscriptionTier(userId, "free")

        console.log(`Synced user ${userId} to Free - no active subscription found`)
      }
    }

    // Return updated profile
    const updatedProfileSnap = await getDoc(profileRef)
    return updatedProfileSnap.exists() ? (updatedProfileSnap.data() as Profile) : null
  } catch (error) {
    console.error(`Error syncing subscription for user ${userId}:`, error)
    // Return existing profile if sync fails
    const profileRef = doc(db, "profiles", userId)
    const profileSnap = await getDoc(profileRef)
    return profileSnap.exists() ? (profileSnap.data() as Profile) : null
  }
}

