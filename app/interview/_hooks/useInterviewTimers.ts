/**
 * useInterviewTimers Hook
 *
 * Handles elapsed time tracking and proactive interviewer triggers.
 * ~120 lines - focused on timing only.
 */

import { useEffect, useRef, useCallback } from "react"

interface UseInterviewTimersProps {
  // State
  isInterviewStarted: boolean
  showPostInterviewDiscussion: boolean
  showFeedback: boolean
  startTime: number | null
  // Setters
  setStartTime: (time: number | null) => void
  setElapsedTime: (time: number) => void
  // Callbacks
  triggerProactiveInterviewer: () => Promise<void>
}

export function useInterviewTimers(props: UseInterviewTimersProps) {
  const lastCodeChangeRef = useRef<number>(Date.now())
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredInactivityRef = useRef(false)

  // Start timer when interview begins
  useEffect(() => {
    if (props.isInterviewStarted && !props.startTime) {
      props.setStartTime(Date.now())
    }
  }, [props.isInterviewStarted, props.startTime])

  // Update elapsed time every second
  useEffect(() => {
    if (!props.startTime || props.showFeedback) return

    const interval = setInterval(() => {
      props.setElapsedTime(Math.floor((Date.now() - props.startTime!) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [props.startTime, props.showFeedback])

  // Track code changes for inactivity detection
  const onCodeChange = useCallback(() => {
    lastCodeChangeRef.current = Date.now()
    hasTriggeredInactivityRef.current = false
  }, [])

  // Setup inactivity timer for proactive interviewer
  useEffect(() => {
    if (!props.isInterviewStarted || props.showPostInterviewDiscussion || props.showFeedback) {
      return
    }

    const checkInactivity = () => {
      const timeSinceLastChange = Date.now() - lastCodeChangeRef.current
      const INACTIVITY_THRESHOLD = 90000 // 90 seconds

      if (timeSinceLastChange >= INACTIVITY_THRESHOLD && !hasTriggeredInactivityRef.current) {
        hasTriggeredInactivityRef.current = true
        props.triggerProactiveInterviewer()
      }
    }

    inactivityTimerRef.current = setInterval(checkInactivity, 30000) // Check every 30s

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current)
      }
    }
  }, [props.isInterviewStarted, props.showPostInterviewDiscussion, props.showFeedback])

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  return {
    onCodeChange,
    formatTime,
  }
}

export type UseInterviewTimersReturn = ReturnType<typeof useInterviewTimers>
