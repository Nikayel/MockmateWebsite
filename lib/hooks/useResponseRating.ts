"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useAuthedFetch } from "./useAuthedFetch"
import {
  savedResponseFeedbackSchema,
  type ResponseRating,
} from "@/lib/ai-response-feedback/contract"

export function useResponseRating(generationId: string, responseId: string) {
  const { firebaseUser } = useAuth()
  const { get, send } = useAuthedFetch()
  const key = `${firebaseUser?.uid ?? ""}:${generationId}:${responseId}`
  const current = useRef(key)
  current.current = key
  const inFlight = useRef<string | null>(null)
  const [saved, setSaved] = useState<{
    key: string
    value: ResponseRating | null
    error?: string
  } | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseUser) return
    current.current = key
    let active = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    void get(`/api/ai-response-feedback?${new URLSearchParams({ generationId, responseId })}`, {
      signal: controller.signal,
    }).then((result) => {
      if (!active || current.current !== key) return
      const parsed = savedResponseFeedbackSchema.safeParse(result.data)
      setSaved({
        key,
        value: result.ok && parsed.success ? parsed.data.feedbackType : null,
        ...(!result.ok || !parsed.success
          ? { error: "Couldn’t load your rating. You can try saving it again." }
          : {}),
      })
    })
    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
      // Ignore both reads and writes from a previous identity or unmounted card.
      if (current.current === key) current.current = ""
    }
  }, [firebaseUser, generationId, responseId, get, key])

  const rate = async (value: ResponseRating) => {
    if (!firebaseUser || inFlight.current === key) return
    inFlight.current = key
    setSavingKey(key)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    try {
      const result = await send(
        "/api/ai-response-feedback",
        "POST",
        { generationId, responseId, feedbackType: value },
        { signal: controller.signal }
      )
      if (current.current !== key) return
      const parsed = savedResponseFeedbackSchema.safeParse(result.data)
      if (!result.ok || !parsed.success || parsed.data.feedbackType !== value) {
        setSaved((previous) => ({
          key,
          value: previous?.key === key ? previous.value : null,
          error: result.needsReauth
            ? "Sign in again to save your rating."
            : "Couldn’t save your rating. Please try again.",
        }))
      } else setSaved({ key, value })
    } finally {
      clearTimeout(timer)
      if (inFlight.current === key) inFlight.current = null
      if (current.current === key) setSavingKey(null)
    }
  }
  return {
    isSignedIn: Boolean(firebaseUser),
    value: saved?.key === key ? saved.value : null,
    error: saved?.key === key ? saved.error : undefined,
    busy: saved?.key !== key || savingKey === key,
    rate,
  }
}
