"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, Column, renderBadge } from "@/components/admin/shared"
import {
  ClipboardList,
  RefreshCw,
  Download,
  Shield,
  UserCog,
  Search,
  Calendar,
  Filter,
  Activity,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface AuditLogEntry {
  id: string
  adminId: string
  adminEmail?: string
  action: string
  details: Record<string, any>
  timestamp: string
  ip?: string
  userAgent?: string
}

interface AuditStats {
  last24h: number
  last7d: number
  total: number
}

const actionColors: Record<string, "default" | "success" | "warning" | "error"> = {
  grant_role: "success",
  revoke_role: "warning",
  delete_user: "error",
  update_settings: "default",
  budget_change: "warning",
  impersonate_user: "warning",
  export_data: "default",
  create_announcement: "success",
  login: "default",
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  grant_role: Shield,
  revoke_role: Shield,
  delete_user: UserCog,
  update_settings: Activity,
  impersonate_user: UserCog,
}

export default function AuditLogPage() {
  const { firebaseUser } = useAuth()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Pagination
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const loadLogs = useCallback(
    async (showRefreshing = false, append = false) => {
      if (!firebaseUser) return

      if (showRefreshing) setRefreshing(true)
      if (!append) setLoading(true)

      try {
        const token = await firebaseUser.getIdToken()
        const params = new URLSearchParams({
          limit: "50",
        })

        if (append && cursor) {
          params.set("cursor", cursor)
        }
        if (actionFilter && actionFilter !== "all") {
          params.set("action", actionFilter)
        }
        if (startDate) {
          params.set("startDate", startDate)
        }
        if (endDate) {
          params.set("endDate", endDate)
        }

        const response = await fetch(`/api/admin/audit?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            if (append) {
              setLogs((prev) => [...prev, ...data.logs])
            } else {
              setLogs(data.logs)
            }
            setStats(data.stats)
            setAvailableActions(data.filters?.actions || [])
            setHasMore(data.pagination?.hasMore || false)
            setCursor(data.pagination?.nextCursor || null)
          }
        }
      } catch (error) {
        logger.error("Error loading audit logs", { error })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser, actionFilter, startDate, endDate, cursor]
  )

  useEffect(() => {
    loadLogs()
  }, [actionFilter, startDate, endDate]) // Reload when filters change

  const handleExport = async () => {
    if (!firebaseUser) return

    setExporting(true)
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/audit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          format: "csv",
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      logger.error("Error exporting audit logs", { error })
    } finally {
      setExporting(false)
    }
  }

  const formatDetails = (details: Record<string, any>): string => {
    const parts: string[] = []
    if (details.targetUserId) parts.push(`User: ${details.targetUserId.substring(0, 8)}...`)
    if (details.targetEmail) parts.push(`Email: ${details.targetEmail}`)
    if (details.role) parts.push(`Role: ${details.role}`)
    if (details.deletedDocuments) parts.push(`Docs deleted: ${details.deletedDocuments}`)
    if (details.amount) parts.push(`Amount: $${details.amount}`)
    return parts.join(" | ") || JSON.stringify(details).substring(0, 50)
  }

  // Filter logs by search query (client-side)
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.action.toLowerCase().includes(query) ||
      log.adminId.toLowerCase().includes(query) ||
      (log.adminEmail?.toLowerCase().includes(query) ?? false) ||
      JSON.stringify(log.details).toLowerCase().includes(query)
    )
  })

  const columns: Column<AuditLogEntry>[] = [
    {
      key: "timestamp",
      label: "Time",
      width: "160px",
      render: (value) => (
        <span className="text-sm whitespace-nowrap text-gray-300">
          {new Date(value).toLocaleString()}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "150px",
      render: (value) => {
        const color = actionColors[value] || "default"
        return renderBadge(value.replace(/_/g, " ").toUpperCase(), color)
      },
    },
    {
      key: "adminEmail",
      label: "Admin",
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="text-sm text-white">{value || "System"}</span>
          <span className="text-xs text-gray-500">{row.adminId.substring(0, 12)}...</span>
        </div>
      ),
    },
    {
      key: "details",
      label: "Details",
      render: (value) => <span className="text-sm text-gray-400">{formatDetails(value)}</span>,
    },
    {
      key: "ip",
      label: "IP",
      width: "120px",
      render: (value) => <span className="font-mono text-xs text-gray-500">{value || "N/A"}</span>,
    },
  ]

  if (loading && logs.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#c4703f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Audit Log</h1>
          <p className="mt-1 text-gray-400">Track all admin actions for compliance and security</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <Download className={`mr-2 h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
            Export CSV
          </Button>

          <Button
            onClick={() => loadLogs(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#c4703f]/20 p-3">
                <Activity className="h-6 w-6 text-[#c4703f]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats?.last24h || 0}</p>
                <p className="text-sm text-gray-400">Actions (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-500/20 p-3">
                <ClipboardList className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats?.last7d || 0}</p>
                <p className="text-sm text-gray-400">Actions (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-3">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{availableActions.length}</p>
                <p className="text-sm text-gray-400">Action Types</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Filters:</span>
            </div>

            <div className="relative max-w-xs flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-gray-700 bg-gray-800 pl-10 text-white"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px] border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="all" className="text-white">
                  All Actions
                </SelectItem>
                {availableActions.map((action) => (
                  <SelectItem key={action} value={action} className="text-white">
                    {action.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px] border-gray-700 bg-gray-800 text-white"
                placeholder="Start date"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px] border-gray-700 bg-gray-800 text-white"
                placeholder="End date"
              />
            </div>

            {(actionFilter !== "all" || startDate || endDate || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActionFilter("all")
                  setStartDate("")
                  setEndDate("")
                  setSearchQuery("")
                }}
                className="text-gray-400 hover:text-white"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <DataTable
        title="Admin Actions"
        icon={ClipboardList}
        data={filteredLogs}
        columns={columns}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No audit logs found"
      />

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={() => loadLogs(false, true)}
            variant="outline"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            Load More
          </Button>
        </div>
      )}

      {/* Compliance Info */}
      <Card className="border-blue-500/30 bg-blue-900/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-500/20 p-3">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Compliance & Security</h3>
              <p className="text-sm text-blue-300/70">
                All admin actions are logged with timestamps, user IDs, and IP addresses. Logs are
                retained for compliance purposes and can be exported for audits.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
