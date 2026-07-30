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
    "0-20": number
    "21-40": number
    "41-60": number
    "61-80": number
    "81-100": number
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

export interface MigrateFsrsResult {
  usersScanned: number
  usersFlippedToFsrs: number
  usersAlreadyFsrs: number
  usersOverriddenSkipped: number
  cardsConverted: number
  cardsSkipped: number
  errors: Array<{ userId: string; message: string }>
  nextCursor: string | null
  dryRun: boolean
}

export interface AbStatus {
  ab_ended: boolean
  default_algorithm: "sm2" | "fsrs"
  ended_at?: string
  ended_by?: string
}

interface ResearchData {
  abStatus?: AbStatus
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
  runAbDryRun: () => Promise<void>
  confirmEndAbTest: () => Promise<void>
  clearAbDryRun: () => void
  endingAb: boolean
  abDryRunResult: MigrateFsrsResult | null
  abFinalResult: MigrateFsrsResult | null
}

/** Sum the counts of a multi-page sweep into one result. */
function aggregateSweepResults(pages: MigrateFsrsResult[]): MigrateFsrsResult {
  return pages.reduce(
    (acc, page) => ({
      usersScanned: acc.usersScanned + page.usersScanned,
      usersFlippedToFsrs: acc.usersFlippedToFsrs + page.usersFlippedToFsrs,
      usersAlreadyFsrs: acc.usersAlreadyFsrs + page.usersAlreadyFsrs,
      usersOverriddenSkipped: acc.usersOverriddenSkipped + page.usersOverriddenSkipped,
      cardsConverted: acc.cardsConverted + page.cardsConverted,
      cardsSkipped: acc.cardsSkipped + page.cardsSkipped,
      errors: [...acc.errors, ...page.errors],
      nextCursor: page.nextCursor,
      dryRun: page.dryRun,
    }),
    {
      usersScanned: 0,
      usersFlippedToFsrs: 0,
      usersAlreadyFsrs: 0,
      usersOverriddenSkipped: 0,
      cardsConverted: 0,
      cardsSkipped: 0,
      errors: [],
      nextCursor: null,
      dryRun: false,
    } as MigrateFsrsResult
  )
}

/** Safety valve: 200 pages x 100 users = 20k users per click. */
const MAX_SWEEP_PAGES = 200

export function useResearchData(firebaseUser: User | null): UseResearchDataReturn {
  const [data, setData] = useState<ResearchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [endingAb, setEndingAb] = useState(false)
  const [abDryRunResult, setAbDryRunResult] = useState<MigrateFsrsResult | null>(null)
  const [abFinalResult, setAbFinalResult] = useState<MigrateFsrsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!firebaseUser) return

      if (forceRefresh) setRefreshing(true)
      setError(null)

      try {
        const token = await firebaseUser.getIdToken()
        const url = `/api/admin/algorithm-research${forceRefresh ? "?refresh=true" : ""}`
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || "Failed to load research data")
        }

        const result = await response.json()
        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser]
  )

  const migrateUsers = async () => {
    if (!firebaseUser) return

    setMigrating(true)
    try {
      const result = await executeAdminAction(firebaseUser, "/api/admin/algorithm-research", {
        action: "migrate",
      })

      if (result.success) {
        alert(result.message || "Migration completed successfully")
        await loadData(true)
      } else {
        throw new Error(result.error || "Migration failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Migration failed")
    } finally {
      setMigrating(false)
    }
  }

  const backfillData = async () => {
    if (!firebaseUser) return

    setBackfilling(true)
    try {
      const result = await executeAdminAction(firebaseUser, "/api/admin/algorithm-research", {
        action: "backfill-research",
      })

      if (result.success) {
        alert(result.message || "Backfill completed successfully")
        await loadData(true)
      } else {
        throw new Error(result.error || "Backfill failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backfill failed")
    } finally {
      setBackfilling(false)
    }
  }

  /**
   * Drive the paged end-ab-switch-fsrs sweep to completion, following
   * nextCursor until the server reports the collection exhausted.
   */
  const runSweep = async (dryRun: boolean): Promise<MigrateFsrsResult> => {
    if (!firebaseUser) throw new Error("Not signed in")

    const pages: MigrateFsrsResult[] = []
    let cursor: string | undefined
    for (let i = 0; i < MAX_SWEEP_PAGES; i++) {
      const result = await executeAdminAction(firebaseUser, "/api/admin/algorithm-research", {
        action: "end-ab-switch-fsrs",
        dryRun,
        ...(cursor ? { cursor } : {}),
      })
      if (!result.success) {
        throw new Error(result.error || "A/B sweep failed")
      }
      const page = result.data as MigrateFsrsResult
      pages.push(page)
      if (!page.nextCursor) break
      cursor = page.nextCursor
    }
    return aggregateSweepResults(pages)
  }

  const runAbDryRun = async () => {
    setEndingAb(true)
    setError(null)
    try {
      setAbDryRunResult(await runSweep(true))
    } catch (err) {
      setError(err instanceof Error ? err.message : "A/B dry run failed")
    } finally {
      setEndingAb(false)
    }
  }

  const confirmEndAbTest = async () => {
    setEndingAb(true)
    setError(null)
    try {
      const result = await runSweep(false)
      setAbFinalResult(result)
      setAbDryRunResult(null)
      await loadData(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ending the A/B failed")
    } finally {
      setEndingAb(false)
    }
  }

  const clearAbDryRun = () => setAbDryRunResult(null)

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
    runAbDryRun,
    confirmEndAbTest,
    clearAbDryRun,
    endingAb,
    abDryRunResult,
    abFinalResult,
  }
}
