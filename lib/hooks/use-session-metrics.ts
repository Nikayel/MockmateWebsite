/**
 * Frontend hook for session metrics tracking
 *
 * Provides easy-to-use functions for tracking session events
 * from React components during interview sessions.
 */

import { useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { logger } from '@/lib/logger'

interface SessionMetricsConfig {
  sessionId: string
  scenarioId: string
  scenarioTitle: string
  pattern: string
  difficulty: 'easy' | 'medium' | 'hard'
  scenarioType?: 'dsa' | 'bugfix' | 'system-design'
  hintsTotal?: number
}

interface UseSessionMetricsReturn {
  startTracking: (config: SessionMetricsConfig) => Promise<void>
  trackChatMessage: (type: 'user' | 'ai', message: string, chatType: 'partner' | 'interviewer') => void
  trackHintReveal: (hintIndex: number) => void
  trackCodeExecution: (passed: number, total: number, hasErrors?: boolean, executionTimeMs?: number) => void
  trackFileView: (fileName: string) => void
  trackOptimizationAttempt: () => void
  trackAISuggestionApplied: (wasUnderstood: boolean) => void
  completeSession: (data: {
    finalCode: string
    language: string
    testsPassed: number
    testsTotal: number
    efficiencyScore: number
    communicationScore?: number
    thoughtProcessShared?: number
  }) => Promise<{ performanceScore: number; scoreBreakdown: any; feedback: any } | null>
  isTracking: boolean
}

export function useSessionMetrics(): UseSessionMetricsReturn {
  const { firebaseUser } = useAuth()
  const sessionIdRef = useRef<string | null>(null)
  const isTrackingRef = useRef(false)

  // Helper to make API calls
  const trackEvent = useCallback(async (event: string, data?: any) => {
    if (!firebaseUser || !sessionIdRef.current) return

    try {
      const token = await firebaseUser.getIdToken()
      await fetch('/api/session/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event,
          sessionId: sessionIdRef.current,
          data,
        }),
      })
    } catch (error) {
      // Log error with proper context
      logger.error('[Session Metrics] Tracking error', { error, sessionId, eventType })
    }
  }, [firebaseUser])

  const startTracking = useCallback(async (config: SessionMetricsConfig) => {
    if (!firebaseUser) return

    sessionIdRef.current = config.sessionId
    isTrackingRef.current = true

    try {
      const token = await firebaseUser.getIdToken()
      await fetch('/api/session/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event: 'session_start',
          sessionId: config.sessionId,
          data: {
            scenarioId: config.scenarioId,
            scenarioTitle: config.scenarioTitle,
            pattern: config.pattern,
            difficulty: config.difficulty,
            scenarioType: config.scenarioType || 'dsa',
            hintsTotal: config.hintsTotal || 3,
          },
        }),
      })
    } catch (error) {
      logger.error('[Session Metrics] Failed to start tracking', { error, sessionId: config.sessionId })
    }
  }, [firebaseUser])

  const trackChatMessage = useCallback((
    type: 'user' | 'ai',
    message: string,
    chatType: 'partner' | 'interviewer'
  ) => {
    // Fire and forget - don't await
    trackEvent('chat_message', { type, message, chatType })
  }, [trackEvent])

  const trackHintReveal = useCallback((hintIndex: number) => {
    trackEvent('hint_reveal', { hintIndex })
  }, [trackEvent])

  const trackCodeExecution = useCallback((
    passed: number,
    total: number,
    hasErrors = false,
    executionTimeMs = 0
  ) => {
    trackEvent('code_execution', { passed, total, hasErrors, executionTimeMs })
  }, [trackEvent])

  const trackFileView = useCallback((fileName: string) => {
    trackEvent('file_view', { fileName })
  }, [trackEvent])

  const trackOptimizationAttempt = useCallback(() => {
    trackEvent('optimization_attempt')
  }, [trackEvent])

  const trackAISuggestionApplied = useCallback((wasUnderstood: boolean) => {
    trackEvent('ai_suggestion_applied', { wasUnderstood })
  }, [trackEvent])

  const completeSession = useCallback(async (data: {
    finalCode: string
    language: string
    testsPassed: number
    testsTotal: number
    efficiencyScore: number
    communicationScore?: number
    thoughtProcessShared?: number
  }) => {
    if (!firebaseUser || !sessionIdRef.current) return null

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch('/api/session/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event: 'session_complete',
          sessionId: sessionIdRef.current,
          data,
        }),
      })

      const result = await response.json()

      if (result.success) {
        isTrackingRef.current = false
        sessionIdRef.current = null
        return result.summary
      }

      return null
    } catch (error) {
      logger.error('[Session Metrics] Failed to complete session', { error, sessionId: sessionRef.current?.sessionId })
      return null
    }
  }, [firebaseUser])

  return {
    startTracking,
    trackChatMessage,
    trackHintReveal,
    trackCodeExecution,
    trackFileView,
    trackOptimizationAttempt,
    trackAISuggestionApplied,
    completeSession,
    isTracking: isTrackingRef.current,
  }
}

export default useSessionMetrics
