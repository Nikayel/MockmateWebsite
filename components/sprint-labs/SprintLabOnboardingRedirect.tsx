"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { SparraLoader } from "@/components/brand/SparraLoader"
import { useAuth } from "@/lib/auth-context"
import { getLabOnboardingCompletion } from "@/lib/labs/onboarding/client"
import { getSprintLabOnboardingId } from "@/lib/labs/onboarding/ids"

/**
 * Keeps a first-time Sprint Lab learner on the public overview until their
 * account-scoped walkthrough has finished. This closes deep-link and post-login
 * bypasses of the overview-only onboarding overlay.
 */
export function SprintLabOnboardingRedirect({
  workbookId,
  children,
}: {
  workbookId: string
  children: ReactNode
}) {
  const { firebaseUser, initialized } = useAuth()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const onboardingId = getSprintLabOnboardingId(workbookId)

  useEffect(() => {
    if (!initialized || !firebaseUser) return
    if (!onboardingId) {
      setReady(true)
      return
    }

    let active = true
    const tokenProvider = (forceRefresh: boolean) => firebaseUser.getIdToken(forceRefresh)

    getLabOnboardingCompletion(firebaseUser.uid, onboardingId, tokenProvider)
      .then((completed) => {
        if (!active) return
        if (!completed) {
          router.replace(`/sprint-labs/${workbookId}`)
          return
        }
        setReady(true)
      })
      .catch((error: unknown) => {
        // Do not block a paid work surface on a best-effort experience check.
        console.error("[Sprint Labs] Failed to check onboarding completion", error)
        if (active) setReady(true)
      })

    return () => {
      active = false
    }
  }, [firebaseUser, initialized, onboardingId, router, workbookId])

  if (!ready) {
    return <SparraLoader className="min-h-screen" label="Preparing your Sprint Lab…" />
  }

  return <>{children}</>
}
