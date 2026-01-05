"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Github,
  CheckCircle,
  TrendingUp,
  BookOpen,
  Target,
  Zap,
  Lock,
  ArrowRight,
  Trophy,
  Brain,
  Calendar,
  Clock,
  RefreshCw,
} from "lucide-react"
import { signInWithGitHub, signInWithGoogle } from "@/lib/auth"
import { createOrUpdateProfile, migrateAllGuestSessions } from "@/lib/firestore-helpers"
import { getGuestId, markFreeTrialUsed, confirmGuestSessionMigration, saveGuestSessionData } from "@/lib/guest-session"
import { toast } from "sonner"
import { motion } from "framer-motion"

/**
 * Calculate optimal review interval using SM-2 algorithm principles
 * Based on Ebbinghaus forgetting curve research
 */
function calculateNextReviewDate(score: number): { date: Date; intervalDays: number; retentionPercent: number } {
  // Convert 0-100 score to quality factor
  const quality = Math.round((score / 100) * 5)

  // SM-2 inspired interval calculation for first review
  let intervalDays: number
  let retentionPercent: number

  if (quality >= 4) {
    // High performance - can wait longer
    intervalDays = 3
    retentionPercent = 85
  } else if (quality >= 3) {
    // Moderate performance - standard interval
    intervalDays = 1
    retentionPercent = 75
  } else {
    // Lower performance - review sooner
    intervalDays = 1
    retentionPercent = 60
  }

  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + intervalDays)

  return { date: nextDate, intervalDays, retentionPercent }
}

/**
 * Format a date as a friendly string (e.g., "Tomorrow", "In 3 days", "Jan 15")
 */
function formatReviewDate(date: Date): string {
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays <= 7) return `In ${diffDays} days`

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

interface SignupPromptProps {
  score: number
  sessionId: string
  scenarioTitle: string
  onDismiss?: () => void
  feedbackSummary?: string
}

/**
 * Signup prompt shown after guest completes their free trial session
 * Personalized with their score and session details to drive conversion
 */
