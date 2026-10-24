"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import type { SessionInspection } from "@/lib/admin/session-review/types"

type InspectionState =
  | { status: "loading" }
  | { status: "ready"; inspection: SessionInspection }
  | { status: "error"; message: string }

export function useSessionInspection(sessionId: string | null, token: string | null) {
  const { firebaseUser } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ sessionId: string; state: InspectionState } | null>(null)
  useEffect(() => {
    if (!sessionId) return
    if (!firebaseUser && !token) {
      setResult({
        sessionId,
        state: {
          status: "error",
          message: "Sign in with an admin account to inspect this session.",
        },
      })
      return
    }
    const controller = new AbortController()
    setResult({ sessionId, state: { status: "loading" } })
    const selectedId = sessionId
    async function load() {
      try {
        const accessToken = firebaseUser ? await firebaseUser.getIdToken() : token
        const response = await fetch(
          `/api/admin/sessions?sessionId=${encodeURIComponent(selectedId)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          }
        )
        const body = await response.json().catch(() => null)
        if (!response.ok || !body?.success)
          throw new Error(body?.error || `Request failed with status ${response.status}`)
        if (!controller.signal.aborted)
          setResult({
            sessionId: selectedId,
            state: { status: "ready", inspection: body as SessionInspection },
          })
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            sessionId: selectedId,
            state: {
              status: "error",
              message: error instanceof Error ? error.message : "Could not load this session",
            },
          })
      }
    }
    void load()
    return () => controller.abort()
  }, [sessionId, token, firebaseUser, attempt])
  return {
    state: result && result.sessionId === sessionId ? result.state : { status: "loading" as const },
    retry: () => setAttempt((current) => current + 1),
  }
}
