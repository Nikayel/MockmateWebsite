/**
 * Production-ready logger utility with external service support
 *
 * Features:
 * - Structured logging with context
 * - Automatic error capture and reporting
 * - Support for external logging services (Sentry, LogFlare, etc.)
 * - Request ID tracking for distributed tracing
 *
 * In development: Logs to console
 * In production: Logs errors to configured external services
 */

// Direct (non-lazy) import: report-client-error.ts imports nothing, so there is
// no cycle back into this module and no chunk to fetch at error time (a page
// that is already broken may fail to load a lazy chunk). The module is
// isomorphic - it touches window/navigator only inside the function body - so
// pulling it into server and Edge bundles is inert.
import { reportClientError } from "@/components/monitoring/report-client-error"

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  [key: string]: unknown
}

// ============================================
// PII Redaction
// ============================================

const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: "[EMAIL]" },
  // Phone numbers (various formats)
  { pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: "[PHONE]" },
  // Credit card numbers (basic pattern)
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: "[CARD]" },
  // SSN
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: "[SSN]" },
  // IP addresses
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: "[IP]" },
  // JWT tokens (base64 encoded)
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, replacement: "[JWT]" },
  // API keys and tokens (common patterns)
  {
    pattern: /\b(sk_live_|sk_test_|pk_live_|pk_test_)[a-zA-Z0-9]+\b/g,
    replacement: "[STRIPE_KEY]",
  },
  {
    pattern: /\b(api_key|apikey|api-key)["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{16,}/gi,
    replacement: "[API_KEY]",
  },
]

// Fields that should always be redacted
const SENSITIVE_FIELDS = new Set([
  "password",
  "passwd",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "authorization",
  "auth",
  "credential",
  "credentials",
  "ssn",
  "socialSecurityNumber",
  "creditCard",
  "cardNumber",
  "cvv",
  "cvc",
  "pin",
  "bankAccount",
  "routingNumber",
])

/**
 * Redact PII from a string value
 */
function redactPIIFromString(value: string): string {
  let redacted = value
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement)
  }
  return redacted
}

/**
 * Recursively redact PII from an object
 */
function redactPII(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return "[MAX_DEPTH]"

  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === "string") {
    return redactPIIFromString(obj)
  }

  if (typeof obj === "number" || typeof obj === "boolean") {
    return obj
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: redactPIIFromString(obj.message),
      stack: obj.stack ? redactPIIFromString(obj.stack) : undefined,
    }
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactPII(item, depth + 1))
  }

  if (typeof obj === "object") {
    const redacted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Check if this is a sensitive field name
      if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
        redacted[key] = "[REDACTED]"
      } else {
        redacted[key] = redactPII(value, depth + 1)
      }
    }
    return redacted
  }

  return obj
}

interface ErrorContext extends LogContext {
  error?: Error | unknown
  userId?: string
  requestId?: string
  endpoint?: string
  statusCode?: number
  duration?: number
}

const isDev = process.env.NODE_ENV === "development"
const isTest = process.env.NODE_ENV === "test"

// Error aggregation to prevent spam
const errorCounts = new Map<string, { count: number; lastSeen: number }>()
const ERROR_AGGREGATE_WINDOW = 60000 // 1 minute
const ERROR_AGGREGATE_THRESHOLD = 5 // Log details after 5 occurrences in window

/**
 * Generate a unique error fingerprint for aggregation
 */
function getErrorFingerprint(message: string, context?: LogContext): string {
  const contextKey = context?.endpoint || context?.error?.toString() || ""
  return `${message}:${contextKey}`.slice(0, 100)
}

/**
 * Check if we should log full error details or aggregate
 */
