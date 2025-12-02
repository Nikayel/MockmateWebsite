/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment webhook handling logic and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { updateQuotaForSubscriptionTier } from "@/lib/firestore-helpers"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia", // Use latest Stripe API version
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Check for idempotency - prevent processing the same event twice
  try {
    const { collection, doc: firestoreDoc, getDoc, setDoc } = await import("firebase/firestore")
    const processedEventRef = firestoreDoc(db, "webhook_events", event.id)
    const processedEventSnap = await getDoc(processedEventRef)

    if (processedEventSnap.exists()) {
      console.log(`Event ${event.id} already processed, skipping`)
      return NextResponse.json({ received: true, skipped: true })
    }

    // Mark event as processed
    await setDoc(processedEventRef, {
      event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
      created: event.created,
    })
  } catch (idempotencyError) {
    console.error("Error checking event idempotency:", idempotencyError)
    // Continue processing - idempotency check is not critical
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    // Process if payment was successful OR no payment required (100% discount coupon)
    // When a 100% discount coupon is applied, payment_status is "no_payment_required" not "paid"
    const paymentSuccessful = session.payment_status === "paid" || session.payment_status === "no_payment_required"

    if (paymentSuccessful && session.mode === "subscription") {
      // Upgrade user to Pro
      const userId = session.metadata?.userId || session.client_reference_id
      
      if (userId) {
        try {
          // Fetch subscription details to get dates
          let subscriptionStartDate: string | undefined
          let currentPeriodEnd: string | undefined
          
          if (session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string
              )
              subscriptionStartDate = subscription.created
                ? new Date(subscription.created * 1000).toISOString()
                : undefined
              currentPeriodEnd = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : undefined
            } catch (subError) {
              console.error("Error fetching subscription details:", subError)
              // Continue without dates if fetch fails
            }
          }

          const profileRef = doc(db, "profiles", userId)
          await setDoc(profileRef, {
            subscription_tier: "pro",
            subscription_platform: session.metadata?.platform || "website",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: "active",
            subscription_start_date: subscriptionStartDate,
            subscription_current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          }, { merge: true })

          // Update quota to reflect Pro subscription (35 sessions)
          await updateQuotaForSubscriptionTier(userId, "pro")

          console.log(`✅ User ${userId} upgraded to Pro via Stripe`)
          console.log(`   Payment Status: ${session.payment_status}`)
          console.log(`   Subscription ID: ${session.subscription}`)
          console.log(`   Customer ID: ${session.customer}`)
          console.log(`   Quota updated to Pro limit (35 sessions)`)
        } catch (error) {
          console.error("❌ Error updating user profile:", error)
          return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
        }
      } else {
        console.warn(`⚠️ checkout.session.completed event missing userId. Session ID: ${session.id}`)
      }
    } else {
      console.log(`ℹ️ Skipping checkout.session.completed - payment_status: ${session.payment_status}, mode: ${session.mode}`)
    }
  }

  // Handle subscription updates/cancellations
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription

    try {
      // Query Firestore to find user by subscription ID
      const { collection, query, where, getDocs } = await import("firebase/firestore")

      const profilesQuery = query(
        collection(db, "profiles"),
        where("stripe_subscription_id", "==", subscription.id)
      )

      const profilesSnap = await getDocs(profilesQuery)

      if (!profilesSnap.empty) {
        const profileDoc = profilesSnap.docs[0]
        const userId = profileDoc.id
        const profileRef = doc(db, "profiles", userId)

        // Check subscription status
        const isActive = subscription.status === "active"
        const isCanceled = event.type === "customer.subscription.deleted" ||
                          subscription.status === "canceled" ||
                          subscription.status === "unpaid"

        if (isCanceled) {
          // Downgrade to free tier
          await setDoc(profileRef, {
            subscription_tier: "free",
            subscription_status: subscription.status,
            subscription_current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : undefined,
            updated_at: new Date().toISOString(),
          }, { merge: true })

          // Reset quota to free tier limits
          await updateQuotaForSubscriptionTier(userId, "free")

          console.log(`User ${userId} downgraded to Free due to subscription ${subscription.status}`)
        } else if (isActive) {
          // Update subscription details (e.g., period end date)
          await setDoc(profileRef, {
            subscription_status: subscription.status,
            subscription_current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : undefined,
            updated_at: new Date().toISOString(),
          }, { merge: true })

          console.log(`User ${userId} subscription updated: ${subscription.status}`)
        }
      } else {
        console.warn(`No user found with subscription ID: ${subscription.id}`)
      }
    } catch (error) {
      console.error("Error handling subscription update/deletion:", error)
      return NextResponse.json({ error: "Failed to process subscription event" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

