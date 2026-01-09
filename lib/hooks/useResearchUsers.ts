/**
 * Hook for fetching users with algorithm analytics for the research dashboard
 */

import { useState, useEffect, useCallback } from "react"
import type { User } from "firebase/auth"

export interface UserAlgorithmData {
  id: string
  email: string
  fullName: string | null
  algorithm: "sm2" | "fsrs"
  algorithmAssignedAt: string | null
  algorithmOverridden: boolean
  subscriptionTier: string
  createdAt: string
  lastActive: string | null
  totalReviews: number
  totalProblems: number
  problemsMastered: number
  averageScore: number
  retentionRate: number
  averageDailyReviews: number
  streakDays: number
  totalPracticeMinutes: number
  patternBreakdown: Record<string, { count: number; avgScore: number; mastered: number }>
}

export interface AggregateStats {
  sm2: {
    totalUsers: number
    avgScore: number
    avgRetention: number
    totalReviews: number
    totalMastered: number
  }
  fsrs: {
    totalUsers: number
    avgScore: number
    avgRetention: number
    totalReviews: number
    totalMastered: number
  }
}

export interface PatternStats {
  [pattern: string]: {
    sm2: { users: number; totalProblems: number; mastered: number; avgScore: number }
    fsrs: { users: number; totalProblems: number; mastered: number; avgScore: number }
  }
}

interface ResearchUsersData {
  users: UserAlgorithmData[]
  pagination: {
    page: number
    limit: number
    totalUsers: number
    totalPages: number
  }
  aggregateStats: AggregateStats
  patternStats: PatternStats
}

interface UseResearchUsersParams {
  algorithm?: "sm2" | "fsrs" | "all"
  page?: number
  limit?: number
  search?: string
  sortBy?: "retention" | "score" | "reviews" | "created"
  sortOrder?: "asc" | "desc"
}

interface UseResearchUsersResult {
  data: ResearchUsersData | null
  loading: boolean
  error: string | null
  loadData: () => Promise<void>
  setParams: (params: UseResearchUsersParams) => void
  params: UseResearchUsersParams
}

export function useResearchUsers(
  firebaseUser: User | null,
  initialParams: UseResearchUsersParams = {}
): UseResearchUsersResult {
  const [data, setData] = useState<ResearchUsersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useState<UseResearchUsersParams>({
    algorithm: "all",
    page: 1,
    limit: 25,
    sortBy: "created",
    sortOrder: "desc",
    ...initialParams,
  })

  const loadData = useCallback(async () => {
    if (!firebaseUser) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const queryParams = new URLSearchParams()

      if (params.algorithm) queryParams.append("algorithm", params.algorithm)
      if (params.page) queryParams.append("page", params.page.toString())
      if (params.limit) queryParams.append("limit", params.limit.toString())
      if (params.search) queryParams.append("search", params.search)
      if (params.sortBy) queryParams.append("sortBy", params.sortBy)
      if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder)

      const response = await fetch(`/api/admin/research/users?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to load research users")
      }

      setData(result.data)
    } catch (err) {
      console.error("Error loading research users:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, params])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateParams = useCallback((newParams: UseResearchUsersParams) => {
    setParams((prev) => ({ ...prev, ...newParams }))
  }, [])

  return {
    data,
    loading,
    error,
    loadData,
    setParams: updateParams,
    params,
  }
}
