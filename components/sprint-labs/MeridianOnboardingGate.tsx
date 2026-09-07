"use client"

import { LabOnboardingGate } from "@/components/labs/onboarding/LabOnboardingGate"
import { MERIDIAN_ONBOARDING } from "@/lib/labs/onboarding/meridian-config"

/**
 * Plays the "you're hired" cinematic once for each account that opens the
 * Meridian workbook.
 *
 * The overlay (with three.js + framer-motion) is dynamically imported and
 * `ssr:false`, so none of it touches the static workbook page's HTML, bundle,
 * or first paint — the gate renders `null` on the server and until the signed-in
 * account's completion state returns, then unmounts the overlay on handoff.
 * Because the overlay sits above the page's own `<Header/>`, the app navbar and
 * workbook are right there the moment the cinematic ends. Completion lives in Firestore, so a
 * second account on the same browser still receives its own walkthrough.
 */

export function MeridianOnboardingGate() {
  return <LabOnboardingGate config={MERIDIAN_ONBOARDING} />
}
