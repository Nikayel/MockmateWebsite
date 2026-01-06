import { useState, useEffect, useCallback } from "react"
import { User } from "firebase/auth"
import { executeAdminAction } from "@/lib/admin"

interface AlgorithmDistribution {
  sm2: { total: number; active_7d: number; overridden: number }
  fsrs: { total: number; active_7d: number; overridden: number }
}

interface CohortStats {
  algorithm: string
  total_users: number
  active_users_7d: number
  active_users_30d: number
  users_with_overrides: number
  average_retention_rate: number
  median_retention_rate: number
  average_score: number
  median_score: number
  total_problems_mastered: number
  average_problems_mastered_per_user: number
  average_time_to_mastery_days: number
  average_streak_days: number
  average_daily_reviews: number
  average_session_length_minutes: number
  churn_rate_7d: number
  churn_rate_30d: number
  score_distribution: {
    '0-20': number
    '21-40': number
    '41-60': number
    '61-80': number
    '81-100': number
  }
  average_lapse_rate: number
  users_with_zero_lapses: number
  average_interval_days: number
  interval_accuracy: number
  weekly_trends: Array<{
    week: string
    active_users: number
    average_score: number
    retention_rate: number
    problems_mastered: number
  }>
}

interface Comparison {
  retention_rate_difference: number
  average_score_difference: number
  time_to_mastery_difference_days: number
  engagement_difference: number
  interval_efficiency_difference: number
  sufficient_sample_size: boolean
  overall_winner: string | null
  confidence_level: number | null
  fsrs_wins_count: number
  sm2_wins_count: number
}

interface ResearchData {
  distribution: AlgorithmDistribution
  comparison: {
    sm2: CohortStats
    fsrs: CohortStats
    comparison: Comparison
    last_updated: string
  } | null
  recentEvents: Array<{
    id: string
    algorithm: string
    score: number
    quality_rating: number
    pattern: string
    difficulty: string
    actual_retention: boolean
    retention_as_predicted: boolean
    interval_days: number
    timestamp: string
  }>
  insights: {
    summary: string
    keyFindings: string[]
    recommendations: string[]
  }
  lastUpdated: string
}

interface UseResearchDataReturn {
  data: ResearchData | null
  loading: boolean
  refreshing: boolean
  error: string | null
  loadData: (forceRefresh?: boolean) => Promise<void>
  migrateUsers: () => Promise<void>
  backfillData: () => Promise<void>
  migrating: boolean
  backfilling: boolean
}

export function useResearchData(firebaseUser: User | null): UseResearchDataReturn {
  const [data, setData] = useState<ResearchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!firebaseUser) return

    if (forceRefresh) setRefreshing(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const url = `/api/admin/algorithm-research${forceRefresh ? '?refresh=true' : ''}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to load research data')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firebaseUser])

  const migrateUsers = async () => {
    if (!firebaseUser) return

    setMigrating(true)
    try {
      const result = await executeAdminAction(
        firebaseUser,
        '/api/admin/algorithm-research',
        { action: 'migrate' }
      )

      if (result.success) {
        alert(result.message || 'Migration completed successfully')
        await loadData(true)
      } else {
        throw new Error(result.error || 'Migration failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed')
    } finally {
      setMigrating(false)
    }
  }

  const backfillData = async () => {
    if (!firebaseUser) return

    setBackfilling(true)
    try {
      const result = await executeAdminAction(
        firebaseUser,
        '/api/admin/algorithm-research',
        { action: 'backfill-research' }
      )

      if (result.success) {
        alert(result.message || 'Backfill completed successfully')
        await loadData(true)
      } else {
        throw new Error(result.error || 'Backfill failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setBackfilling(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    loading,
    refreshing,
    error,
    loadData,
    migrateUsers,
    backfillData,
    migrating,
    backfilling,
  }
}
