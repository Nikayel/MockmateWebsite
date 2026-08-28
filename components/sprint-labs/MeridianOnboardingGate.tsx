"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

import { hasSeenOnboarding } from "@/lib/labs/onboarding/onboarding-state"
import { MERIDIAN_ONBOARDING } from "@/lib/labs/onboarding/meridian-config"

/**
 * Plays the "you're hired" cinematic once, the first time someone opens the
 * Meridian workbook, then never again on this device.
 *
 * The overlay (with three.js + framer-motion) is dynamically imported and
 * `ssr:false`, so none of it touches the static workbook page's HTML, bundle,
 * or first paint — the gate renders `null` on the server and on the first client
 * render (the standard mounted-guard), decides from localStorage after mount,
 * and unmounts the overlay on handoff. Because the overlay sits above the page's
 * own `<Header/>` and then unmounts, the app navbar and the workbook are right
 * there the moment the cinematic ends.
 */

const LabOnboarding = dynamic(
  () => import("@/components/labs/onboarding/LabOnboarding").then((m) => m.LabOnboarding),
  { ssr: false }
)

export function MeridianOnboardingGate() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!hasSeenOnboarding(MERIDIAN_ONBOARDING.id)) setShow(true)
  }, [])

  if (!show) return null
  return <LabOnboarding config={MERIDIAN_ONBOARDING} onDone={() => setShow(false)} />
}
