"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type {
  GeneratedHint,
  HintLevel,
  StruggleMetrics,
  HintTrigger,
} from "@/lib/agents/hint-agent"
import type {
  GenerateHintsPayload,
  GetNextHintPayload,
  GenerateHintsApiResponse,
  GetNextHintApiResponse,
} from "@/lib/agents/hints/contracts"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { logger } from "@/lib/logger"

/**
 * useHintAgent Hook
 *
 * Client-side hook for interacting with the hint agent API.
 * Manages hint state, loading, and progressive reveal.
 *
 * Features:
 * - Automatic hint generation on problem load
 * - Struggle tracking for adaptive hints
 * - Progressive unlock based on time
 * - Optimistic UI updates
 */

interface UseHintAgentOptions {
  userId: string
  problemId: string
  problemTitle: string
  problemText: string
  problemPattern?: DSAPattern
  difficulty: "easy" | "medium" | "hard"
  staticHints?: string[]
  autoGenerate?: boolean
  getAuthToken?: () => Promise<string | null>
}

interface UseHintAgentReturn {
  // State
  hints: GeneratedHint[]
  staticHints: string[]
  isLoading: boolean
  error: string | null
  struggleLevel: "none" | "mild" | "moderate" | "high"
  recommendedLevel: HintLevel
  isPersonalized: boolean
  revealedHintIds: Set<string>
  elapsedMinutes: number

  // Actions
  generateHints: () => Promise<void>
  regenerateHints: (trigger: HintTrigger) => Promise<void>
  revealHint: (hintId: string) => void
  getNextHint: () => Promise<GeneratedHint | null>
  updateStruggleMetrics: (metrics: Partial<StruggleMetrics>) => void
  updateCode: (code: string) => void
  updateTestResults: (results: { passed: number; total: number; failingTests?: string[] }) => void
  resetHints: () => void
}

