/**
 * Hook for the open learner model's admin/research aggregates.
 *
 * Mirrors useResearchUsers: Bearer token from the Firebase user, load on mount,
 * manual refresh, error surfaced as a string for the dashboard to render.
 */

import { useState, useEffect, useCallback } from "react"
import type { User } from "firebase/auth"
import type { LearnerModelAdminStats } from "@/lib/learner-model/admin-stats"

interface UseLearnerModelStatsResult {
  data: LearnerModelAdminStats | null
  loading: boolean
  error: string | null
  loadData: () => Promise<void>
}

export function useLearnerModelStats(firebaseUser: User | null): UseLearnerModelStatsResult {
  const [data, setData] = useState<LearnerModelAdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!firebaseUser) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/learner-model", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to load learner model stats")
      }

      setData(result.data as LearnerModelAdminStats)
    } catch (err) {
      console.error("Error loading learner model stats:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [firebaseUser])

  useEffect(() => {
    loadData()
  }, [loadData])

  return { data, loading, error, loadData }
}
