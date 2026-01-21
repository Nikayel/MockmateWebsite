"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Clock,
  Zap,
  AlertCircle,
  X,
  ThumbsDown,
  ChevronUp,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

export type RateLimitType = "rate_limit" | "budget_exceeded" | "concurrent_limit" | "session_limit"

export interface RateLimitInfo {
  type: RateLimitType
  code?: string
  message: string
  retryAfterSeconds?: number
  tier?: "free" | "pro" | "enterprise"
  currentUsage?: {
    requestsThisMinute: number
    tokensThisMinute: number
    concurrentRequests: number
    budgetUsedPercent: number
  }
  limit?: {
    requestsPerMinute: number
    tokensPerMinute: number
    maxConcurrent: number
  }
}

interface RateLimitNotificationProps {
  info: RateLimitInfo | null
  onDismiss?: () => void
  onRetry?: () => void
  onUpgrade?: () => void
  onFeedback?: (feedback: RateLimitFeedback) => Promise<void>
  className?: string
}

export interface RateLimitFeedback {
  type: RateLimitType
  code?: string
  message: string
  userMessage?: string
  timestamp: string
}

interface TypeConfigItem {
  icon: typeof Clock
  title: string
  color: string
  bgColor: string
  borderColor: string
}

const typeConfig: Record<RateLimitType, TypeConfigItem> = {
  rate_limit: {
    icon: Clock,
    title: "Request limit reached",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  budget_exceeded: {
    icon: AlertCircle,
    title: "Monthly budget reached",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  concurrent_limit: {
    icon: Zap,
    title: "Too many active requests",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  session_limit: {
    icon: AlertCircle,
    title: "Session limit reached",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
}

export function RateLimitNotification({
  info,
  onDismiss,
  onRetry,
  onUpgrade,
  onFeedback,
  className,
}: RateLimitNotificationProps) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Countdown timer for retry
  useEffect(() => {
    if (!info?.retryAfterSeconds) {
      setCountdown(null)
      return
    }

    setCountdown(info.retryAfterSeconds)

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [info?.retryAfterSeconds])

  const handleFeedbackSubmit = useCallback(async () => {
    if (!info || !onFeedback) return

    setIsSubmittingFeedback(true)
    try {
      await onFeedback({
        type: info.type,
        code: info.code,
        message: info.message,
        userMessage: feedbackMessage || undefined,
        timestamp: new Date().toISOString(),
      })
      setFeedbackSubmitted(true)
      setShowFeedbackForm(false)
      setFeedbackMessage("")
    } catch (error) {
      console.error("Failed to submit feedback:", error)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }, [info, onFeedback, feedbackMessage])

  if (!info) return null

  const config = typeConfig[info.type]
  const Icon = config.icon
  const canRetry =
    countdown === 0 && info.type !== "budget_exceeded" && info.type !== "session_limit"
  const showUpgrade =
    info.tier === "free" && (info.type === "budget_exceeded" || info.type === "session_limit")

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "relative overflow-hidden rounded-lg border shadow-lg",
          config.bgColor,
          config.borderColor,
          "backdrop-blur-sm",
          className
        )}
      >
        {/* Main content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn("mt-0.5 flex-shrink-0", config.color)}>
              <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className={cn("text-sm font-medium", config.color)}>{config.title}</h4>
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="text-muted-foreground mt-1 text-sm">{info.message}</p>

              {/* Countdown timer */}
              {countdown !== null && countdown > 0 && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Ready in{" "}
                      <span className="text-foreground font-mono font-medium">{countdown}s</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                    <motion.div
                      className={cn("h-full rounded-full", config.color.replace("text-", "bg-"))}
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{
                        duration: info.retryAfterSeconds || 0,
                        ease: "linear",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Usage details (expandable) */}
              {info.currentUsage && info.limit && (
                <div className="mt-3">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  >
                    <ChevronUp
                      className={cn("h-3 w-3 transition-transform", expanded ? "" : "rotate-180")}
                    />
                    <span>{expanded ? "Hide" : "Show"} details</span>
                  </button>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-background/50 mt-2 space-y-1 rounded p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Requests/min:</span>
                            <span className="font-mono">
                              {info.currentUsage.requestsThisMinute}/{info.limit.requestsPerMinute}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tokens/min:</span>
                            <span className="font-mono">
                              {info.currentUsage.tokensThisMinute.toLocaleString()}/
                              {info.limit.tokensPerMinute.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Concurrent:</span>
                            <span className="font-mono">
                              {info.currentUsage.concurrentRequests}/{info.limit.maxConcurrent}
                            </span>
                          </div>
                          {info.currentUsage.budgetUsedPercent > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Budget used:</span>
                              <span className="font-mono">
                                {info.currentUsage.budgetUsedPercent.toFixed(0)}%
                              </span>
                            </div>
                          )}
                          {info.tier && (
                            <div className="border-border/50 flex justify-between border-t pt-1">
                              <span className="text-muted-foreground">Current plan:</span>
                              <span className="font-medium capitalize">{info.tier}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {canRetry && onRetry && (
                  <Button size="sm" variant="outline" onClick={onRetry} className="h-7 text-xs">
                    Try again
                  </Button>
                )}

                {showUpgrade && onUpgrade && (
                  <Button size="sm" onClick={onUpgrade} className="h-7 text-xs">
                    Upgrade to Pro
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                )}

                {/* Feedback button */}
                {onFeedback && !feedbackSubmitted && (
                  <button
                    onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                    className={cn(
                      "text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1 text-xs transition-colors",
                      showFeedbackForm && "text-foreground"
                    )}
                    title="Report if you think this is a mistake"
                  >
                    <ThumbsDown className="h-3 w-3" />
                    <span>Not right?</span>
                  </button>
                )}

                {feedbackSubmitted && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-green-500">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Thanks for the feedback
                  </span>
                )}
              </div>

              {/* Feedback form */}
              <AnimatePresence>
                {showFeedbackForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-background/50 border-border/50 mt-3 rounded border p-2">
                      <p className="text-muted-foreground mb-2 text-xs">
                        Think this limit was applied incorrectly? Let us know:
                      </p>
                      <textarea
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Optional: Describe what you were doing..."
                        className="border-input bg-background focus:ring-ring w-full resize-none rounded border p-2 text-xs focus:ring-1 focus:outline-none"
                        rows={2}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowFeedbackForm(false)}
                          className="h-6 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleFeedbackSubmit}
                          disabled={isSubmittingFeedback}
                          className="h-6 text-xs"
                        >
                          {isSubmittingFeedback ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Submit"
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Compact bottom banner - similar to Cursor/Anthropic style
 * Shows at the bottom of the screen with minimal footprint
 */
export function RateLimitBanner({
  info,
  onDismiss,
  onRetry,
  onUpgrade,
  onFeedback,
}: RateLimitNotificationProps) {
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  useEffect(() => {
    if (!info?.retryAfterSeconds) {
      setCountdown(null)
      return
    }

    setCountdown(info.retryAfterSeconds)

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [info?.retryAfterSeconds])

  const handleFeedbackSubmit = useCallback(async () => {
    if (!info || !onFeedback) return

    setIsSubmittingFeedback(true)
    try {
      await onFeedback({
        type: info.type,
        code: info.code,
        message: info.message,
        userMessage: feedbackMessage || undefined,
        timestamp: new Date().toISOString(),
      })
      setFeedbackSubmitted(true)
      setShowFeedbackForm(false)
      setFeedbackMessage("")
    } catch (error) {
      console.error("Failed to submit feedback:", error)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }, [info, onFeedback, feedbackMessage])

  if (!info) return null

  const config = typeConfig[info.type]
  const Icon = config.icon
  const canRetry =
    countdown === 0 && info.type !== "budget_exceeded" && info.type !== "session_limit"
  const showUpgrade =
    info.tier === "free" && (info.type === "budget_exceeded" || info.type === "session_limit")

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
      >
        <div
          className={cn(
            "rounded-lg border shadow-lg backdrop-blur-md",
            config.bgColor,
            config.borderColor
          )}
        >
          {/* Main compact bar */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={cn("flex-shrink-0", config.color)}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="truncate font-medium">{config.title}</span>
                {countdown !== null && countdown > 0 && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono text-xs">{countdown}s</span>
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">{info.message}</p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {canRetry && onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry} className="h-7 text-xs">
                  Retry
                </Button>
              )}

              {showUpgrade && onUpgrade && (
                <Button size="sm" onClick={onUpgrade} className="h-7 text-xs">
                  Upgrade
                </Button>
              )}

              {onFeedback && !feedbackSubmitted && (
                <button
                  onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                  className={cn(
                    "hover:bg-background/50 rounded p-1.5 transition-colors",
                    showFeedbackForm && "bg-background/50"
                  )}
                  title="Report if this seems wrong"
                >
                  <ThumbsDown className="text-muted-foreground h-3.5 w-3.5" />
                </button>
              )}

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="hover:bg-background/50 rounded p-1.5 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="text-muted-foreground h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Feedback form (expandable) */}
          <AnimatePresence>
            {showFeedbackForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="border-border/30 border-t px-4 pt-0 pb-3">
                  <div className="pt-3">
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="What happened? (optional)"
                      className="border-input bg-background/80 focus:ring-ring w-full resize-none rounded border p-2 text-xs focus:ring-1 focus:outline-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">
                        We'll review this feedback
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowFeedbackForm(false)}
                          className="h-6 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleFeedbackSubmit}
                          disabled={isSubmittingFeedback}
                          className="h-6 text-xs"
                        >
                          {isSubmittingFeedback ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Send"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {feedbackSubmitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 pt-0 pb-3"
            >
              <span className="flex items-center gap-1 text-xs text-green-500">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Thanks! We'll look into this.
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Toast-style notification that appears at the top of the screen
 */
export function RateLimitToast({
  info,
  onDismiss,
  onRetry,
  onUpgrade,
  onFeedback,
}: RateLimitNotificationProps) {
  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm">
      <RateLimitNotification
        info={info}
        onDismiss={onDismiss}
        onRetry={onRetry}
        onUpgrade={onUpgrade}
        onFeedback={onFeedback}
      />
    </div>
  )
}

/**
 * Inline notification for use within forms/components
 */
export function RateLimitInline({
  info,
  onRetry,
  onUpgrade,
  onFeedback,
  className,
}: Omit<RateLimitNotificationProps, "onDismiss">) {
  return (
    <RateLimitNotification
      info={info}
      onRetry={onRetry}
      onUpgrade={onUpgrade}
      onFeedback={onFeedback}
      className={className}
    />
  )
}
