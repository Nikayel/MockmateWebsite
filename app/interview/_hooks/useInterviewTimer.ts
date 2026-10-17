import { useEffect, useState } from "react"
import { SESSION_IDLE_MS } from "@/lib/interview/session-lifecycle/policy"

/** Whole seconds elapsed between `startTime` and `now` (both epoch ms). */
export function computeElapsedSeconds(startTime: number, now: number): number {
  return Math.floor((now - startTime) / 1000)
}

/** Background throttling must not count hours away as active practice. */
export function computePausedElapsedSeconds(
  startTime: number,
  lastActivityAt: number,
  now: number
): number {
  return Math.max(
    0,
    computeElapsedSeconds(startTime, Math.min(now, lastActivityAt + SESSION_IDLE_MS))
  )
}

export interface UseInterviewTimerReturn {
  /** Epoch ms when the interview clock started, or null before it starts. */
  startTime: number | null
  setStartTime: (value: number | null) => void
  /** Seconds elapsed since `startTime`, ticked once per second while active. */
  elapsedTime: number
  setElapsedTime: (value: number) => void
}

/**
 * Owns the interview elapsed-time clock: `startTime`/`elapsedTime` state plus
 * the once-per-second tick that runs only while `isActive` and `startTime` is
 * set. Setters are returned so callers can seed the clock on restore, reset it,
 * or stop it (set `startTime` to null). Extracted verbatim from the inline
 * timer effect in `app/interview/page.tsx`.
 */
export function useInterviewTimer(isActive: boolean): UseInterviewTimerReturn {
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(computeElapsedSeconds(startTime, Date.now()))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isActive, startTime])

  return { startTime, setStartTime, elapsedTime, setElapsedTime }
}
