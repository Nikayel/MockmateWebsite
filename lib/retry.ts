/**
 * Retry utility with exponential backoff
 * Critical for production reliability with external API calls
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Whether to add jitter to prevent thundering herd (default: true) */
  jitter?: boolean
  /** Function to determine if error is retryable (default: retry on network errors) */
  isRetryable?: (error: unknown) => boolean
  /** Called before each retry attempt */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'isRetryable'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
}

/**
 * Default retryable error checker
 * Returns true for network errors, rate limits, and server errors
 */
export function isDefaultRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('socket hang up') ||
      message.includes('dns')
    ) {
      return true
    }

    // Firebase errors that are retryable
    if (
      message.includes('unavailable') ||
      message.includes('deadline-exceeded') ||
      message.includes('internal')
    ) {
      return true
    }
  }

  // Check for HTTP response errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status
    // Retry on rate limit (429) and server errors (500-599)
    if (status === 429 || (status >= 500 && status <= 599)) {
      return true
    }
  }

  return false
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  // Exponential backoff: delay = initial * (multiplier ^ attempt)
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt)

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

  // Add jitter (0-50% of delay) to prevent thundering herd
  if (jitter) {
    const jitterAmount = cappedDelay * Math.random() * 0.5
    return Math.floor(cappedDelay + jitterAmount)
  }

  return Math.floor(cappedDelay)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Execute a function with automatic retry on failure
 * Uses exponential backoff to prevent overwhelming failing services
 *
 * @example
 * ```ts
 * // Basic usage
 * const result = await withRetry(() => fetch('https://api.example.com/data'))
 *
 * // With custom options
 * const result = await withRetry(
 *   () => callExternalAPI(),
 *   {
 *     maxRetries: 5,
 *     initialDelayMs: 500,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms:`, error)
 *     }
 *   }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelayMs = DEFAULT_OPTIONS.initialDelayMs,
    maxDelayMs = DEFAULT_OPTIONS.maxDelayMs,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    jitter = DEFAULT_OPTIONS.jitter,
    isRetryable = isDefaultRetryable,
    onRetry,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // If we've exhausted retries, throw
      if (attempt >= maxRetries) {
        throw error
      }

      // If error is not retryable, throw immediately
      if (!isRetryable(error)) {
        throw error
      }

      // Calculate delay for this attempt
      const delayMs = calculateDelay(
        attempt,
        initialDelayMs,
        maxDelayMs,
        backoffMultiplier,
        jitter
      )

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(error, attempt + 1, delayMs)
      }

      // Wait before retrying
      await sleep(delayMs)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Retry wrapper for fetch with better error handling
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { retryOptions?: RetryOptions }
): Promise<Response> {
  const { retryOptions, ...fetchOptions } = options || {}

  return withRetry(
    async () => {
      const response = await fetch(url, fetchOptions)

      // Throw error for non-ok responses so retry logic can handle them
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number }
        error.status = response.status
        throw error
      }

      return response
    },
    {
      ...retryOptions,
      isRetryable: (error) => {
        // Use custom isRetryable if provided
        if (retryOptions?.isRetryable) {
          return retryOptions.isRetryable(error)
        }
        return isDefaultRetryable(error)
      },
    }
  )
}

/**
 * Create a retry wrapper with preset options
 * Useful for creating service-specific retry functions
 *
 * @example
 * ```ts
 * const stripeRetry = createRetryWrapper({
 *   maxRetries: 3,
 *   initialDelayMs: 500,
 *   onRetry: (error, attempt) => logger.warn('Stripe retry', { error, attempt })
 * })
 *
 * const result = await stripeRetry(() => stripe.customers.create(data))
 * ```
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return <T>(fn: () => Promise<T>, overrideOptions?: RetryOptions): Promise<T> => {
    return withRetry(fn, { ...defaultOptions, ...overrideOptions })
  }
}

/**
 * Pre-configured retry wrappers for common services
 */
export const retryStripe = createRetryWrapper({
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
})

export const retryFirebase = createRetryWrapper({
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 15000,
})

export const retryAI = createRetryWrapper({
  maxRetries: 2,
  initialDelayMs: 2000,
  maxDelayMs: 20000,
})
