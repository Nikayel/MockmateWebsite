import { useCallback, useEffect, useRef, useState } from "react"
import { SESSION_IDLE_MS, SESSION_WARNING_MS } from "@/lib/interview/session-lifecycle/policy"

interface Options {
  enabled: boolean
  sessionId: string | null
  onPause: (saveCheckpoint?: boolean) => void
  onResume?: () => void
  onSync?: (
    action: "activate" | "heartbeat" | "pause",
    ownerId: string,
    activity: number,
    manual?: boolean
  ) => Promise<boolean>
}

export function useInterviewLifecycle(options: Options) {
  const latest = useRef(options)
  latest.current = options
  const [paused, setPaused] = useState(false)
  const [warning, setWarning] = useState(false)
  const [blockedByOtherTab, setBlockedByOtherTab] = useState(false)
  const pausedRef = useRef(false)
  const activityRef = useRef(Date.now())
  const [ownerId] = useState(() => crypto.randomUUID())
  const generationRef = useRef(0)
  const lastSessionRef = useRef<string | null>(null)
  const restoredSessionRef = useRef<string | null>(null)
  const pause = useCallback(
    (saveCheckpoint = true, otherTab = false) => {
      setBlockedByOtherTab(otherTab)
      if (pausedRef.current) {
        if (!saveCheckpoint) latest.current.onPause(false)
        return
      }
      pausedRef.current = true
      generationRef.current++
      setPaused(true)
      setWarning(false)
      latest.current.onPause(saveCheckpoint)
      if (saveCheckpoint) void latest.current.onSync?.("pause", ownerId, activityRef.current)
    },
    [ownerId]
  )
  const resume = useCallback(
    (manual = true) => {
      restoredSessionRef.current = null
      const generation = ++generationRef.current
      const activate = () => {
        if (generationRef.current !== generation) return
        activityRef.current = Date.now()
        pausedRef.current = false
        setPaused(false)
        setBlockedByOtherTab(false)
        setWarning(false)
        latest.current.onResume?.()
      }
      const sync = latest.current.onSync?.("activate", ownerId, Date.now(), manual)
      if (sync)
        void sync.then((ok) => {
          if (generationRef.current === generation) {
            if (ok) activate()
            else pause(false, true)
          }
        })
      else activate()
    },
    [ownerId, pause]
  )

  useEffect(() => {
    if (!options.enabled || !options.sessionId) return
    if (
      restoredSessionRef.current !== options.sessionId &&
      (!pausedRef.current ||
        (lastSessionRef.current && lastSessionRef.current !== options.sessionId))
    )
      resume(false)
    lastSessionRef.current = options.sessionId
    const check = () => {
      if (pausedRef.current) return
      const idle = Date.now() - activityRef.current
      if (idle >= SESSION_IDLE_MS) pause()
      else setWarning(idle >= SESSION_WARNING_MS)
    }
    let lastHumanInput = Date.now()
    const activity = (event: Event) => {
      if (event.type === "pointermove" && (event as PointerEvent).buttons === 0) return
      if (event.type === "scroll" && Date.now() - lastHumanInput > 2000) return
      if (event.type !== "scroll") lastHumanInput = Date.now()
      // Check the old clock before recording input: a sleeping tab must not silently resume.
      check()
      if (pausedRef.current || document.visibilityState === "hidden") return
      activityRef.current = Date.now()
      setWarning(false)
    }
    const events = [
      "pointerdown",
      "pointermove",
      "touchmove",
      "keydown",
      "input",
      "scroll",
      "wheel",
    ] as const
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
          if (!ok) pause(false, true)
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
  return {
    paused,
    pauseForRestore: (sessionId: string) => {
      restoredSessionRef.current = sessionId
      pause(false)
    },
    isPaused: () => pausedRef.current,
    warning,
    blockedByOtherTab,
    pause,
    resume: () => resume(true),
    activityRef,
    generationRef,
    ownerId,
  }
}
