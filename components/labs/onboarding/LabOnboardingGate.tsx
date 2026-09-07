"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"

import { useAuth } from "@/lib/auth-context"
import {
  completeLabOnboardingForUser,
  getLabOnboardingCompletion,
} from "@/lib/labs/onboarding/client"
import type { OnboardingConfig } from "@/lib/labs/onboarding/config"

const LabOnboarding = dynamic(
  () => import("./LabOnboarding").then((module) => module.LabOnboarding),
  { ssr: false }
)

type GateState = "loading" | "hidden" | "showing"

/**
 * Loads and records a Lab onboarding against the authenticated account.
 *
 * Signed-out visitors can still browse public Lab pages, but the role-play
 * walkthrough belongs to the person who will enter the Lab, so it waits until
 * Firebase resolves an account rather than leaving browser-wide state behind.
 */
export function LabOnboardingGate({ config }: { config: OnboardingConfig }) {
  const { firebaseUser, initialized } = useAuth()
  const [state, setState] = useState<GateState>("loading")

  useEffect(() => {
    if (!initialized) return
    if (!firebaseUser) {
      setState("hidden")
      return
    }

    let active = true
    const tokenProvider = (forceRefresh: boolean) => firebaseUser.getIdToken(forceRefresh)

    getLabOnboardingCompletion(firebaseUser.uid, config.id, tokenProvider)
      .then((completed) => {
        if (active) setState(completed ? "hidden" : "showing")
      })
      .catch((error: unknown) => {
        // Onboarding is an enhancement, not an access gate. Let the Lab remain
        // usable if Firestore is temporarily unavailable; the next visit retries.
        console.error("[Lab onboarding] Failed to load completion state", error)
        if (active) setState("hidden")
      })

    return () => {
      active = false
    }
  }, [config.id, firebaseUser, initialized])

  const handleDone = useCallback(async () => {
    if (!firebaseUser) {
      setState("hidden")
      return
    }

    const tokenProvider = (forceRefresh: boolean) => firebaseUser.getIdToken(forceRefresh)
    try {
      await completeLabOnboardingForUser(firebaseUser.uid, config.id, tokenProvider)
    } catch (error) {
      // Do not trap a learner in a cosmetic overlay because its persistence
      // write failed. A later visit will retry because no completion was saved.
      console.error("[Lab onboarding] Failed to save completion state", error)
    }
    setState("hidden")
  }, [config.id, firebaseUser])

  if (state !== "showing") return null
  return <LabOnboarding config={config} onDone={handleDone} />
}
