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
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
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
    if (process.env.SENTRY_DSN && level === 'error') {
      // Dynamic import to avoid bundling if not used
      // Webpack ignore comment prevents build-time resolution errors
      try {
        // @ts-expect-error - Optional dependency, may not be installed
        const Sentry = await import(
          /* webpackIgnore: true */
          '@sentry/nextjs'
        ).catch(() => null)
        if (Sentry) {
          if (context?.error instanceof Error) {
            Sentry.captureException(context.error, {
              extra: context,
              tags: {
                endpoint: context.endpoint as string,
                userId: context.userId as string,
              },
            })
          } else {
            Sentry.captureMessage(message, {
              level: 'error',
              extra: context,
            })
          }
        }
      } catch {
        // Sentry not installed, silently skip
      }
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
          message,
          metadata: {
            level,
            ...context,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
          },
        }),
      }).catch(() => {
        // Silently fail - don't create infinite error loops
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
