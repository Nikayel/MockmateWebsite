import { useEffect, useRef, useState } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { toast } from "sonner"
import { consumeRedirectSignIn, hasRedirectSignInInFlight } from "@/lib/auth"
import { createOrUpdateProfile } from "@/lib/firestore-helpers"
import { getAttribution } from "@/lib/attribution"
import { trackLogin, trackSignup } from "@/lib/analytics"
import { reportFunnelEvent } from "@/lib/metrics/funnel-client"
import { hasPendingGuestMigration, migrateGuestSessionsOnLogin } from "@/lib/guest-migration"

export interface UseRedirectSignInReturnOptions {
  firebaseUser: FirebaseUser | null
  initialized: boolean
  router: AppRouterInstance
}

export interface UseRedirectSignInReturnResult {
  /**
   * True while this page load is (or may still be) the return leg of a
   * redirect sign-in. The page must hold its session-reopen effect until this
   * clears: the reopen path would otherwise exit guest mode and bind a live
   * interview to a session the new account does not own yet.
   */
  redirectReturnPending: boolean
}

/**
 * The /interview return leg of a popup-blocked sign-in.
 *
 * signInWithRedirect returns the browser to the INITIATING page as a cold
 * load. For the post-trial SignupPrompt that page is /interview — but the
 * post-sign-in work (profile creation, sign-up analytics, guest migration)
 * only existed on /login, so a redirected convert used to come back to a
 * blank restarted interview with no profile and no migrated session. This
 * hook runs that same work here and lands the convert on /sessions/{id}.
 */
export function useRedirectSignInReturn(
  opts: UseRedirectSignInReturnOptions
): UseRedirectSignInReturnResult {
  const [redirectReturnPending, setRedirectReturnPending] = useState(() =>
    hasRedirectSignInInFlight()
  )
  const handledRef = useRef(false)

  useEffect(() => {
    if (!redirectReturnPending || handledRef.current) return
    if (!opts.initialized) return

    if (!opts.firebaseUser) {
      // Auth initialized with no user: the visitor cancelled at the provider
      // or the redirect failed. Clear the marker and hand the page back to
      // the normal guest flow.
      handledRef.current = true
      consumeRedirectSignIn()
      setRedirectReturnPending(false)
      return
    }

    handledRef.current = true
    const firebaseUser = opts.firebaseUser
    const completeReturnLeg = async () => {
      consumeRedirectSignIn()

      // The popup path tracks inside signInWithPopup; this leg completes as
      // a cold load and must report itself or a redirect convert reads as a
      // failed click in the funnel.
      const isNewUser = firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime
      const provider =
        firebaseUser.providerData[0]?.providerId === "github.com" ? "github" : "google"
      if (isNewUser) {
        trackSignup(provider, firebaseUser.uid)
        reportFunnelEvent("signup")
      } else {
        trackLogin(provider, firebaseUser.uid)
        reportFunnelEvent("login")
      }

      try {
        await createOrUpdateProfile(
          firebaseUser.uid,
          firebaseUser.email || "",
          firebaseUser.displayName,
          firebaseUser.photoURL,
          isNewUser ? getAttribution() : null
        )
      } catch (error) {
        // Without a profile document checkout 404s forever, so do not
        // pretend this worked; /login owns the recovery path.
        console.error("Redirect return-leg profile creation failed:", error)
        toast.error("Finishing sign-in failed", {
          description: "Please sign in again from the login page.",
        })
        setRedirectReturnPending(false)
        return
      }

      const promisedRecovery = hasPendingGuestMigration()
      const migration = await migrateGuestSessionsOnLogin({
        idToken: await firebaseUser.getIdToken(),
      })

      if (migration.status === "migrated" && migration.sessionId) {
        toast.success("Your trial session has been saved!", {
          description: "Opening your results...",
        })
        // Pending stays raised: this page is navigating away, and releasing
        // it would let the reopen effect race the redirect.
        opts.router.replace(`/sessions/${migration.sessionId}`)
        return
      }

      if (migration.status === "migrated") {
        toast.success("Your trial session has been saved!", {
          description: "View it in your sessions history.",
        })
      } else if (migration.status === "gone" && promisedRecovery) {
        toast.error("We couldn't recover your trial session", {
          description: "It may have expired. Your new account is ready to use.",
        })
      } else if (migration.status === "transient" && promisedRecovery) {
        toast.warning("We couldn't connect your trial session yet", {
          description: "We'll retry the next time you sign in.",
        })
      }

      // Staying signed-in on /interview: drop any guest ?session params so
      // the reopen effect cannot bind a live interview to an unowned session
      // (streaming one burns the AI call into a persist 403).
      opts.router.replace("/interview")
      setRedirectReturnPending(false)
    }
    void completeReturnLeg()
  }, [redirectReturnPending, opts.initialized, opts.firebaseUser, opts.router])

  return { redirectReturnPending }
}
