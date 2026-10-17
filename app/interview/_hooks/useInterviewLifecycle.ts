import { useCallback, useEffect, useRef, useState } from "react"
import { SESSION_IDLE_MS, SESSION_WARNING_MS } from "@/lib/interview/session-lifecycle/policy"

interface Options {
  enabled: boolean
  sessionId: string | null
  onPause: () => void
  onResume?: () => void
  onSync?: (
    action: "activate" | "heartbeat" | "pause",
    ownerId: string,
    activity: number
  ) => Promise<boolean>
}

export function useInterviewLifecycle(options: Options) {
  const latest = useRef(options)
  latest.current = options
  const [paused, setPaused] = useState(false)
  const [warning, setWarning] = useState(false)
  const pausedRef = useRef(false)
  const activityRef = useRef(Date.now())
  const ownerId = useRef(crypto.randomUUID()).current
  const generationRef = useRef(0)
  const lastSessionRef = useRef<string | null>(null)
  const pause = useCallback(() => {
    if (pausedRef.current) return
    pausedRef.current = true
    generationRef.current++
    setPaused(true)
    setWarning(false)
    latest.current.onPause()
    void latest.current.onSync?.("pause", ownerId, activityRef.current)
  }, [ownerId])
  const resume = useCallback(() => {
    activityRef.current = Date.now()
    pausedRef.current = false
    generationRef.current++
    setPaused(false)
    setWarning(false)
    latest.current.onResume?.()
    void latest.current.onSync?.("activate", ownerId, activityRef.current).then((ok) => {
      if (!ok) pause()
    })
  }, [ownerId, pause])

  useEffect(() => {
    if (!options.enabled || !options.sessionId) return
    if (
      !pausedRef.current ||
      (lastSessionRef.current && lastSessionRef.current !== options.sessionId)
    )
      resume()
    lastSessionRef.current = options.sessionId
    const check = () => {
      if (pausedRef.current) return
      const idle = Date.now() - activityRef.current
      if (idle >= SESSION_IDLE_MS) pause()
      else setWarning(idle >= SESSION_WARNING_MS)
    }
    const activity = () => {
      // Check the old clock before recording input: a sleeping tab must not silently resume.
      check()
      if (pausedRef.current || document.visibilityState === "hidden") return
      activityRef.current = Date.now()
      setWarning(false)
    }
    const events = ["pointerdown", "keydown", "input", "scroll", "wheel"] as const
    events.forEach((event) =>
      window.addEventListener(event, activity, { capture: true, passive: true })
    )
    document.addEventListener("visibilitychange", check)
    window.addEventListener("focus", check)
    const generation = generationRef
    const clock = setInterval(check, 1000)
    const heartbeat = setInterval(() => {
      if (!pausedRef.current && document.visibilityState !== "hidden") {
        void latest.current.onSync?.("heartbeat", ownerId, activityRef.current).then((ok) => {
          if (!ok) pause()
        })
      }
    }, 30000)
    return () => {
      clearInterval(clock)
      clearInterval(heartbeat)
      events.forEach((event) => window.removeEventListener(event, activity, true))
      document.removeEventListener("visibilitychange", check)
      window.removeEventListener("focus", check)
      generation.current++
    }
    // Latest callbacks are read from refs; only a different attempt resets the clock.
  }, [options.enabled, options.sessionId, ownerId, pause, resume])
  return { paused, warning, pause, resume, activityRef, generationRef, ownerId }
}
