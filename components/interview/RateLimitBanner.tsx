"use client"

import { AlertCircle, Clock, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface RateLimitBannerProps {
  /** When the rate limit will reset (timestamp in ms) */
  resetTime?: number
  /** User's current tier */
  tier: "free" | "pro" | "enterprise"
  /** Optional callback when banner is dismissed */
  onDismiss?: () => void
}

/**
 * Professional, subtle rate limit notification banner
 * Shows in chat interface when user exceeds their rate limit
 *
 * Design principles:
 * - Small and subtle (doesn't block UI)
 * - Shows countdown to reset
 * - Suggests upgrade for free users
 * - Follows DRY by being reusable across chat interfaces
 */
export function RateLimitBanner({ resetTime, tier, onDismiss }: RateLimitBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("")

  useEffect(() => {
    if (!resetTime) return

    const updateTimer = () => {
      const now = Date.now()
      const diff = resetTime - now

      if (diff <= 0) {
        setTimeRemaining("Ready now")
        // Auto-dismiss when reset time is reached
        if (onDismiss) {
          setTimeout(onDismiss, 1000)
        }
        return
      }

      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60

      if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${remainingSeconds}s`)
      } else {
        setTimeRemaining(`${remainingSeconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [resetTime, onDismiss])

  return (
    <div className="animate-in fade-in slide-in-from-top-2 mx-2 mb-2 duration-300">
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs backdrop-blur-sm">
        {/* Icon */}
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />

        {/* Message */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-amber-200">Rate limit reached</p>
          <p className="mt-0.5 text-amber-200/80">
            {tier === "free" ? (
              <>You've reached the free tier limit. Upgrade for higher limits.</>
            ) : (
              <>You've reached your rate limit. It will reset soon.</>
            )}
          </p>
        </div>

        {/* Timer & Action */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {resetTime && timeRemaining && (
            <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 text-amber-200">
              <Clock className="h-3 w-3" />
              <span className="font-mono text-xs">{timeRemaining}</span>
            </div>
          )}

          {tier === "free" && (
            <Link href="/pricing">
              <Button
                size="sm"
                className="h-7 gap-1 bg-gradient-to-r from-blue-600 to-purple-600 px-2.5 text-xs font-medium text-white hover:from-blue-700 hover:to-purple-700"
              >
                <Sparkles className="h-3 w-3" />
                Upgrade
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
