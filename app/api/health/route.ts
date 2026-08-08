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
 * GET  /api/health - health status as JSON, 200 or 503
 * HEAD /api/health - the same checks, the same status code, no body
 *
 * HEAD runs the real checks. It used to return a bare 200 without touching
 * Firebase or Stripe, which made it a liveness probe for the Next.js process
 * and nothing else. HEAD is the default method for several uptime monitors,
 * so a monitor configured that way reported "up" through a total Firebase
 * outage: the request that was supposed to detect the incident was the one
 * request guaranteed to succeed.
 */

import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { verifyCronRequest } from "@/lib/cron-auth"

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
async function checkFirebase(): Promise<{
  status: "pass" | "fail" | "warn"
  latency: number
  message?: string
}> {
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
async function checkStripe(): Promise<{
  status: "pass" | "fail" | "warn"
  latency: number
  message?: string
}> {
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
      apiVersion: "2025-12-15.clover" as any,
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
  // The credentials this codebase actually reads (lib/firebase-admin.ts): one
  // service-account JSON blob + the public project id. The old FIREBASE_ADMIN_*
  // trio belonged to a naming scheme never used here, so this check reported
  // "unhealthy" permanently while the functional Firebase check passed.
  const requiredEnvVars = ["FIREBASE_SERVICE_ACCOUNT_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"]

  const optionalEnvVars = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "BREVO_API_KEY",
    "GEMINI_API_KEY",
    // The AI fallback vendor: missing means a Gemini outage has no net.
    "DEEPSEEK_API_KEY",
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

/** No-store on every health response: a cached 200 is a monitor that cannot see an outage. */
function healthHeaders(requestId: string): Record<string, string> {
  return {
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "X-Request-Id": requestId,
  }
}

/**
 * Run every check and reduce them to one status.
 *
 * Shared by GET and HEAD so the two methods can never disagree about whether the system is up. That
 * divergence is precisely the defect this replaced: HEAD answered 200 unconditionally while GET
 * correctly answered 503, so which failures were detectable depended on how the monitor was
 * configured.
 */
async function runHealthChecks(requestId: string): Promise<{
  healthStatus: HealthStatus
  httpStatus: number
}> {
  // Run health checks in parallel
  const [firebaseCheck, stripeCheck] = await Promise.all([checkFirebase(), checkStripe()])

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

  return { healthStatus, httpStatus: overallStatus === "unhealthy" ? 503 : 200 }
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    const { healthStatus, httpStatus } = await runHealthChecks(requestId)
    const overallStatus = healthStatus.status

    // API-LEAK-2: subsystem topology and check messages are internal-only.
    // Anonymous uptime monitors get the status word + HTTP code; the detailed
    // body requires the internal CRON_SECRET bearer (same check as cron).
    const internal = verifyCronRequest(request).ok
    const responseBody = internal
      ? healthStatus
      : { status: overallStatus, timestamp: healthStatus.timestamp }

    return NextResponse.json(responseBody, {
      status: httpStatus,
      headers: healthHeaders(requestId),
    })
  } catch (error) {
    logger.error("Health check failed", { requestId, error })

    // Error detail stays in logs; the body never echoes internals.
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: healthHeaders(requestId),
      }
    )
  }
}

/**
 * HEAD: the same checks as GET, the same status code, no body.
 *
 * This previously returned 200 without running anything, so it only ever proved that the Next.js
 * process could answer a request. HEAD is the default method for several uptime monitors, which
 * means a monitor pointed here reported "up" for the entire duration of a Firebase or Stripe
 * outage. The one request whose job was to notice the incident was the one request that could not
 * fail.
 *
 * Running the real checks makes HEAD as expensive as GET. That is the point: a cheap probe that
 * cannot observe the dependency it is probing has no value at any price.
 */
export async function HEAD() {
  const requestId = crypto.randomUUID()

  try {
    const { httpStatus } = await runHealthChecks(requestId)
    return new NextResponse(null, { status: httpStatus, headers: healthHeaders(requestId) })
  } catch (error) {
    logger.error("Health check failed", { requestId, error })
    return new NextResponse(null, { status: 503, headers: healthHeaders(requestId) })
  }
}
