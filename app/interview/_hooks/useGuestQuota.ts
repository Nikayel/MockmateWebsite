import { useCallback, useState } from "react"
import { canStartFreeTrial, getOrCreateGuestId } from "@/lib/guest-session"
import { checkUsageLimit } from "@/lib/firestore-helpers"

/**
 * The slice of a user's usage allowance the interview page cares about. This is
 * a structural subset of {@link checkUsageLimit}'s richer result — extra fields
 * (freeOpensRemaining, periodEnd) are carried through at runtime but unused
 * here, matching the previous inline state shape.
 */
export interface UsageLimit {
  used: number
  limit: number
  allowed: boolean
}

/**
 * Pure entitlement gate. A usage limit blocks starting a session only for a
 * signed-in user, on a non-DSA scenario, whose allowance is exhausted. Guests
 * and DSA practice are never blocked here. Mirrors the inline check exactly.
 */
export function isUsageBlocked(
  hasUser: boolean,
  usageLimit: UsageLimit | null,
  scenarioType: string
): boolean {
  return hasUser && usageLimit !== null && !usageLimit.allowed && scenarioType !== "dsa"
}

export interface UseGuestQuotaReturn {
  isGuestMode: boolean
  guestId: string | null
  usageLimit: UsageLimit | null
  /** Whether a returning visitor may still start a free guest trial. */
  canStartGuestTrial: () => boolean
  /** Issue/restore a guest id and enter guest mode; returns the guest id. */
  enterGuestMode: () => string
  /** Leave guest mode (taken on the authenticated path). */
  exitGuestMode: () => void
  /** Fetch and store the usage limit for a signed-in user. */
  refreshUsageLimit: (uid: string) => Promise<void>
}

/**
 * Owns the interview's guest-mode + usage-limit entitlement state: whether the
 * visitor is an anonymous guest, their guest id, and the signed-in user's usage
 * allowance. Transitions (`enterGuestMode`/`exitGuestMode`/`refreshUsageLimit`)
 * and the {@link isUsageBlocked} gate centralize the auth/quota pattern that was
 * previously inlined in `app/interview/page.tsx`.
 */
export function useGuestQuota(): UseGuestQuotaReturn {
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [guestId, setGuestId] = useState<string | null>(null)
  const [usageLimit, setUsageLimit] = useState<UsageLimit | null>(null)

  const enterGuestMode = useCallback(() => {
    const gId = getOrCreateGuestId()
    setGuestId(gId)
    setIsGuestMode(true)
    return gId
  }, [])

  const exitGuestMode = useCallback(() => {
    setIsGuestMode(false)
    setGuestId(null)
  }, [])

  const refreshUsageLimit = useCallback(async (uid: string) => {
    const usage = await checkUsageLimit(uid)
    setUsageLimit(usage)
  }, [])

  return {
    isGuestMode,
    guestId,
    usageLimit,
    canStartGuestTrial: canStartFreeTrial,
    enterGuestMode,
    exitGuestMode,
    refreshUsageLimit,
  }
}
