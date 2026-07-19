/**
 * Shared client-side fetch helpers for the Learn API clients (progress + design answers).
 *
 * Attach the Firebase auth token and bound requests with a timeout. Each client keeps its own
 * endpoint and degrades to a safe empty value (null / []) when signed out or on a non-ok
 * response, so these helpers stay endpoint-agnostic.
 */
import { getCurrentUserToken } from "@/lib/firebase-lazy"

export const REQUEST_TIMEOUT_MS = 8000

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export async function authHeaders(): Promise<Record<string, string> | null> {
  const token = await getCurrentUserToken()
  if (!token) return null
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}