export function useHintAgent(options: UseHintAgentOptions): UseHintAgentReturn {
  const {
    userId,
    problemId,
    problemTitle,
    problemText,
    problemPattern,
    difficulty,
    staticHints = [],
    autoGenerate = true,
    getAuthToken,
  } = options

  // State
  const [hints, setHints] = useState<GeneratedHint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [struggleLevel, setStruggleLevel] = useState<"none" | "mild" | "moderate" | "high">("none")
  const [recommendedLevel, setRecommendedLevel] = useState<HintLevel>(1)
  const [isPersonalized, setIsPersonalized] = useState(false)
  const [revealedHintIds, setRevealedHintIds] = useState<Set<string>>(new Set())
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [lastTrigger, setLastTrigger] = useState<HintTrigger>("initial")

  // Refs for tracking
  const struggleMetricsRef = useRef<StruggleMetrics>({
    timeSpentMinutes: 0,
    codeChanges: 0,
    testsRun: 0,
    testsFailed: 0,
    hintsRevealed: 0,
    lastCodeChangeMinutesAgo: 0,
    errorCount: 0,
  })

  const userCodeRef = useRef<string>("")
  const testResultsRef = useRef<
    { passed: number; total: number; failingTests?: string[] } | undefined
  >(undefined)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const buildHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = getAuthToken ? await getAuthToken() : null
    return token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" }
  }, [getAuthToken])

  const buildBasePayload = useCallback(
    () => ({
      userId,
      problemId,
      problemTitle,
      problemText,
      problemPattern,
      difficulty,
      userCode: userCodeRef.current,
      language: "javascript",
      struggleMetrics: struggleMetricsRef.current,
      testResults: testResultsRef.current,
    }),
    [userId, problemId, problemTitle, problemText, problemPattern, difficulty]
  )

  // Timer for elapsed time
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedMinutes((prev) => {
        const newMinutes = prev + 1 / 60 // Update every second
        struggleMetricsRef.current.timeSpentMinutes = Math.floor(newMinutes)
        struggleMetricsRef.current.lastCodeChangeMinutesAgo += 1 / 60
        return newMinutes
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Generate hints from API (internal, uses lastTrigger state)
  const generateHintsInternal = useCallback(
    async (trigger: HintTrigger = "initial") => {
      setIsLoading(true)
      setError(null)

      try {
        const payload: GenerateHintsPayload = {
          action: "generate",
          ...buildBasePayload(),
          existingHints: staticHints,
          trigger,
        }

        const headers = await buildHeaders()
        const response = await fetch("/api/agents/hints", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error("Failed to generate hints")
        }

        const data = (await response.json()) as GenerateHintsApiResponse

        setHints(data.hints || [])
        setStruggleLevel(data.struggleLevel || "none")
        setRecommendedLevel(data.recommendedRevealLevel || 1)
        setIsPersonalized(data.personalizationApplied || false)
      } catch (err) {
        logger.error("[useHintAgent] Generate error", { error: err, problemId, userId, trigger })
        setError(err instanceof Error ? err.message : "Failed to generate hints")
      } finally {
        setIsLoading(false)
      }
    },
    [buildBasePayload, buildHeaders, staticHints]
  )

  // Generate hints (for backwards compatibility, uses 'initial' trigger)
  const generateHints = useCallback(async () => {
    await generateHintsInternal("initial")
  }, [generateHintsInternal])

  // Regenerate hints with a specific trigger (event-driven)
  const regenerateHints = useCallback(
    async (trigger: HintTrigger) => {
      // Skip initial regeneration if no code written yet
      if (
        trigger === "initial" &&
        (!userCodeRef.current || userCodeRef.current.trim().length < 20)
      ) {
        return
      }

      setLastTrigger(trigger)
      await generateHintsInternal(trigger)
    },
    [generateHintsInternal]
  )

  // NOTE: We no longer auto-generate hints on mount.
  // Hints should be generated when user:
  // 1. Clicks "Get Hint" button
  // 2. Runs tests (test_failed/test_passed trigger)
  // 3. Is detected as stuck (stuck trigger)
  // 4. Makes significant code changes (code_change trigger)
  // This prevents showing hints before user has even read the problem.

  // Reveal a hint
  const revealHint = useCallback((hintId: string) => {
    setRevealedHintIds((prev) => {
      const newSet = new Set(prev)
      newSet.add(hintId)
      struggleMetricsRef.current.hintsRevealed = newSet.size
      return newSet
    })
  }, [])

  // Get the next unrevealed hint
  const getNextHint = useCallback(async (): Promise<GeneratedHint | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const payload: GetNextHintPayload = {
        action: "get-next",
        ...buildBasePayload(),
        previousHintIds: Array.from(revealedHintIds),
      }

      const headers = await buildHeaders()
      const response = await fetch("/api/agents/hints", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to get next hint")
      }

      const data = (await response.json()) as GetNextHintApiResponse

      if (data.hint) {
        const nextHint = data.hint
        // Add the new hint to the list
        setHints((prev) => {
          const exists = prev.some((h) => h.id === nextHint.id)
          if (exists) return prev
          return [...prev, nextHint]
        })
        return nextHint
      }

      return null
    } catch (err) {
      logger.error("[useHintAgent] Get next error", {
        error: err,
        problemId,
        userId,
        recommendedLevel,
      })
      setError(err instanceof Error ? err.message : "Failed to get next hint")
      return null
    } finally {
      setIsLoading(false)
    }
  }, [buildBasePayload, buildHeaders, revealedHintIds, problemId, recommendedLevel, userId])

  // Update struggle metrics
  const updateStruggleMetrics = useCallback((metrics: Partial<StruggleMetrics>) => {
    if (metrics.codeChanges !== undefined) {
      struggleMetricsRef.current.codeChanges = metrics.codeChanges
      struggleMetricsRef.current.lastCodeChangeMinutesAgo = 0
    }
    if (metrics.testsRun !== undefined) {
      struggleMetricsRef.current.testsRun = metrics.testsRun
    }
    if (metrics.testsFailed !== undefined) {
      struggleMetricsRef.current.testsFailed = metrics.testsFailed
    }
    if (metrics.errorCount !== undefined) {
      struggleMetricsRef.current.errorCount = metrics.errorCount
    }
  }, [])

  const updateCode = useCallback((code: string) => {
    userCodeRef.current = code
    struggleMetricsRef.current.codeChanges++
    struggleMetricsRef.current.lastCodeChangeMinutesAgo = 0
  }, [])

  const updateTestResults = useCallback(
    (results: { passed: number; total: number; failingTests?: string[] }) => {
      testResultsRef.current = results
      struggleMetricsRef.current.testsRun++
      if (results.passed < results.total) {
        struggleMetricsRef.current.testsFailed++
      }
    },
    []
  )

  // Reset hints
  const resetHints = useCallback(() => {
    setHints([])
    setRevealedHintIds(new Set())
    setStruggleLevel("none")
    setRecommendedLevel(1)
    setIsPersonalized(false)
    setError(null)
    setElapsedMinutes(0)
    struggleMetricsRef.current = {
      timeSpentMinutes: 0,
      codeChanges: 0,
      testsRun: 0,
      testsFailed: 0,
      hintsRevealed: 0,
      lastCodeChangeMinutesAgo: 0,
      errorCount: 0,
    }
  }, [])

  return {
    hints,
    staticHints,
    isLoading,
    error,
    struggleLevel,
    recommendedLevel,
    isPersonalized,
    revealedHintIds,
    elapsedMinutes,
    generateHints,
    regenerateHints,
    revealHint,
    getNextHint,
    updateStruggleMetrics,
    updateCode,
    updateTestResults,
    resetHints,
  }
}

export default useHintAgent
