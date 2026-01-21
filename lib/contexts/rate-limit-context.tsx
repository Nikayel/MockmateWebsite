"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from "react"
import {
  RateLimitBanner,
  type RateLimitInfo,
  type RateLimitFeedback,
} from "@/components/ui/rate-limit-notification"
import { useRouter } from "next/navigation"

interface RateLimitContextValue {
  /**
   * Show a rate limit notification
   */
  showRateLimit: (info: RateLimitInfo) => void

  /**
   * Dismiss the current notification
   */
  dismissRateLimit: () => void

  /**
   * Check if rate limit is currently shown
   */
  isRateLimited: boolean

  /**
   * Current rate limit info (if any)
   */
  currentInfo: RateLimitInfo | null

  /**
   * Handle API response that might contain rate limit error
   * Returns true if rate limited, false otherwise
   */
  handleApiResponse: (response: Response) => Promise<boolean>
}

const RateLimitContext = createContext<RateLimitContextValue | null>(null)

interface RateLimitProviderProps {
  children: React.ReactNode
}

export function RateLimitProvider({ children }: RateLimitProviderProps) {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showRateLimit = useCallback((info: RateLimitInfo) => {
    // Clear any pending dismiss timeout
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current)
      dismissTimeoutRef.current = null
    }

    setRateLimitInfo(info)
    setIsVisible(true)

    // Auto-dismiss after retry time + 5 seconds (if retryable)
    if (
      info.retryAfterSeconds &&
      info.type !== "budget_exceeded" &&
      info.type !== "session_limit"
    ) {
      dismissTimeoutRef.current = setTimeout(
        () => {
          setIsVisible(false)
        },
        (info.retryAfterSeconds + 5) * 1000
      )
    }
  }, [])

  const dismissRateLimit = useCallback(() => {
    setIsVisible(false)
    // Clear info after animation completes
    setTimeout(() => {
      setRateLimitInfo(null)
    }, 300)
  }, [])

  const handleApiResponse = useCallback(
    async (response: Response): Promise<boolean> => {
      if (response.status === 429) {
        try {
          const data = await response.json()

          // Parse rate limit info from response
          const info: RateLimitInfo = {
            type: data.code?.includes("BUDGET")
              ? "budget_exceeded"
              : data.code?.includes("CONCURRENT")
                ? "concurrent_limit"
                : data.code?.includes("SESSION")
                  ? "session_limit"
                  : "rate_limit",
            code: data.code,
            message: data.error || data.message || "Rate limit exceeded",
            retryAfterSeconds:
              data.retryAfter || parseInt(response.headers.get("Retry-After") || "60"),
            tier: data.tier || data.quota?.tier,
            currentUsage: data.currentUsage,
            limit: data.limit,
          }

          showRateLimit(info)
          return true
        } catch {
          // Fallback for non-JSON 429 responses
          showRateLimit({
            type: "rate_limit",
            message: "Too many requests. Please wait a moment.",
            retryAfterSeconds: parseInt(response.headers.get("Retry-After") || "60"),
          })
          return true
        }
      }

      return false
    },
    [showRateLimit]
  )

  const handleFeedback = useCallback(async (feedback: RateLimitFeedback) => {
    try {
      const response = await fetch("/api/rate-limit-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedback),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }
    } catch (error) {
      console.error("Failed to submit rate limit feedback:", error)
      throw error
    }
  }, [])

  const handleUpgrade = useCallback(() => {
    router.push("/pricing")
    dismissRateLimit()
  }, [router, dismissRateLimit])

  const handleRetry = useCallback(() => {
    // Just dismiss - the user can retry their action
    dismissRateLimit()
  }, [dismissRateLimit])

  const value: RateLimitContextValue = {
    showRateLimit,
    dismissRateLimit,
    isRateLimited: isVisible,
    currentInfo: rateLimitInfo,
    handleApiResponse,
  }

  return (
    <RateLimitContext.Provider value={value}>
      {children}

      {/* Global rate limit banner */}
      {isVisible && rateLimitInfo && (
        <RateLimitBanner
          info={rateLimitInfo}
          onDismiss={dismissRateLimit}
          onRetry={handleRetry}
          onUpgrade={handleUpgrade}
          onFeedback={handleFeedback}
        />
      )}
    </RateLimitContext.Provider>
  )
}

/**
 * Hook to access rate limit context
 */
export function useRateLimit() {
  const context = useContext(RateLimitContext)
  if (!context) {
    throw new Error("useRateLimit must be used within a RateLimitProvider")
  }
  return context
}

/**
 * Higher-order component to wrap fetch with rate limit handling
 */
export function useFetchWithRateLimit() {
  const { handleApiResponse } = useRateLimit()

  return useCallback(
    async (url: string, options?: RequestInit): Promise<Response> => {
      const response = await fetch(url, options)

      // Check for rate limiting
      const isRateLimited = await handleApiResponse(response.clone())

      if (isRateLimited) {
        // Create a new response with the same body but mark it as rate limited
        const data = await response.json()
        throw new RateLimitError(data.message || "Rate limited", data)
      }

      return response
    },
    [handleApiResponse]
  )
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  public readonly data: unknown

  constructor(message: string, data: unknown) {
    super(message)
    this.name = "RateLimitError"
    this.data = data
  }
}