function shouldLogFullDetails(fingerprint: string): boolean {
  const now = Date.now()
  const entry = errorCounts.get(fingerprint)

  if (!entry || now - entry.lastSeen > ERROR_AGGREGATE_WINDOW) {
    errorCounts.set(fingerprint, { count: 1, lastSeen: now })
    return true
  }

  entry.count++
  entry.lastSeen = now

  // Log every Nth occurrence
  if (entry.count % ERROR_AGGREGATE_THRESHOLD === 0) {
    return true
  }

  return false
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  // Always redact PII from context before logging
  const safeContext = context ? redactPII(context) : undefined
  const safeMessage = redactPIIFromString(message)
  const contextStr = safeContext ? ` ${JSON.stringify(safeContext)}` : ""
  return `[${timestamp}] [${level.toUpperCase()}] ${safeMessage}${contextStr}`
}

function shouldLog(level: LogLevel): boolean {
  if (isTest) return false // Silence logs in tests
  if (isDev) return true
  // In production, only log warnings and errors
  return level === "warn" || level === "error"
}

/**
 * Map our log levels to Sentry severity levels.
 */
function toSentryLevel(level: LogLevel): "debug" | "info" | "warning" | "error" {
  return level === "warn" ? "warning" : level
}

/**
 * The deployment environment as Sentry should label it.
 *
 * NODE_ENV is "production" for preview deployments too, which made every
 * preview error look like a production incident. VERCEL_ENV is the only value
 * that separates production / preview / development.
 */
function resolveEnvironment(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "production"
}

/**
 * Vercel's request context, published on globalThis under a well-known symbol.
 * This is the same channel `@vercel/functions`' `waitUntil` reads.
 */
const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context")

interface VercelRequestContext {
  get?: () => { waitUntil?: (promise: Promise<unknown>) => void } | undefined
}

/**
 * Keep the serverless instance alive until a fire-and-forget delivery settles.
 *
 * Vercel freezes a function instance the moment its handler returns and kills
 * any fetch still in flight, so the errors most likely to be dropped are the
 * ones logged immediately before returning a 500 - exactly the ones worth
 * keeping. `@vercel/functions` exports `waitUntil` for this, but it is not a
 * dependency here and observability does not justify adding one, so we read the
 * same request context it reads.
 *
 * Off-Vercel (local Node, Edge outside a request, the browser, tests) the
 * symbol is absent and the promise is left floating. That is the correct
 * degradation: those runtimes do not freeze work mid-flight.
 */
function keepAliveUntilSettled(delivery: Promise<unknown>): void {
  // The logger must never be the thing that crashes a request, so a rejection
  // is swallowed here rather than escaping as an unhandled rejection.
  const settled = delivery.catch(() => {})

  try {
    const context = (globalThis as unknown as Record<symbol, unknown>)[VERCEL_REQUEST_CONTEXT] as
      | VercelRequestContext
      | undefined
    const waitUntil = context?.get?.()?.waitUntil
    if (typeof waitUntil === "function") {
      waitUntil(settled)
    }
  } catch {
    // Any surprise in the host's context object leaves `settled` floating,
    // which is what we would have done anyway.
  }
}

interface ParsedDsn {
  ingestUrl: string
  publicKey: string
}

let cachedDsn: ParsedDsn | null | undefined

/**
 * Parse a Sentry DSN into the store-endpoint URL and public key.
 * DSN shape: https://<publicKey>@<host>/<projectId>
 * Returns null (cached) when the DSN is missing or malformed.
 */
function parseSentryDsn(): ParsedDsn | null {
  if (cachedDsn !== undefined) return cachedDsn

  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    cachedDsn = null
    return null
  }

  try {
    const url = new URL(dsn)
    const projectId = url.pathname.replace(/^\//, "")
    if (!url.username || !projectId) {
      cachedDsn = null
      return null
    }
    cachedDsn = {
      ingestUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
      publicKey: url.username,
    }
  } catch {
    cachedDsn = null
  }
  return cachedDsn
}

