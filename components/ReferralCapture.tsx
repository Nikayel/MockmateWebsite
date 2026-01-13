"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

/**
 * Inner component that uses searchParams
 */
function ReferralCaptureInner() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const referralCode = searchParams.get("ref")
    if (referralCode) {
      // Store for processing after signup
      localStorage.setItem("pending_referral_code", referralCode.toUpperCase())
    }
  }, [searchParams])

  return null
}

/**
 * Captures referral code from URL params and stores in localStorage
 * This runs on any page so users can land anywhere with ?ref=CODE
 */
export function ReferralCapture() {
  return (
    <Suspense fallback={null}>
      <ReferralCaptureInner />
    </Suspense>
  )
}
