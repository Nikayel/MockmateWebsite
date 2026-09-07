"use client"

import { useMemo } from "react"

import { LabOnboardingGate } from "@/components/labs/onboarding/LabOnboardingGate"
import { caseLabOnboardingConfig } from "@/lib/labs/onboarding/case-lab-config"
import type { CaseLab } from "@/lib/labs/types"

/**
 * Plays the "you're in the room" cinematic once per account, the first time
 * someone opens this Case Lab. Same overlay as Meridian, a
 * lighter lab-derived config.
 *
 * Mounted only on the lab's setup screen (never over the immersive workspace),
 * so it precedes the brief and hands off onto a screen that still carries the
 * app `<Header/>`. Lazy + `ssr:false`, and null on the server / first render
 * (mounted guard), so it never touches the page's HTML or bundle until it plays.
 */

export function CaseLabOnboardingGate({ lab }: { lab: CaseLab }) {
  const config = useMemo(() => caseLabOnboardingConfig(lab), [lab])
  return <LabOnboardingGate config={config} />
}