/**
 * Send an event to Sentry via the public ingestion API.
 *
 * Uses a direct fetch to Sentry's store endpoint so we get production error
 * tracking without bundling the @sentry/nextjs SDK (zero bundle cost, works in
 * both Node and Edge runtimes). Context is PII-redacted before it leaves the
 * process. Upgrade to @sentry/nextjs later if performance tracing is needed.
 */
async function sendToSentry(
  level: LogLevel,
  message: string,
  context?: ErrorContext
): Promise<void> {
  const dsn = parseSentryDsn()
  if (!dsn) return

  const safeContext = context ? (redactPII(context) as Record<string, unknown>) : undefined
  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: toSentryLevel(level),
    logger: "codesparring",
    environment: resolveEnvironment(),
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    server_name: process.env.VERCEL_REGION || undefined,
    message: { formatted: redactPIIFromString(message) },
    tags: {
      endpoint: context?.endpoint,
      // Sentry rejects non-string tag values and drops the tag, so a numeric
      // status code never made it onto the event.
      statusCode: context?.statusCode === undefined ? undefined : String(context.statusCode),
    },
    extra: safeContext,
  }

  await fetch(dsn.ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=codesparring/1.0, sentry_key=${dsn.publicKey}`,
    },
    body: JSON.stringify(event),
  })
    .then(async (res) => {
      if (!res.ok && res.status !== 429) {
        const body = await res.text().catch(() => "")
        console.error(`[Sentry] Failed to send event (${res.status}): ${body}`)
      }
    })
    .catch((err) => {
      console.error("[Sentry] Network error sending event:", err?.message || err)
    })
}

interface ExternalDeliveryOptions {
  /**
   * Report to Sentry regardless of level. Revenue events log at `info`, which
   * the severity gate below would otherwise drop.
   */
  alwaysReport?: boolean
}

/**
 * Whether an event is severe enough (or important enough) to reach Sentry.
 * Extracted so the decision is testable without a live transport.
 */
function shouldReportToSentry(level: LogLevel, options?: ExternalDeliveryOptions): boolean {
  return options?.alwaysReport === true || level === "error" || level === "warn"
}

/**
 * Send error to external monitoring service
 * Configure with environment variables:
 * - SENTRY_DSN: Sentry error tracking
 * - LOGFLARE_API_KEY + LOGFLARE_SOURCE_ID: LogFlare logging
 */
async function sendToExternalService(
  level: LogLevel,
  message: string,
  context?: ErrorContext,
  options?: ExternalDeliveryOptions
): Promise<void> {
  // Skip in development/test
  if (isDev || isTest) return

  try {
    // Sentry integration (active when SENTRY_DSN is configured).
    // Capture errors and warnings; skip lower-severity noise.
    if (shouldReportToSentry(level, options)) {
      await sendToSentry(level, message, context)
    }

    // LogFlare integration (if configured)
    if (process.env.LOGFLARE_API_KEY && process.env.LOGFLARE_SOURCE_ID) {
      await fetch(`https://api.logflare.app/logs/json?source=${process.env.LOGFLARE_SOURCE_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.LOGFLARE_API_KEY,
        },
        body: JSON.stringify({
          batch: [
            {
              message,
              metadata: {
                level,
                ...context,
                timestamp: new Date().toISOString(),
                environment: resolveEnvironment(),
              },
            },
          ],
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const body = await res.text().catch(() => "")
            console.error(`[Logflare] Failed to send log (${res.status}): ${body}`)
          }
        })
        .catch((err) => {
          console.error("[Logflare] Network error sending log:", err?.message || err)
        })
    }

    // Custom webhook (if configured)
    if (process.env.ERROR_WEBHOOK_URL && level === "error") {
      await fetch(process.env.ERROR_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          message,
          context,
          timestamp: new Date().toISOString(),
          environment: resolveEnvironment(),
          service: "mockmate-website",
        }),
      }).catch(() => {
        // Silently fail
      })
    }
  } catch {
    // Never throw from logger - would cause infinite loops
  }
}

