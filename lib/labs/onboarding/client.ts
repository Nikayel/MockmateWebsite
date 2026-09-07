import { authedFetch, authedJsonFetch, type TokenProvider } from "@/lib/api/authed-fetch"

import type { LabOnboardingId } from "./ids"

interface OnboardingStateResponse {
  completed?: unknown
}

interface CompleteOnboardingResponse {
  completion?: unknown
}

const completionCache = new Map<string, boolean | Promise<boolean>>()

function cacheKey(userId: string, onboardingId: LabOnboardingId): string {
  return `${userId}:${onboardingId}`
}

function parseCompletionState(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    throw new Error("The onboarding service returned an invalid response")
  }

  const completed = (payload as OnboardingStateResponse).completed
  if (typeof completed !== "boolean") {
    throw new Error("The onboarding service returned an invalid completion state")
  }

  return completed
}

/**
 * Read the account-scoped completion state, deduplicating same-tab callers.
 * The overview and run redirect can both ask this question during a navigation.
 */
export function getLabOnboardingCompletion(
  userId: string,
  onboardingId: LabOnboardingId,
  tokenProvider: TokenProvider
): Promise<boolean> {
  const key = cacheKey(userId, onboardingId)
  const cached = completionCache.get(key)
  if (typeof cached === "boolean") return Promise.resolve(cached)
  if (cached) return cached

  const request = authedFetch<OnboardingStateResponse>(
    `/api/labs/onboarding?onboardingId=${encodeURIComponent(onboardingId)}`,
    { tokenProvider }
  )
    .then((result) => {
      if (!result.ok) throw new Error(result.error ?? "Could not load onboarding status")
      const completed = parseCompletionState(result.data)
      completionCache.set(key, completed)
      return completed
    })
    .catch((error: unknown) => {
      completionCache.delete(key)
      throw error
    })

  completionCache.set(key, request)
  return request
}

/** Persist a completion before the user enters the Lab experience. */
export async function completeLabOnboardingForUser(
  userId: string,
  onboardingId: LabOnboardingId,
  tokenProvider: TokenProvider
): Promise<void> {
  const result = await authedJsonFetch<CompleteOnboardingResponse>(
    "/api/labs/onboarding",
    "POST",
    { onboardingId },
    { tokenProvider }
  )

  if (!result.ok || !result.data || typeof result.data !== "object") {
    throw new Error(result.error ?? "Could not save onboarding status")
  }

  completionCache.set(cacheKey(userId, onboardingId), true)
}

/** Test-only cache reset. */
export function __resetLabOnboardingCompletionCache(): void {
  completionCache.clear()
}
