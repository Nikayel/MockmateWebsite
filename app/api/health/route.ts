/**
 * Health Check Endpoint
 *
 * Provides system health status for uptime monitoring.
 * Returns status of critical services:
 * - Firebase Admin SDK
 * - Stripe API
 * - External services (optional)
 *
 * Usage:
 * GET /api/health - Returns health status
 */

import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  uptime: number
  checks: {
    [key: string]: {
      status: "pass" | "fail" | "warn"
      message?: string
      latency?: number
    }
  }
}

// Track server start time for uptime calculation
const startTime = Date.now()

/**
 * Check Firebase Admin SDK health
 */
async function checkFirebase(): Promise<{ status: "pass" | "fail" | "warn"; latency: number; message?: string }> {
  const start = Date.now()
  try {
    const { adminDb } = await import("@/lib/firebase-admin")
    // Simple read to verify connection
    await adminDb.collection("system").doc("health").get()
    return {
      status: "pass",
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      status: "fail",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Check Stripe API health
 */
async function checkStripe(): Promise<{ status: "pass" | "fail" | "warn"; latency: number; message?: string }> {
  const start = Date.now()
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        status: "warn",
        latency: Date.now() - start,
        message: "STRIPE_SECRET_KEY not configured",
      }
    }

    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia",
    })

    // Simple API call to verify connection
    await stripe.products.list({ limit: 1 })
    return {
      status: "pass",
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      status: "fail",
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Check environment configuration
 * SECURITY: Never expose which environment variables are missing to prevent information disclosure
 */
function checkEnvironment(): { status: "pass" | "fail" | "warn"; message?: string } {
  const requiredEnvVars = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
  ]

  const optionalEnvVars = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "BREVO_API_KEY",
    "GEMINI_API_KEY",
  ]

  const missingRequiredCount = requiredEnvVars.filter((v) => !process.env[v]).length
  const missingOptionalCount = optionalEnvVars.filter((v) => !process.env[v]).length

  // SECURITY: Use generic messages - don't expose which variables are missing
  if (missingRequiredCount > 0) {
    return {
      status: "fail",
      message: "Required configuration missing",
    }
  }

  if (missingOptionalCount > 0) {
    return {
      status: "warn",
      message: "Some optional features not configured",
    }
  }

  return { status: "pass" }
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    // Run health checks in parallel
    const [firebaseCheck, stripeCheck] = await Promise.all([
      checkFirebase(),
      checkStripe(),
    ])

    const envCheck = checkEnvironment()

    // Determine overall status
    const checks = {
      firebase: firebaseCheck,
      stripe: stripeCheck,
      environment: envCheck,
    }

    const hasFailure = Object.values(checks).some((c) => c.status === "fail")
    const hasWarning = Object.values(checks).some((c) => c.status === "warn")

    const overallStatus: "healthy" | "degraded" | "unhealthy" = hasFailure
      ? "unhealthy"
      : hasWarning
      ? "degraded"
      : "healthy"

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    }

    // Log health check (only log issues)
    if (overallStatus !== "healthy") {
      logger.warn("Health check returned non-healthy status", {
        requestId,
        status: overallStatus,
        checks,
      })
    }

    // Return appropriate HTTP status
    const httpStatus = overallStatus === "unhealthy" ? 503 : 200

    return NextResponse.json(healthStatus, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Request-Id": requestId,
      },
    })
  } catch (error) {
    logger.error("Health check failed", { requestId, error })

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Request-Id": requestId,
        },
      }
    )
  }
}

// HEAD request for simple uptime checks
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
