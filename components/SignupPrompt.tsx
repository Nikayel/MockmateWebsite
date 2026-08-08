"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Github, CheckCircle, X, Brain, Calendar, Trophy, ArrowRight } from "lucide-react"
import { signInWithGitHub, signInWithGoogle } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { getAttribution } from "@/lib/attribution"
import { getGuestId, markFreeTrialUsed } from "@/lib/guest-session"
import { trackEvent } from "@/lib/analytics"
import { toast } from "sonner"
import { motion } from "framer-motion"

interface SignupPromptProps {
  score: number
  sessionId: string
  scenarioTitle: string
  onDismiss?: () => void
  feedbackSummary?: string
}

/**
 * Signup prompt shown after guest completes their free trial session
 * Compact design focused on conversion
 */
export function SignupPrompt({ score, sessionId, scenarioTitle, onDismiss }: SignupPromptProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [authProvider, setAuthProvider] = useState<"github" | "google" | null>(null)

  // Activation funnel: record that a guest saw the post-trial signup prompt.
  useEffect(() => {
    trackEvent("signup_prompt_shown", { sessionId, score })
  }, [sessionId, score])

  const getScoreColor = () => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-blue-400"
    if (score >= 40) return "text-yellow-400"
    return "text-orange-400"
  }

  const handleClose = () => {
    markFreeTrialUsed()
    onDismiss?.()
  }

  const handleAuth = async (provider: "github" | "google") => {
    try {
      setIsLoading(true)
      setAuthProvider(provider)
      trackEvent("signup_prompt_click", { provider, sessionId, score })

      const guestId = getGuestId()
      if (guestId) {
        localStorage.setItem(
          "pending_guest_migration",
          JSON.stringify({
            guestId,
            sessionId,
          })
        )
      }

      localStorage.setItem("auth_redirect", `sessions/${sessionId}`)

      const result = provider === "github" ? await signInWithGitHub() : await signInWithGoogle()

      // Signing in is not the same as having an account here. This prompt sends the
      // user to /sessions/{id} rather than through /auth/callback, and the login
      // page is the only other place that creates a profile, so a sign-up started
      // from this modal produced a Firebase auth user with NO profile document.
      // That user can never pay: /api/create-checkout returns 404 "User profile
      // not found" forever, and onboarding never fires.
      //
      // Only the popup branch needs handling. A blocked popup returns
      // "redirecting", and that flow comes back through the login page, which
      // already creates the profile.
      if (result.status === "signed-in") {
        const isNewUser =
          result.user.metadata.creationTime === result.user.metadata.lastSignInTime
        await createOrUpdateProfile(
          result.user.uid,
          result.user.email || "",
          result.user.displayName,
          result.user.photoURL,
          isNewUser ? getAttribution() : null
        )
      }
    } catch (error) {
      console.error("Auth failed:", error)
      toast.error("Sign up failed", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setIsLoading(false)
      setAuthProvider(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="relative w-full max-w-sm border-border bg-card">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Score header */}
          <div className="border-b border-border px-6 pt-6 pb-4 text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <span className={`text-2xl font-bold ${getScoreColor()}`}>{score}%</span>
            </div>
            <p className="truncate text-sm text-muted-foreground">{scenarioTitle}</p>
          </div>

          <CardContent className="space-y-4 p-5">
            {/* Value prop - compact */}
            <div className="rounded-lg border border-border/50 bg-muted/50 p-3">
              <div className="flex items-start gap-2.5">
                <Brain className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Don't forget this pattern</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Create an account to get review reminders before you forget.
                  </p>
                </div>
              </div>
            </div>

            {/* Auth buttons */}
            <div className="space-y-2.5">
              <Button
                onClick={() => handleAuth("github")}
                disabled={isLoading}
                className="h-10 w-full bg-card text-sm font-medium text-foreground hover:bg-muted"
              >
                {isLoading && authProvider === "github" ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-black" />
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Continue with GitHub
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleAuth("google")}
                disabled={isLoading}
                variant="outline"
                className="h-10 w-full border-border bg-transparent text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                {isLoading && authProvider === "google" ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-zinc-300" />
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.69-2.23 1.1-3.71 1.1-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </div>

            {/* Trust signals */}
            <div className="flex justify-center gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Free
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                No repo access
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
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
    <div className="from-accent/10 border-accent/20 rounded-xl border bg-gradient-to-r to-purple-600/10 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-accent/20 flex h-12 w-12 items-center justify-center rounded-full">
            <Trophy className="text-accent h-6 w-6" />
          </div>
          <div>
            <p className="text-foreground font-medium">You scored {score}%</p>
            <p className="text-muted-foreground text-sm">Sign up to save progress & unlock more</p>
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
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
