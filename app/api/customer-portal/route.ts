/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment processing logic and is not part of the MIT license.
 * All rights reserved.
 */

import { NextRequest, NextResponse } from "next/server"
import { getUserIdFromRequest } from "@/lib/auth-server"
import { adminDb } from "@/lib/firebase-admin"
import { Profile } from "@/lib/types"
import Stripe from "stripe"
import { logger } from "@/lib/logger"
import { syncSubscriptionFromStripe } from "@/lib/stripe-helpers"
import { sensitiveOperationRateLimit } from "@/lib/rate-limit"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover" as any,
})

// Mark route as dynamic to avoid build-time issues with server-only packages
export const dynamic = "force-dynamic"

/**
 * API endpoint to create a Stripe Customer Portal session
 * Allows users to manage their subscription, update payment methods, and cancel
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  const rateLimitResponse = await sensitiveOperationRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    // Get user ID from Firebase ID token in Authorization header
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      logger.warn("Customer portal: Unauthorized - no valid user ID", {
        hasAuthHeader: !!request.headers.get("authorization"),
      })

      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication failed. Please sign in again.",
        },
        { status: 401 }
      )
    }

    // Get user profile to find Stripe customer ID
    // Use Admin SDK to bypass security rules (we've already verified the user is authenticated)
    const profileRef = adminDb.collection("profiles").doc(userId)
    const profileSnap = await profileRef.get()

    if (!profileSnap.exists) {
      logger.error("Customer portal: Profile not found", { userId })
      return NextResponse.json(
        {
          error: "Profile not found",
          message: "User profile does not exist. Please contact support.",
        },
        { status: 404 }
      )
    }

    const profile = profileSnap.data() as Profile
    let stripeCustomerId = profile.stripe_customer_id
    const subscriptionType = profile.subscription_type as string | undefined
    const userEmail = profile.email

    logger.info("Customer portal: Processing request", {
      userId,
      hasCustomerId: !!stripeCustomerId,
      subscriptionType,
      subscriptionTier: profile.subscription_tier,
    })

    // STEP 1: If customer ID is missing but we have a subscription ID, try to get it from Stripe
    if (!stripeCustomerId && profile.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
        stripeCustomerId = subscription.customer as string

        // Update profile with customer ID for future use
        if (stripeCustomerId) {
          await profileRef.update({
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString(),
          })
          logger.info("Customer portal: Retrieved customer ID from subscription", {
            userId,
            customerId: stripeCustomerId,
          })
        }
      } catch (stripeError) {
        logger.error("Customer portal: Failed to retrieve subscription from Stripe", {
          error: stripeError,
        })
      }
    }

    // STEP 2: Validate customer ID exists in Stripe before using it
    if (stripeCustomerId) {
      try {
        // Verify customer exists in Stripe
        await stripe.customers.retrieve(stripeCustomerId)
      } catch (stripeError: any) {
        // Customer doesn't exist - clear it from profile
        if (stripeError?.code === "resource_missing") {
          logger.warn("Customer portal: Invalid customer ID, clearing from profile", {
            userId,
            invalidCustomerId: stripeCustomerId,
          })

          // Clear invalid customer ID
          await profileRef.update({
            stripe_customer_id: null,
            updated_at: new Date().toISOString(),
          })

          stripeCustomerId = undefined

          // Try to recover from subscription ID if available (monthly plans)
          if (profile.stripe_subscription_id) {
            try {
              const subscription = await stripe.subscriptions.retrieve(
                profile.stripe_subscription_id
              )
              const validCustomerId = subscription.customer as string

              // Verify this customer exists
              await stripe.customers.retrieve(validCustomerId)

              // Update with valid customer ID
              await profileRef.update({
                stripe_customer_id: validCustomerId,
                updated_at: new Date().toISOString(),
              })

              stripeCustomerId = validCustomerId
              logger.info("Customer portal: Recovered valid customer ID from subscription", {
                userId,
              })
            } catch (recoveryError) {
              logger.error("Customer portal: Failed to recover customer ID from subscription", {
                error: recoveryError,
              })
            }
          }
        } else {
          // Re-throw non-resource_missing errors
          throw stripeError
        }
      }
    }

    // STEP 3: If still no customer ID, try to find by email (with userId verification)
    if (!stripeCustomerId && userEmail) {
      logger.info("Customer portal: Searching for customer by email", { userId, email: userEmail })
      try {
        const customers = await stripe.customers.list({
          email: userEmail,
          limit: 10,
        })

        // First, look for a customer with matching userId in metadata (safest)
        const matchingCustomer = customers.data.find((c) => c.metadata?.userId === userId)

        if (matchingCustomer) {
          // Verify customer is valid
          try {
            await stripe.customers.retrieve(matchingCustomer.id)
            stripeCustomerId = matchingCustomer.id

            // Update profile with found customer ID
            await profileRef.update({
              stripe_customer_id: stripeCustomerId,
              updated_at: new Date().toISOString(),
            })

            logger.info("Customer portal: Found customer with matching userId metadata", {
              userId,
              customerId: stripeCustomerId,
            })
          } catch {
            logger.warn("Customer portal: Matching customer is invalid", {
              customerId: matchingCustomer.id,
            })
          }
        } else if (customers.data.length === 1) {
          // Exactly one Stripe customer shares this (verified) email and none
          // matched on metadata.userId. Linking by email is only safe for legacy
          // customers that carry NO owner metadata. If the customer is already
          // owned by a DIFFERENT user, refuse — otherwise this user could open a
          // billing portal onto someone else's payment methods/invoices.
          const singleCustomer = customers.data[0]
          const customerOwner = singleCustomer.metadata?.userId
          if (customerOwner && customerOwner !== userId) {
            logger.warn("Customer portal: Single email match owned by another user - not linking", {
              userId,
              customerId: singleCustomer.id,
            })
          } else {
            try {
              await stripe.customers.retrieve(singleCustomer.id)
              stripeCustomerId = singleCustomer.id

              // Update profile with found customer ID
              await profileRef.update({
                stripe_customer_id: stripeCustomerId,
                updated_at: new Date().toISOString(),
              })

              logger.info("Customer portal: Found single customer by email (no metadata match)", {
                userId,
                customerId: stripeCustomerId,
              })
            } catch {
              logger.warn("Customer portal: Single customer is invalid", {
                customerId: singleCustomer.id,
              })
            }
          }
        } else if (customers.data.length > 1) {
          // Multiple customers with same email but no userId match - can't safely determine which
          logger.warn(
            "Customer portal: Multiple customers with email, none match userId - cannot auto-link",
            {
              userId,
              email: userEmail,
              customerCount: customers.data.length,
            }
          )
        }
      } catch (emailSearchError) {
        logger.error("Customer portal: Email search failed", { error: emailSearchError })
      }
    }

    // STEP 4: If STILL no customer ID and user is Pro, try sync
    if (!stripeCustomerId && profile.subscription_tier === "pro") {
      logger.info("Customer portal: Attempting automatic sync for Pro user", {
        userId,
        subscriptionType,
      })

      try {
        // Attempt to sync subscription from Stripe
        const syncedProfile = await syncSubscriptionFromStripe(userId)

        if (syncedProfile?.stripe_customer_id) {
          // Sync successful - validate the customer ID before using it
          try {
            await stripe.customers.retrieve(syncedProfile.stripe_customer_id)
            stripeCustomerId = syncedProfile.stripe_customer_id
            logger.info("Customer portal: Sync successful, validated customer ID", {
              userId,
              customerId: stripeCustomerId,
            })
          } catch (validationError) {
            logger.error("Customer portal: Synced customer ID is invalid", {
              userId,
              customerId: syncedProfile.stripe_customer_id,
              error: validationError,
            })
          }
        }
      } catch (syncError) {
        logger.error("Customer portal: Automatic sync failed", { userId, error: syncError })
      }
    }

    // STEP 5: Final check - if still no customer ID, return appropriate error
    if (!stripeCustomerId) {
      logger.warn("Customer portal: No Stripe customer ID after all recovery attempts", {
        userId,
        subscriptionTier: profile.subscription_tier,
        subscriptionType,
        hasEmail: !!userEmail,
      })

      if (profile.subscription_tier === "pro") {
        // Pro user but can't find customer - contact support
        const isYearly = subscriptionType === "yearly"
        return NextResponse.json(
          {
            error: "Subscription data incomplete",
            message: isYearly
              ? "Your yearly subscription billing information could not be found. Please contact support@codesparring.dev for assistance."
              : "Your subscription information is incomplete. Please try 'Sync Subscription Status' or contact support@codesparring.dev if the issue persists.",
          },
          { status: 400 }
        )
      } else {
        // Not Pro user - no subscription to manage
        return NextResponse.json(
          {
            error: "No active subscription found",
            message: "You don't have an active subscription to manage.",
          },
          { status: 400 }
        )
      }
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile`,
    })

    return NextResponse.json({
      success: true,
      url: session.url,
    })
  } catch (error) {
    logger.error("Customer portal error", { error })

    // Check for Stripe-specific errors
    if (error instanceof Error && error.message.includes("No such customer")) {
      return NextResponse.json(
        {
          error: "Stripe customer not found",
          message: "Your subscription information could not be found. Please contact support.",
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create portal session",
        message:
          "An error occurred while opening the subscription portal. Please try again or contact support.",
      },
      { status: 500 }
    )
  }
}
