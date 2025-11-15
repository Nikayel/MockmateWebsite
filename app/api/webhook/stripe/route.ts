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

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    
    // Only process if payment was successful (for subscriptions, this means subscription was created)
    if (session.payment_status === "paid" && session.mode === "subscription") {
      // Upgrade user to Pro
      const userId = session.metadata?.userId || session.client_reference_id
      
      if (userId) {
        try {
          const profileRef = doc(db, "profiles", userId)
          await setDoc(profileRef, {
            subscription_tier: "pro",
            subscription_platform: session.metadata?.platform || "website",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: "active",
            updated_at: new Date().toISOString(),
          }, { merge: true })

          // Update quota to reflect Pro subscription (35 sessions)
          await updateQuotaForSubscriptionTier(userId, "pro")

          console.log(`User ${userId} upgraded to Pro via Stripe`)
          console.log(`Subscription ID: ${session.subscription}`)
          console.log(`Customer ID: ${session.customer}`)
          console.log(`Quota updated to Pro limit (35 sessions)`)
        } catch (error) {
          console.error("Error updating user profile:", error)
          return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
        }
      }
    }
  }

  // Handle subscription updates/cancellations
  if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription
    
    // Find user by subscription ID and update their tier
    // This would require querying Firestore by subscription_id
    // For now, we'll handle it in a separate function if needed
  }

  return NextResponse.json({ received: true })
}

