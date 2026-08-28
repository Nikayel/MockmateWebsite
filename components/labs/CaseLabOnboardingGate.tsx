"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"

import { caseLabOnboardingConfig } from "@/lib/labs/onboarding/case-lab-config"
import { hasSeenOnboarding } from "@/lib/labs/onboarding/onboarding-state"
import type { CaseLab } from "@/lib/labs/types"

/**
 * Plays the "you're in the room" cinematic once, the first time someone opens
 * this Case Lab, then never again on this device. Same overlay as Meridian, a
 * lighter lab-derived config.
 *
 * Mounted only on the lab's setup screen (never over the immersive workspace),
 * so it precedes the brief and hands off onto a screen that still carries the
 * app `<Header/>`. Lazy + `ssr:false`, and null on the server / first render
 * (mounted guard), so it never touches the page's HTML or bundle until it plays.
 */

const LabOnboarding = dynamic(
  () => import("@/components/labs/onboarding/LabOnboarding").then((m) => m.LabOnboarding),
  { ssr: false }
)

export function CaseLabOnboardingGate({ lab }: { lab: CaseLab }) {
  const config = useMemo(() => caseLabOnboardingConfig(lab), [lab])
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!hasSeenOnboarding(config.id)) setShow(true)
  }, [config.id])

  if (!show) return null
  return <LabOnboarding config={config} onDone={() => setShow(false)} />
}
