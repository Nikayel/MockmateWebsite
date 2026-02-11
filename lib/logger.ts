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

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

// ============================================
// PII Redaction
// ============================================

const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  // Phone numbers (various formats)
  { pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '[PHONE]' },
  // Credit card numbers (basic pattern)
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' },
  // SSN
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: '[SSN]' },
  // IP addresses
  { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, replacement: '[IP]' },
  // JWT tokens (base64 encoded)
  { pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, replacement: '[JWT]' },
  // API keys and tokens (common patterns)
  { pattern: /\b(sk_live_|sk_test_|pk_live_|pk_test_)[a-zA-Z0-9]+\b/g, replacement: '[STRIPE_KEY]' },
  { pattern: /\b(api_key|apikey|api-key)["']?\s*[:=]\s*["']?[a-zA-Z0-9_-]{16,}/gi, replacement: '[API_KEY]' },
]

// Fields that should always be redacted
const SENSITIVE_FIELDS = new Set([
  'password', 'passwd', 'secret', 'token', 'apiKey', 'api_key',
  'accessToken', 'access_token', 'refreshToken', 'refresh_token',
  'authorization', 'auth', 'credential', 'credentials',
  'ssn', 'socialSecurityNumber', 'creditCard', 'cardNumber',
  'cvv', 'cvc', 'pin', 'bankAccount', 'routingNumber',
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
  if (depth > 10) return '[MAX_DEPTH]'

  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return redactPIIFromString(obj)
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
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
    return obj.map(item => redactPII(item, depth + 1))
  }

  if (typeof obj === 'object') {
    const redacted: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Check if this is a sensitive field name
      if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]'
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

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// Error aggregation to prevent spam
const errorCounts = new Map<string, { count: number; lastSeen: number }>()
const ERROR_AGGREGATE_WINDOW = 60000 // 1 minute
const ERROR_AGGREGATE_THRESHOLD = 5 // Log details after 5 occurrences in window

/**
 * Generate a unique error fingerprint for aggregation
 */
function getErrorFingerprint(message: string, context?: LogContext): string {
  const contextKey = context?.endpoint || context?.error?.toString() || ''
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
  const contextStr = safeContext ? ` ${JSON.stringify(safeContext)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${safeMessage}${contextStr}`
}

function shouldLog(level: LogLevel): boolean {
  if (isTest) return false // Silence logs in tests
  if (isDev) return true
  // In production, only log warnings and errors
  return level === 'warn' || level === 'error'
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
  context?: ErrorContext
): Promise<void> {
  // Skip in development/test
  if (isDev || isTest) return

  try {
    // Sentry integration (if configured)
    // Note: To enable Sentry, install @sentry/nextjs and uncomment this block
    // The Sentry SDK is not bundled by default to reduce bundle size
    if (process.env.SENTRY_DSN && level === 'error') {
      // Sentry error tracking would go here if @sentry/nextjs is installed
      // For now, we rely on LogFlare or console logging
      // TODO: Add Sentry integration when ready for production monitoring
      console.error('[Sentry not configured]', message, context)
    }

    // LogFlare integration (if configured)
    if (process.env.LOGFLARE_API_KEY && process.env.LOGFLARE_SOURCE_ID) {
      await fetch(`https://api.logflare.app/logs/json?source=${process.env.LOGFLARE_SOURCE_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.LOGFLARE_API_KEY,
        },
        body: JSON.stringify({
          batch: [
            {
              message,
              metadata: {
                level,
                ...context,
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
              },
            },
          ],
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          console.error(`[Logflare] Failed to send log (${res.status}): ${body}`)
        }
      }).catch((err) => {
        console.error('[Logflare] Network error sending log:', err?.message || err)
      })
    }

    // Custom webhook (if configured)
    if (process.env.ERROR_WEBHOOK_URL && level === 'error') {
      await fetch(process.env.ERROR_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          context,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          service: 'mockmate-website',
        }),
      }).catch(() => {
        // Silently fail
      })
    }
  } catch {
    // Never throw from logger - would cause infinite loops
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, context))
    }
  },

  info(message: string, context?: LogContext) {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, context))
    }
  },

  warn(message: string, context?: LogContext) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context))
    }
    // Send warnings to external service in production
    sendToExternalService('warn', message, context)
  },

  error(message: string, context?: ErrorContext) {
    const fingerprint = getErrorFingerprint(message, context)
    const shouldLogFull = shouldLogFullDetails(fingerprint)

    if (shouldLog('error')) {
      if (shouldLogFull) {
        console.error(formatMessage('error', message, context))
      } else {
        // Log abbreviated version for repeated errors
        const entry = errorCounts.get(fingerprint)
        console.error(
          formatMessage('error', `[Repeated ${entry?.count}x] ${message}`, { endpoint: context?.endpoint })
        )
      }
    }

    // Always send to external service (they handle deduplication)
    sendToExternalService('error', message, context)
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
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    const message = `${method} ${endpoint} ${statusCode} ${duration}ms`

    if (shouldLog(level)) {
      console.log(formatMessage(level, message, context))
    }

    // Track slow requests
    if (duration > 5000) {
      sendToExternalService('warn', `Slow request: ${message}`, {
        endpoint,
        statusCode,
        duration,
        ...context,
      })
    }

    // Track errors
    if (statusCode >= 500) {
      sendToExternalService('error', message, {
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

    if (shouldLog('info')) {
      console.info(formatMessage('info', message, context))
    }

    // Always send payment events to external service
    sendToExternalService('info', message, context)
  },

  /**
   * Track user actions (analytics)
   */
  track(event: string, properties?: LogContext) {
    if (isDev) {
      console.log(formatMessage('info', `[TRACK] ${event}`, properties))
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
