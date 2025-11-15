/**
 * API helper utilities for error handling and retry logic
 */

import { toast } from "sonner"

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  statusCode: number
  data?: any

  constructor(message: string, statusCode: number, data?: any) {
    super(message)
    this.name = "APIError"
    this.statusCode = statusCode
    this.data = data
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableStatusCodes?: number[]
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch with automatic retry on failure
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config: RetryConfig = {}
): Promise<Response> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | null = null
  let delay = retryConfig.initialDelay

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // If response is OK or not retryable, return it
      if (response.ok || !retryConfig.retryableStatusCodes.includes(response.status)) {
        return response
      }

      // Response has retryable error status
      lastError = new APIError(
        `Request failed with status ${response.status}`,
        response.status
      )

      // Don't retry on last attempt
      if (attempt === retryConfig.maxRetries) {
        throw lastError
      }

      // Log retry attempt
      console.warn(`Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms`)

      // Wait before retrying
      await sleep(delay)
      delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay)

    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")

      // Network errors are always retryable
      if (attempt === retryConfig.maxRetries) {
        throw lastError
      }

      console.warn(`Retry attempt ${attempt + 1}/${retryConfig.maxRetries} after ${delay}ms due to error:`, error)

      await sleep(delay)
      delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay)
    }
  }

  throw lastError || new Error("Request failed after all retries")
}

/**
 * Parse API error response and show user-friendly message
 */
export async function parseAPIError(response: Response): Promise<string> {
  try {
    const data = await response.json()

    // Check for various error message formats
    if (data.error) {
      return typeof data.error === "string" ? data.error : data.error.message || "An error occurred"
    }

    if (data.message) {
      return data.message
    }

    // Fallback to status text
    return response.statusText || "An error occurred"
  } catch {
    // If parsing fails, return status text
    return response.statusText || "An error occurred"
  }
}

/**
 * Show user-friendly error toast based on error type
 */
export function showErrorToast(error: unknown, fallbackMessage = "Something went wrong") {
  if (error instanceof APIError) {
    // Handle API errors
    if (error.statusCode === 401) {
      toast.error("Authentication failed. Please log in again.")
    } else if (error.statusCode === 403) {
      toast.error("You don't have permission to perform this action.")
    } else if (error.statusCode === 404) {
      toast.error("The requested resource was not found.")
    } else if (error.statusCode === 429) {
      toast.error("Too many requests. Please wait a moment and try again.")
    } else if (error.statusCode >= 500) {
      toast.error("Server error. Please try again later.")
    } else {
      toast.error(error.message || fallbackMessage)
    }
  } else if (error instanceof Error) {
    // Handle generic errors
    if (error.message.includes("network") || error.message.includes("fetch")) {
      toast.error("Network error. Please check your connection and try again.")
    } else {
      toast.error(error.message || fallbackMessage)
    }
  } else {
    // Unknown error type
    toast.error(fallbackMessage)
  }
}

/**
 * Wrapper for API calls with error handling and retry logic
 */
export async function apiCall<T = any>(
  url: string,
  options?: RequestInit,
  config: RetryConfig & { showErrorToast?: boolean } = {}
): Promise<T> {
  const { showErrorToast: shouldShowToast = true, ...retryConfig } = config

  try {
    const response = await fetchWithRetry(url, options, retryConfig)

    if (!response.ok) {
      const errorMessage = await parseAPIError(response)
      const error = new APIError(errorMessage, response.status)

      if (shouldShowToast) {
        showErrorToast(error)
      }

      throw error
    }

    return await response.json()
  } catch (error) {
    if (shouldShowToast && !(error instanceof APIError)) {
      showErrorToast(error)
    }
    throw error
  }
}

/**
 * Validate response data
 */
export function validateResponse<T>(data: any, validator: (data: any) => boolean): T {
  if (!validator(data)) {
    throw new Error("Invalid response data")
  }
  return data as T
}
