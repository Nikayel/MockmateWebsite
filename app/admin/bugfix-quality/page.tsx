"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ClipboardCheck, RefreshCw, XCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminLayout, DataTable, type Column } from "@/components/admin/shared"

interface BugfixScenarioAuditRow {
  scenarioId: string
  title: string
  complete: boolean
  issueCount: number
  issues: string[]
  tags: string[]
}

interface BugfixQualityStats {
  total: number
  passing: number
  failing: number
  totalIssues: number
  seedSet: boolean
}

export default function BugfixQualityPage() {
  const { firebaseUser } = useAuth()
  const [rows, setRows] = useState<BugfixScenarioAuditRow[]>([])
  const [stats, setStats] = useState<BugfixQualityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAudit = useCallback(
    async (showRefreshing = false) => {
      if (!firebaseUser) return

      if (showRefreshing) setRefreshing(true)
      setError(null)

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/admin/bugfix-quality", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load bugfix quality audit")
        }

        setRows(data.rows || [])
        setStats(data.stats || null)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load audit")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser]
  )

  useEffect(() => {
    loadAudit()
  }, [loadAudit])

  const columns: Column<BugfixScenarioAuditRow>[] = [
    {
      key: "complete",
      label: "Status",
      width: "120px",
      render: (value) =>
        value ? (
          <Badge className="border-0 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Pass
          </Badge>
        ) : (
          <Badge className="border-0 bg-red-500/10 text-red-400">
            <XCircle className="mr-1 h-3 w-3" />
            Fail
          </Badge>
        ),
    },
    {
      key: "title",
      label: "Scenario",
      render: (value, row) => (
        <div>
          <p className="font-medium text-white">{value}</p>
          <p className="font-mono text-xs text-gray-500">{row.scenarioId}</p>
        </div>
      ),
    },
    {
      key: "issueCount",
      label: "Issues",
      width: "100px",
      render: (value) => (
        <span className={value > 0 ? "text-red-400" : "text-emerald-400"}>{value}</span>
      ),
    },
    {
      key: "tags",
      label: "Tags",
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="border-gray-700 text-gray-400">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "issues",
      label: "Details",
      render: (value: string[]) =>
        value.length > 0 ? (
          <div className="space-y-1 text-xs text-red-300">
            {value.slice(0, 3).map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-500">Ready for release seed set</span>
        ),
    },
  ]

  return (
    <AdminLayout
      title="Bugfix Quality"
      description="Release audit for real-codebase debugging incidents"
      icon={ClipboardCheck}
      loading={loading}
      error={error}
      onRefresh={() => loadAudit(true)}
      refreshing={refreshing}
      actions={
        <Button
          onClick={() => loadAudit(true)}
          variant="outline"
          size="sm"
          disabled={refreshing}
          className="border-gray-700 text-gray-400 hover:text-white"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Recheck
        </Button>
      }
    >
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">Seed Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-light text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">Passing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-light text-emerald-400">{stats.passing}</p>
            </CardContent>
          </Card>
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">Failing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-light text-red-400">{stats.failing}</p>
            </CardContent>
          </Card>
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">Open Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-light text-white">{stats.totalIssues}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <DataTable
        title="Scenario Audit"
        description="Validates incident metadata, workspace shape, hidden-test boundaries, and release tags"
        icon={ClipboardCheck}
        data={rows}
        columns={columns}
        keyExtractor={(row) => row.scenarioId}
        emptyMessage="No bugfix scenarios found"
      />
    </AdminLayout>
  )
}