/**
 * Hand an event to the external transports without blocking the caller, while
 * still keeping the serverless instance alive long enough to finish the send.
 * Every fire-and-forget delivery goes through here so the keep-alive is applied
 * in exactly one place.
 */
function deliverExternally(
  level: LogLevel,
  message: string,
  context?: ErrorContext,
  options?: ExternalDeliveryOptions
): void {
  keepAliveUntilSettled(sendToExternalService(level, message, context, options))
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, context))
    }
  },

  info(message: string, context?: LogContext) {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, context))
    }
  },

  warn(message: string, context?: LogContext) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, context))
    }
    // Send warnings to external service in production
    deliverExternally("warn", message, context)
  },

  error(message: string, context?: ErrorContext) {
    const fingerprint = getErrorFingerprint(message, context)
    const shouldLogFull = shouldLogFullDetails(fingerprint)

    if (shouldLog("error")) {
      if (shouldLogFull) {
        console.error(formatMessage("error", message, context))
      } else {
        // Log abbreviated version for repeated errors
        const entry = errorCounts.get(fingerprint)
        console.error(
          formatMessage("error", `[Repeated ${entry?.count}x] ${message}`, {
            endpoint: context?.endpoint,
          })
        )
      }
    }

    if (typeof window !== "undefined") {
      // SENTRY_DSN is not a NEXT_PUBLIC_ var, so it is undefined in the browser
      // bundle and a direct send from here can never succeed. (LOGFLARE_* and
      // ERROR_WEBHOOK_URL are server-only for the same reason.) Route through
      // the beacon the global handlers already use: /api/client-error re-logs
      // the report server-side, which is the only client -> Sentry path.
      reportClientError({
        message,
        stack: context?.error instanceof Error ? context.error.stack : undefined,
        // ClientErrorSource has no value for "explicitly logged by app code";
        // "react-boundary" is the closest existing one (the other two are
        // automatic global listeners) and the enum is shared with the route's
        // schema, so inventing a value here would fail validation server-side.
        source: "react-boundary",
      })
      return
    }

    // Always send to external service (they handle deduplication)
    deliverExternally("error", message, context)
  },

  /**
   * Log an API request/response for monitoring
   */
  apiRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ) {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info"
    const message = `${method} ${endpoint} ${statusCode} ${duration}ms`

    if (shouldLog(level)) {
      console.log(formatMessage(level, message, context))
    }

    // Track slow requests
    if (duration > 5000) {
      deliverExternally("warn", `Slow request: ${message}`, {
        endpoint,
        statusCode,
        duration,
        ...context,
      })
    }

    // Track errors
    if (statusCode >= 500) {
      deliverExternally("error", message, {
        endpoint,
        statusCode,
        duration,
        ...context,
      })
    }
  },

  /**
   * Log a payment/subscription event (critical for revenue)
   */
  payment(event: string, context: LogContext) {
    const message = `[PAYMENT] ${event}`

    // Revenue events deliberately bypass the production level gate. `info` is
    // dropped in production, which made this method a total no-op exactly where
    // upgrades, renewals, failures, refunds and downgrades needed to be
    // auditable. Ordinary `logger.info` keeps the gate.
    if (!isTest) {
      console.info(formatMessage("info", message, context))
    }

    // Always send payment events to external service
    deliverExternally("info", message, context, { alwaysReport: true })
  },

  /**
   * Track user actions (analytics)
   */
  track(event: string, properties?: LogContext) {
    if (isDev) {
      console.log(formatMessage("info", `[TRACK] ${event}`, properties))
    }
    // In production, send to analytics service
    // Example: posthog.capture(event, properties)
  },

  /**
   * Create a child logger with preset context
   */
  child(defaultContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...defaultContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...defaultContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        logger.warn(message, { ...defaultContext, ...context }),
      error: (message: string, context?: ErrorContext) =>
        logger.error(message, { ...defaultContext, ...context }),
    }
  },
}

// Re-export for convenience
export default logger
