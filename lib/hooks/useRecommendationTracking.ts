"use client"
import { useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { useAuthedFetch } from "./useAuthedFetch"
import type { RecommendationStart } from "@/lib/agents/recommendations/decision-contract"

/** A view means at least half the card was in a visible tab for one continuous second. */
export function useRecommendationTracking(
  decisionId: string | undefined,
  returnSource: RecommendationStart["returnSource"]
) {
  const ref = useRef<HTMLElement>(null)
  const { firebaseUser } = useAuth()
  const { send } = useAuthedFetch()
  const attempted = useRef(new Set<string>())
  const key = `${firebaseUser?.uid ?? ""}:${decisionId ?? ""}`

  const reportClick = () => {
    if (!firebaseUser || !decisionId || attempted.current.has(`${key}:clicked`)) return
    attempted.current.add(`${key}:clicked`)
    void send(
      "/api/recommendations/interaction",
      "POST",
      {
        decisionId,
        stage: "clicked",
        returnSource,
      },
      { keepalive: true }
    ).catch(() => {})
  }

  useEffect(() => {
    const element = ref.current
    if (!firebaseUser || !decisionId || !element || typeof IntersectionObserver === "undefined")
      return
    let intersecting = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const update = () => {
      clearTimeout(timer)
      if (
        !intersecting ||
        document.visibilityState !== "visible" ||
        attempted.current.has(`${key}:viewed`)
      )
        return
      timer = setTimeout(() => {
        if (document.visibilityState !== "visible") return
        attempted.current.add(`${key}:viewed`)
        void send(
          "/api/recommendations/interaction",
          "POST",
          {
            decisionId,
            stage: "viewed",
            returnSource,
          },
          { keepalive: true }
        ).catch(() => {})
      }, 1_000)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting && entry.intersectionRatio >= 0.5
        update()
      },
      { threshold: [0, 0.5] }
    )
    observer.observe(element)
    document.addEventListener("visibilitychange", update)
    return () => {
      observer.disconnect()
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", update)
    }
  }, [decisionId, firebaseUser, key, returnSource, send])

  return { ref, reportClick }
}
