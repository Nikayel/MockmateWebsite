"use client"

import { useEffect, useRef } from "react"
import { trackEvent } from "@/lib/analytics"

export function useFeedbackViewAnalytics({
  sessionId,
  feedbackReady,
  surface,
  problemType,
  language,
}: {
  sessionId?: string
  feedbackReady: boolean
  surface: "interview" | "saved_session"
  problemType?: string
  language: string
}) {
  const reported = useRef(new Set<string>())
  useEffect(() => {
    if (!sessionId || !feedbackReady) return
    const key = `${surface}:${sessionId}`
    if (reported.current.has(key)) return
    reported.current.add(key)
    trackEvent("feedback_viewed", {
      session_id: sessionId,
      feedback_surface: surface,
      ...(problemType ? { scenario_type: problemType } : {}),
      language,
    })
  }, [sessionId, feedbackReady, surface, problemType, language])
}
