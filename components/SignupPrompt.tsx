"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Github,
  CheckCircle,
  X,
  Brain,
  Calendar,
} from "lucide-react"
import { signInWithGitHub, signInWithGoogle } from "@/lib/auth"
import { getGuestId, markFreeTrialUsed } from "@/lib/guest-session"
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
export function SignupPrompt({
  score,
  sessionId,
  scenarioTitle,
  onDismiss,
}: SignupPromptProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [authProvider, setAuthProvider] = useState<"github" | "google" | null>(null)

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

      const guestId = getGuestId()
      if (guestId) {
        localStorage.setItem("pending_guest_migration", JSON.stringify({
          guestId,
          sessionId,
        }))
      }

      localStorage.setItem("auth_redirect", `sessions/${sessionId}`)

      if (provider === "github") {
        await signInWithGitHub()
      } else {
        await signInWithGoogle()
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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-zinc-900 border-zinc-700 w-full max-w-sm relative">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Score header */}
          <div className="pt-6 pb-4 px-6 text-center border-b border-zinc-800">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-800 mb-3">
              <span className={`text-2xl font-bold ${getScoreColor()}`}>
                {score}%
              </span>
            </div>
            <p className="text-sm text-zinc-400 truncate">{scenarioTitle}</p>
          </div>

          <CardContent className="p-5 space-y-4">
            {/* Value prop - compact */}
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="flex items-start gap-2.5">
                <Brain className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-zinc-300 font-medium">Don't forget this pattern</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
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
                className="w-full h-10 bg-white hover:bg-zinc-100 text-black font-medium text-sm"
              >
                {isLoading && authProvider === "github" ? (
                  <div className="h-4 w-4 border-2 border-zinc-400 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    Continue with GitHub
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleAuth("google")}
                disabled={isLoading}
                variant="outline"
                className="w-full h-10 bg-transparent hover:bg-zinc-800 text-zinc-300 font-medium text-sm border-zinc-700"
              >
                {isLoading && authProvider === "google" ? (
                  <div className="h-4 w-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
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
            <div className="flex justify-center gap-4 text-xs text-zinc-600 pt-1">
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
