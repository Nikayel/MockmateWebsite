"use client"

import { useState, useEffect } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Github, CheckCircle, Lock } from "lucide-react"
import { signInWithGitHub, signInWithGoogle } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { getAttribution } from "@/lib/attribution"
import { getGuestId, markFreeTrialUsed } from "@/lib/guest-session"
import { trackEvent } from "@/lib/analytics"
import { toast } from "sonner"

interface SignupPromptProps {
  sessionId: string
  scenarioTitle: string
  onDismiss?: () => void
  /**
   * Fires after a successful in-page (popup) sign-in, with the freshly
   * authenticated user. The interview page owns what happens next — migrate
   * the guest session to the new account, then start the deferred feedback
   * stream. The popup-blocked path never fires this: it returns to
   * /interview as a cold load, where useRedirectSignInReturn consumes the
   * pending_guest_migration marker this component sets before the popup.
   */
  onSignedIn: (user: FirebaseUser) => Promise<void> | void
  /**
   * Fires synchronously at the provider click, before the popup opens.
   * Firebase commits the new user via onAuthStateChanged before the popup
   * promise resolves, so a loading cover keyed on popup success starts one
   * frame too late; keyed on the click it cannot.
   */
  onAuthAttempt?: () => void
  /** Fires when an announced attempt ends without a sign-in (popup closed,
   *  auth error), so the page can drop the cover onAuthAttempt raised. */
  onAuthAborted?: () => void
}

/**
 * Signup prompt shown after a guest completes their free trial session.
 *
 * The score is deliberately NOT shown here (and no longer arrives as a prop):
 * it is what the sign-in reveals. The first version led with "{score}%" as
 * its hero — a guest who had just aced Two Sum read the number, had nothing
 * left to unlock, and left without an account.
 */
export function SignupPrompt({
  sessionId,
  scenarioTitle,
  onDismiss,
  onSignedIn,
  onAuthAttempt,
  onAuthAborted,
}: SignupPromptProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [authProvider, setAuthProvider] = useState<"github" | "google" | null>(null)

  // Activation funnel: record that a guest saw the post-trial signup prompt.
  // No score on the payload — analytics requests are readable in the network
  // tab, and the score is withheld until sign-in.
  useEffect(() => {
    trackEvent("signup_prompt_shown", { sessionId })
  }, [sessionId])

  const handleClose = () => {
    markFreeTrialUsed()
    onDismiss?.()
  }

  const handleAuth = async (provider: "github" | "google") => {
    try {
      onAuthAttempt?.()
      setIsLoading(true)
      setAuthProvider(provider)
      trackEvent("signup_prompt_click", { provider, sessionId })

      // Set up the redirect-flow fallback BEFORE the popup: if it is blocked,
      // auth continues through /login, which consumes both markers to migrate
      // the session and land the user on their results.
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

      // Signing in is not the same as having an account here. This prompt keeps
      // the user on the interview page rather than routing through /auth/callback,
      // so this popup branch creates the profile itself — a sign-up without one
      // can never pay (/api/create-checkout 404s forever).
      //
      // A blocked popup returns "redirecting" and comes back to /interview as a
      // cold load, where useRedirectSignInReturn consumes the markers set above
      // and runs this same work (profile, analytics, migration).
      if (result.status === "signed-in") {
        const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime
        await createOrUpdateProfile(
          result.user.uid,
          result.user.email || "",
          result.user.displayName,
          result.user.photoURL,
          isNewUser ? getAttribution() : null
        )

        // This path handles migration in-page (via onSignedIn), so the
        // redirect-flow markers must not survive: a stale
        // pending_guest_migration re-runs migration on the next /login visit,
        // and a stale auth_redirect hijacks that visit's destination.
        localStorage.removeItem("pending_guest_migration")
        localStorage.removeItem("auth_redirect")

        await onSignedIn(result.user)
      } else if (result.status !== "redirecting") {
        // Anything that is neither a sign-in nor a page-unloading redirect
        // ended the attempt without a user.
        onAuthAborted?.()
        setIsLoading(false)
        setAuthProvider(null)
      }
    } catch (error) {
      console.error("Auth failed:", error)
      toast.error("Sign up failed", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      onAuthAborted?.()
      setIsLoading(false)
      setAuthProvider(null)
    }
  }

  return (
    // The ui kit's Radix Dialog supplies what the hand-rolled overlay lacked:
    // role="dialog", aria labeling, a focus trap, focus restore, Escape, and
    // a built-in close button. Any dismissal path funnels through
    // onOpenChange, so backdrop, Escape, and the X all run handleClose.
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}
    >
      <DialogContent className="max-w-sm p-0">
        {/* Locked-score header: says the result exists, not what it is */}
        <DialogHeader className="border-border items-center border-b px-6 pt-6 pb-4 text-center sm:text-center">
          <div className="bg-muted mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full">
            <Lock className="text-accent-strong h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle className="text-foreground text-sm font-medium">
            Your interview is scored
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1 truncate text-sm">
            {scenarioTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5 pt-0">
          {/* Value prop - what the sign-in reveals */}
          <div className="border-border/50 bg-muted/50 rounded-lg border p-3">
            <p className="text-muted-foreground text-sm font-medium">
              Create your free account to see your results
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              The full feedback breakdown, your code review, and your score are saved to this
              session and unlock with a free account.
            </p>
          </div>

          {/* Auth buttons */}
          <div className="space-y-2.5">
            <Button
              onClick={() => handleAuth("github")}
              disabled={isLoading}
              className="bg-card text-foreground hover:bg-muted h-10 w-full text-sm font-medium"
            >
              {isLoading && authProvider === "github" ? (
                <div className="border-border h-4 w-4 animate-spin rounded-full border-2 border-t-black" />
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
              className="border-border text-muted-foreground hover:bg-muted h-10 w-full bg-transparent text-sm font-medium"
            >
              {isLoading && authProvider === "google" ? (
                <div className="border-border h-4 w-4 animate-spin rounded-full border-2 border-t-zinc-300" />
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
          <div className="text-muted-foreground flex justify-center gap-4 pt-1 text-xs">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Free
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Saved for 30 days
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
