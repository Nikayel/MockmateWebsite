'use client'

/**
 * React hooks for fetching skill insights and smart recommendations
 * from the RAG v2 API.
 */

import { useState, useEffect, useCallback } from 'react'
import type { DSAPattern } from '@/lib/types/dsa-patterns'
import type { CompanyId } from '@/lib/data/company-questions/types'

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

export interface SmartRecommendation {
  id: string
  problemId: string
  title: string
  pattern: DSAPattern
  difficulty: 'easy' | 'medium' | 'hard'
  symbol: {
    icon: string
    label: string
    color: string
    priority: number
  }
  tags: Array<{
    text: string
    color: string
    icon?: string
  }>
  explanation: {
    headline: string
    reasoning: string[]
    evidence: Array<{
      type: string
      icon: string
      text: string
      value?: string | number
    }>
    confidence: number
    alternativeAction?: string
  }
  score: number
  userReadiness: number
  interviewRelevance: number
  estimatedMinutes: number
  prerequisitesMet: boolean
}

export interface SessionInsight {
  icon: string
  title: string
  description: string
  actionable: boolean
  action?: string
}

export interface UserSummary {
  level: 'beginner' | 'intermediate' | 'advanced'
  interviewReadiness: number
  strengths: Array<{ pattern: DSAPattern; score: number }>
  focusAreas: Array<{ pattern: DSAPattern; reason: string }>
  streak: number
  trend: 'improving' | 'stable' | 'declining'
}

export interface SmartRecommendationsResponse {
  recommendations: SmartRecommendation[]
  sessionInsights: SessionInsight[]
  userSummary: UserSummary
  meta: {
    generatedAt: string
    personalizationLevel: string
    confidenceLevel: string
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
      const response = await fetch('/api/rag/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-skill-insights' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch skill insights')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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
 * Hook for fetching smart recommendations
 */
export function useSmartRecommendations(options: {
  targetCompany?: CompanyId
  availableMinutes?: number
  sessionGoal?: 'warmup' | 'practice' | 'challenge' | 'review' | 'interview-prep'
  problems: Array<{
    id: string
    title: string
    pattern: DSAPattern
    difficulty: 'easy' | 'medium' | 'hard'
    company?: CompanyId
    frequency?: number
  }>
  excludeIds?: string[]
  limit?: number
}) {
  const [data, setData] = useState<SmartRecommendationsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(async () => {
    if (!options.problems || options.problems.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/rag/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-smart-recommendations',
          targetCompany: options.targetCompany,
          availableMinutes: options.availableMinutes,
          sessionGoal: options.sessionGoal,
          problems: options.problems,
          excludeIds: options.excludeIds,
          limit: options.limit,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch recommendations')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [
    options.targetCompany,
    options.availableMinutes,
    options.sessionGoal,
    options.problems,
    options.excludeIds,
    options.limit,
  ])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  return {
    recommendations: data?.recommendations || [],
    sessionInsights: data?.sessionInsights || [],
    userSummary: data?.userSummary,
    meta: data?.meta,
    isLoading,
    error,
    refetch: fetchRecommendations,
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
      const response = await fetch('/api/rag/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-enhanced-profile' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch profile')
      }

      const result = await response.json()
      setProfile(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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

  const analyzeCode = useCallback(async (
    code: string,
    pattern: DSAPattern,
    testResults?: { passed: number; total: number; failingTests?: string[] }
  ) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/rag/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze-code',
          code,
          pattern,
          testResults,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze code')
      }

      const result = await response.json()
      setLastAnalysis(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  return {
    analyzeCode,
    isAnalyzing,
    lastAnalysis,
    error,
  }
}
