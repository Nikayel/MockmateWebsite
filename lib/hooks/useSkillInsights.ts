"use client"

/**
 * React hooks for fetching skill insights
 * from the RAG v2 API.
 */

import { useState, useEffect, useCallback } from "react"
import type { DSAPattern } from "@/lib/types/dsa-patterns"

// ============================================================================
// TYPES
// ============================================================================

export interface SkillInsightsData {
  overview: {
    interviewReadiness: number
    totalConcepts: number
    masteredConcepts: number
    learningConcepts: number
    needsWorkConcepts: number
  }
  cognitive: {
    learningStyle: {
      primary: string
      secondary: string | null
      confidence: number
    }
    problemSolvingApproach: string
    patternRecognitionSpeed: string
    complexityTolerance: string
  }
  behavioral: {
    motivationType: string
    consistency: number
    averageSessionMinutes: number
    sessionsPerWeek: string
    fatigueLevel: string
    recommendedBreak: boolean
  }
  patternMastery: Array<{
    pattern: DSAPattern
    mastery: number
    practiceCount: number
  }>
  skillDecay: Array<{
    pattern: DSAPattern
    daysSincePractice: number
    decayPercent: number
    urgency: string
  }>
  misconceptions: Array<{
    id: string
    pattern: DSAPattern
    type: string
    description: string
    frequency: number
    suggestedFix: string
  }>
  gaps: Array<{
    pattern: DSAPattern
    missingPrereqs: string[]
    impact: string
  }>
  growth: {
    velocity: number
    accelerating: boolean
    projectedLevel: string
    projectedDaysToGoal: number | null
  }
  retention: {
    shortTermRetention: number
    mediumTermRetention: number
    longTermRetention: number
  }
  insights: Array<{
    id: string
    type: string
    icon: string
    title: string
    description: string
    action?: string
    priority: string
  }>
  interviewReadiness: {
    overall: number
    strongestAreas: DSAPattern[]
    criticalGaps: string[]
    estimatedPrepDays: number
  }
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for fetching skill insights dashboard data
 */
export function useSkillInsights() {
  const [data, setData] = useState<SkillInsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/rag/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-skill-insights" }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch skill insights")
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  return {
    data,
    isLoading,
    error,
    refetch: fetchInsights,
  }
}

/**
 * Hook for fetching enhanced user profile
 */
export function useEnhancedProfile() {
  const [profile, setProfile] = useState<{
    profile: unknown
    summary: {
      level: string
      interviewReadiness: number
      topStrengths: DSAPattern[]
      criticalGaps: string[]
      activeInsights: number
      learningStyle: string
      trend: string
    }
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/rag/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-enhanced-profile" }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch profile")
      }

      const result = await response.json()
      setProfile(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
  }
}

/**
 * Hook for analyzing code for misconceptions
 */
export function useCodeAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastAnalysis, setLastAnalysis] = useState<{
    analysis: {
      misconceptions: Array<{
        id: string
        pattern: DSAPattern
        concept: string
        misconceptionType: string
        description: string
        suggestedFix: string
      }>
      codeQualityIssues: Array<{
        type: string
        severity: string
        description: string
        suggestion: string
      }>
      patternMisuse: Array<{
        expectedPattern: DSAPattern
        actualApproach: string
        impact: string
        explanation: string
      }>
      overallConfidence: number
    }
    tracked: number
    resolved: number
    summary: {
      hasMisconceptions: boolean
      hasQualityIssues: boolean
      hasPatternMisuse: boolean
      overallConfidence: number
    }
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyzeCode = useCallback(
    async (
      code: string,
      pattern: DSAPattern,
      testResults?: { passed: number; total: number; failingTests?: string[] }
    ) => {
      setIsAnalyzing(true)
      setError(null)

      try {
        const response = await fetch("/api/rag/v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "analyze-code",
            code,
            pattern,
            testResults,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to analyze code")
        }

        const result = await response.json()
        setLastAnalysis(result)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        setError(message)
        return null
      } finally {
        setIsAnalyzing(false)
      }
    },
    []
  )

  return {
    analyzeCode,
    isAnalyzing,
    lastAnalysis,
    error,
  }
}
