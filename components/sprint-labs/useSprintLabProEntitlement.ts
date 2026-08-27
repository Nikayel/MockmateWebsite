"use client"

/**
 * useSprintLabProEntitlement — the sprint-2+ paywall's entitlement check.
 *
 * UX-SPEC.md §12.6: "Entitlement itself follows the existing three-outcome pattern from
 * `app/practice/page.tsx`: `isPro: boolean | null` plus an `entitlementFailed` flag, so a failed
 * check shows an error with a retry, never an upgrade wall to a paying subscriber." This hook
 * reproduces that exact pattern (same endpoint, same `isPaidTier` call, same three outcomes) so the
 * run surface's Pro wall degrades the same way `/practice`'s already does: a network blip must read
 * as "we couldn't tell" and offer a retry, never as "you're not Pro" to someone who is.
 *
 * `enabled` gates the fetch: `sprintRequiresPro(n)` is false for sprint 1, which is the overwhelming
 * common case, and there is no reason to spend an authenticated round trip checking entitlement for a
 * sprint nothing gates. Callers pass `sprintRequiresPro(currentSprint)` as `enabled`.
 */

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { isPaidTier } from "@/lib/pricing"
import type { SubscriptionTier } from "@/lib/config"

export interface SprintLabProEntitlementState {
  /** `null` while unresolved (also true when `enabled` is false — nothing has been asked yet). */
  isPro: boolean | null
  /** True when the check itself failed (no token, network error, non-2xx) — distinct from "not Pro". */
  entitlementFailed: boolean
  /** Re-runs the check. A no-op while `enabled` is false. */
  retry: () => void
}

const UNRESOLVED = { isPro: null as boolean | null, entitlementFailed: false }

export function useSprintLabProEntitlement(enabled: boolean): SprintLabProEntitlementState {
  const { user } = useAuth()
  const [{ isPro, entitlementFailed }, setResult] = useState(UNRESOLVED)
  // Bumped by retry() to re-run the effect even though `enabled`/`user` haven't changed.
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!enabled || !user) {
      setResult(UNRESOLVED)
      return
    }
    let cancelled = false
    setResult(UNRESOLVED)
    ;(async () => {
      try {
        const token = await getCurrentUserToken()
        if (!token) {
          if (!cancelled) setResult({ isPro: false, entitlementFailed: true })
          return
        }
        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (!cancelled) setResult({ isPro: false, entitlementFailed: true })
          return
        }
        const profile = (await res.json()) as { subscription_tier?: SubscriptionTier }
        if (!cancelled) {
          setResult({
            isPro: isPaidTier(profile.subscription_tier ?? "free"),
            entitlementFailed: false,
          })
        }
      } catch {
        if (!cancelled) setResult({ isPro: false, entitlementFailed: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, user, retryToken])

  return { isPro, entitlementFailed, retry: () => setRetryToken((n) => n + 1) }
}
