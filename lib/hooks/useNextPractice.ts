"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useAuthedFetch } from "./useAuthedFetch"
import { trackEvent } from "@/lib/analytics"
import type { NextPracticeResponse } from "@/lib/agents/recommendations/next-practice-types"
import { nextPracticeResponseSchema } from "@/lib/agents/recommendations/next-practice-response-schema"

type Result =
  | NextPracticeResponse
  | { status: "loading" | "error" | "signed_out" | "reauth_required" }
const SAVE_RETRY_DELAYS = [1_000, 2_000, 4_000, 8_000, 15_000]

export function useNextPractice(sessionId: string) {
  const { firebaseUser } = useAuth()
  const { get } = useAuthedFetch()
  const [attempt, setAttempt] = useState(0)
  const key = `${firebaseUser?.uid ?? ""}:${sessionId}`
  const [loaded, setLoaded] = useState<{ key: string; result: Result } | null>(null)
  const reported = useRef(new Set<string>())

  useEffect(() => {
    if (!firebaseUser || !sessionId) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let saveRetries = 0
    setLoaded({ key, result: { status: "loading" } })
    const fetchNext = async () => {
      try {
        const response = await get<NextPracticeResponse>(
          `/api/recommendations/next-practice?sessionId=${encodeURIComponent(sessionId)}`,
          { signal: controller.signal }
        )
        if (controller.signal.aborted) return
        const parsed = nextPracticeResponseSchema.safeParse(response.data)
        const result: Result = response.needsReauth
          ? { status: "reauth_required" }
          : response.status === 404
            ? { status: "not_found" }
            : response.ok && parsed.success
              ? parsed.data
              : { status: "error" }
        setLoaded({ key, result })
        if (result.status === "not_ready" && saveRetries < SAVE_RETRY_DELAYS.length) {
          timer = setTimeout(() => void fetchNext(), SAVE_RETRY_DELAYS[saveRetries++])
        }
        if (result.status === "ready") {
          const impressionKey = `${key}:${result.recommendation.scenarioId}`
          if (!reported.current.has(impressionKey)) {
            reported.current.add(impressionKey)
            trackEvent("next_practice_impression", {
              source_session_id: sessionId,
              scenario_id: result.recommendation.scenarioId,
              scenario_type: result.recommendation.type,
              focus_source: result.recommendation.focusSource,
              recommendation_source: "feedback",
            })
          }
        }
      } catch {
        if (!controller.signal.aborted) setLoaded({ key, result: { status: "error" } })
      }
    }
    void fetchNext()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [get, firebaseUser, sessionId, key, attempt])

  const result: Result = !firebaseUser
    ? { status: "signed_out" }
    : loaded?.key === key
      ? loaded.result
      : { status: "loading" }
  return { result, retry: () => setAttempt((value) => value + 1) }
}
