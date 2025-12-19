/**
 * Production-safe logger utility
 *
 * - In development: Logs to console
 * - In production: Silences debug/info, only logs errors (can be extended to external service)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const isDev = process.env.NODE_ENV === 'development'

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

function shouldLog(level: LogLevel): boolean {
  if (isDev) return true
  // In production, only log warnings and errors
  return level === 'warn' || level === 'error'
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
  },

  error(message: string, context?: LogContext) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, context))

      // In production, you could send to an external service here
      // Example: sendToSentry(message, context)
      // Example: sendToLogflare(message, context)
    }
  },

  // For tracking user actions (analytics)
  track(event: string, properties?: LogContext) {
    if (isDev) {
      console.log(formatMessage('info', `[TRACK] ${event}`, properties))
    }
    // In production, send to analytics service
    // Example: posthog.capture(event, properties)
  },
}

// Re-export for convenience
export default logger
