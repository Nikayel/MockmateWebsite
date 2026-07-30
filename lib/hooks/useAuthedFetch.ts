"use client"

import { useCallback, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  authedFetch,
  authedJsonFetch,
  type AuthedFetchResult,
  type TokenProvider,
} from "@/lib/api/authed-fetch"

/**
 * Binds `authedFetch` to the signed-in user.
 *
 * Replaces the `getIdToken()` + `fetch(..., { Authorization })` block repeated
 * across 56 files. The reason to route through one place is not tidiness: almost
 * none of those call sites distinguish a 401 from any other failure, so an expired
 * token renders as a generic error or an empty screen. `authedFetch` retries once
 * with a refreshed token and, when that fails, reports `needsReauth` so a caller
 * can prompt sign-in.
 *
 * Returns a stable callback pair, so it is safe in a `useEffect` dependency list
 * as long as the user has not changed.
 */
export function useAuthedFetch() {
  const { firebaseUser } = useAuth()

  const tokenProvider = useMemo<TokenProvider>(
    () => async (forceRefresh: boolean) => {
      if (!firebaseUser) return null
      return firebaseUser.getIdToken(forceRefresh)
    },
    [firebaseUser]
  )

  /** GET (or any verb via `init`) returning parsed JSON. */
  const get = useCallback(
    <T = unknown>(url: string, init?: RequestInit): Promise<AuthedFetchResult<T>> =>
      authedFetch<T>(url, { ...init, tokenProvider }),
    [tokenProvider]
  )

  /** JSON-bodied write. */
  const send = useCallback(
    <T = unknown>(
      url: string,
      method: "POST" | "PUT" | "PATCH" | "DELETE",
      body?: unknown,
      init?: RequestInit
    ): Promise<AuthedFetchResult<T>> =>
      authedJsonFetch<T>(url, method, body, { ...init, tokenProvider }),
    [tokenProvider]
  )

  return {
    get,
    send,
    /** False before sign-in completes; a request would fail with needsReauth. */
    isAuthenticated: !!firebaseUser,
  }
}
