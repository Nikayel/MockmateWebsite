"use client"

import { Lock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GuestFeedbackLockProps {
  /** Reopens the signup prompt (or starts sign-in directly). */
  onSignIn: () => void
  scenarioTitle: string
  /**
   * The guest signed in but connecting the session to their account failed.
   * They have an account now, so the panel offers a retry instead of the
   * create-an-account pitch.
   */
  retry?: boolean
}

/**
 * The feedback slot for a guest whose trial session is submitted.
 *
 * Guests never stream AI feedback (that path is signed-in only), so rendering
 * InterviewFeedbackView here showed a shell of empty sections whose fallback
 * caption ("Review feedback for details") read as a button and dead-clicked.
 * This panel replaces the shell with the actual state of the world: the
 * session is scored and saved, and signing in is what turns it into a
 * results page. The score value itself is deliberately absent — it is the
 * thing the sign-in is traded for.
 */
export function GuestFeedbackLock({ onSignIn, scenarioTitle, retry }: GuestFeedbackLockProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="border-border bg-card w-full max-w-md rounded-xl border p-8 text-center">
        <div className="bg-muted mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <Lock className="text-accent-strong h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-foreground text-lg font-semibold">
          {retry ? "We couldn't unlock your results" : "Your interview is scored"}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {retry
            ? `${scenarioTitle} is submitted and saved, and your sign-in worked. Connecting the session to your new account failed, likely a network hiccup.`
            : // Review-first, score last: the guest just watched their tests
              // run, so a 10/10 guest can already compute the number. The
              // review and the breakdown are the assets they cannot.
              `${scenarioTitle} is submitted and saved. Create a free account to see the full review of your code, your score, and where you lost points.`}
        </p>
        <Button onClick={onSignIn} className="mt-6 w-full">
          {retry ? "Try again" : "Unlock your results"}
        </Button>
        <div className="text-muted-foreground mt-4 flex justify-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" aria-hidden="true" />
            Free
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" aria-hidden="true" />
            Your session is kept
          </span>
        </div>
      </div>
    </div>
  )
}
