/**
 * Enhanced Research Data Hook
 *
 * Provides access to production-grade statistical analysis for the admin dashboard
 */

import { useState, useEffect, useCallback } from "react"
import type { User } from "firebase/auth"
import type { EnhancedResearchAnalysis } from "@/lib/research/analyzer"

interface UseEnhancedResearchResult {
  data: EnhancedResearchAnalysis | null
  loading: boolean
  refreshing: boolean
  error: string | null
  loadData: (forceRefresh?: boolean) => Promise<void>
  exportData: (
    format: "csv" | "json",
    type: "events" | "summary" | "comparison",
    range?: string
  ) => Promise<void>
}

export function useEnhancedResearch(firebaseUser: User | null): UseEnhancedResearchResult {
  const [data, setData] = useState<EnhancedResearchAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!firebaseUser) {
        setLoading(false)
        return
      }

      try {
        if (forceRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }
        setError(null)

        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/admin/research/enhanced", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Failed to load research data")
        }

        setData(result.data)
      } catch (err) {
        console.error("Error loading enhanced research data:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser]
  )

  const exportData = useCallback(
    async (format: "csv" | "json", type: "events" | "summary" | "comparison", range = "30d") => {
      if (!firebaseUser) return

      try {
        const token = await firebaseUser.getIdToken()
        const params = new URLSearchParams({ format, type, range })
        const response = await fetch(`/api/admin/research/export?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Export failed")
        }

        // Get filename from Content-Disposition header or generate one
        const contentDisposition = response.headers.get("Content-Disposition")
        let filename = `research-${type}-${new Date().toISOString().split("T")[0]}.${format}`
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="(.+)"/)
          if (match) filename = match[1]
        }

        // Download the file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } catch (err) {
        console.error("Error exporting research data:", err)
        setError(err instanceof Error ? err.message : "Export failed")
      }
    },
    [firebaseUser]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    loading,
    refreshing,
    error,
    loadData,
    exportData,
  }
}