export function SignupPrompt({
  score,
  sessionId,
  scenarioTitle,
  onDismiss,
  feedbackSummary,
}: SignupPromptProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [authProvider, setAuthProvider] = useState<"github" | "google" | null>(null)

  // Get score-based messaging
  const getScoreMessage = () => {
    if (score >= 80) {
      return {
        emoji: "",
        headline: "Excellent work!",
        subheadline: "You're ready to tackle more challenges",
        color: "text-green-400",
      }
    } else if (score >= 60) {
      return {
        emoji: "",
        headline: "Great progress!",
        subheadline: "Keep practicing to reach your peak",
        color: "text-blue-400",
      }
    } else if (score >= 40) {
      return {
        emoji: "",
        headline: "Good effort!",
        subheadline: "Regular practice will get you there",
        color: "text-yellow-400",
      }
    } else {
      return {
        emoji: "",
        headline: "Every expert was once a beginner",
        subheadline: "Let's build your skills together",
        color: "text-orange-400",
      }
    }
  }

  const scoreMessage = getScoreMessage()

  // Calculate optimal next review based on performance
  const nextReview = calculateNextReviewDate(score)

  const handleAuth = async (provider: "github" | "google") => {
    try {
      setIsLoading(true)
      setAuthProvider(provider)

      // Store session info for migration after auth
      const guestId = getGuestId()
      if (guestId) {
        localStorage.setItem("pending_guest_migration", JSON.stringify({
          guestId,
          sessionId,
        }))
      }

      // Store redirect info
      localStorage.setItem("auth_redirect", `sessions/${sessionId}`)

      // Trigger OAuth
      if (provider === "github") {
        await signInWithGitHub()
      } else {
        await signInWithGoogle()
      }

      // Note: Actual migration happens in the login page after auth completes
      // The onAuthStateChanged handler will detect the pending migration
    } catch (error) {
      console.error("Auth failed:", error)
      toast.error("Sign up failed", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setIsLoading(false)
      setAuthProvider(null)
    }
  }

  const benefits = [
    {
      icon: Lock,
      title: "Save this feedback",
      description: "Keep your progress forever",
    },
    {
      icon: Brain,
      title: "Smart review schedule",
      description: "Science-backed spaced repetition",
    },
    {
      icon: Target,
      title: "Get recommendations",
      description: "Problems matched to your level",
    },
    {
      icon: BookOpen,
      title: "200+ problems",
      description: "DSA, System Design, Bug Fix",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <Card className="bg-[#1a1a2e] border-border max-w-lg w-full overflow-hidden">
        {/* Score banner */}
        <div className="bg-gradient-to-r from-accent/20 to-purple-600/20 p-6 text-center border-b border-border">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-background/50 mb-4"
          >
            <span className={`text-4xl font-bold ${scoreMessage.color}`}>
              {score}%
            </span>
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            {scoreMessage.headline}
          </h2>
          <p className="text-muted-foreground">
            {scoreMessage.subheadline}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            {scenarioTitle}
          </p>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Spaced Repetition Review Section - Key conversion driver */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600/20 via-accent/10 to-blue-600/20 border border-accent/30 p-4"
          >
            {/* Subtle brain pattern background */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-2 right-2">
                <Brain className="h-20 w-20" />
              </div>
            </div>

            <div className="relative">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/20 shrink-0">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Your Optimal Review Calculated
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Based on your {score}% performance
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between bg-background/50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-accent" />
                  <span className="text-sm text-muted-foreground">Next review:</span>
                </div>
                <span className="text-lg font-bold text-accent">
                  {formatReviewDate(nextReview.date)}
                </span>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent/70" />
                  <span>
                    <strong className="text-foreground">Why this matters:</strong> Research shows you'll retain ~{nextReview.retentionPercent}% if you review at the optimal time. Without it, you'll forget 80% within a week.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent/70" />
                  <span>
                    Sign up to access your personalized <strong className="text-foreground">/review</strong> page with all your scheduled problems.
                  </span>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Benefits grid */}
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30"
              >
                <benefit.icon className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {benefit.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main CTA */}
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Sign up to save your progress (free, no credit card)
            </p>

            <Button
              onClick={() => handleAuth("github")}
              disabled={isLoading}
              className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background font-medium rounded-xl"
            >
              {isLoading && authProvider === "github" ? (
                <div className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  <Github className="h-5 w-5 mr-2" />
                  Continue with GitHub
                </>
              )}
            </Button>

            <Button
              onClick={() => handleAuth("google")}
              disabled={isLoading}
              variant="outline"
              className="w-full h-12 bg-transparent hover:bg-secondary/50 text-foreground font-medium rounded-xl border-border"
            >
              {isLoading && authProvider === "google" ? (
                <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.69-2.23 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </div>

          {/* Trust signals */}
          <div className="flex justify-center gap-6 text-xs text-muted-foreground/60 pt-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              No repo access
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Free forever tier
            </span>
          </div>

          {/* Dismiss option */}
          {onDismiss && (
            <button
              onClick={() => {
                markFreeTrialUsed()
                onDismiss()
              }}
              className="w-full text-center text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Continue without saving
            </button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * Compact inline signup prompt for embedding in feedback views
 */
export function SignupPromptInline({
  score,
  sessionId,
  onSignup,
}: {
  score: number
  sessionId: string
  onSignup?: () => void
}) {
  const router = useRouter()

  return (
    <div className="bg-gradient-to-r from-accent/10 to-purple-600/10 border border-accent/20 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/20">
            <Trophy className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              You scored {score}%
            </p>
            <p className="text-sm text-muted-foreground">
              Sign up to save progress & unlock more
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            // Store redirect info
            localStorage.setItem("auth_redirect", `sessions/${sessionId}`)
            router.push("/login")
          }}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Sign Up Free
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
