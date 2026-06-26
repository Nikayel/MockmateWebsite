"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  RefreshCw,
  Filter,
  User,
  Globe,
  Calendar,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type RateLimitType = "rate_limit" | "budget_exceeded" | "concurrent_limit" | "session_limit"

interface RateLimitFeedback {
  id: string
  type: RateLimitType
  code: string | null
  systemMessage: string
  userMessage: string | null
  feedbackTimestamp: string
  endpoint: string | null
  tier: string | null
  userId: string | null
  userEmail: string | null
  clientIp: string
  userAgent: string | null
  status: "pending" | "reviewed" | "resolved" | "dismissed"
  reviewedBy: string | null
  reviewedAt: string | null
  resolution: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface FeedbackCounts {
  pending: number
  reviewed: number
  resolved: number
  dismissed: number
  total: number
}

const typeColors: Record<RateLimitType, string> = {
  rate_limit: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  budget_exceeded: "text-red-500 bg-red-500/10 border-red-500/30",
  concurrent_limit: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  session_limit: "text-purple-500 bg-purple-500/10 border-purple-500/30",
}

function getTypeIcon(type: RateLimitType) {
  switch (type) {
    case "rate_limit":
      return Clock
    case "budget_exceeded":
      return AlertCircle
    case "concurrent_limit":
      return Zap
    case "session_limit":
      return AlertCircle
    default:
      return AlertCircle
  }
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  reviewed: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  resolved: "bg-green-500/10 text-green-500 border-green-500/30",
  dismissed: "bg-gray-500/10 text-gray-400 border-gray-500/30",
}

export default function RateLimitsPage() {
  const { firebaseUser } = useAuth()
  const [feedback, setFeedback] = useState<RateLimitFeedback[]>([])
  const [counts, setCounts] = useState<FeedbackCounts>({
    pending: 0,
    reviewed: 0,
    resolved: 0,
    dismissed: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("pending")
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<RateLimitFeedback | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchFeedback = useCallback(async () => {
    if (!firebaseUser) return

    setLoading(true)
    try {
      const token = await firebaseUser.getIdToken()
      const params = new URLSearchParams({
        status: statusFilter,
        limit: "50",
      })
      if (typeFilter) {
        params.set("type", typeFilter)
      }

      const response = await fetch(`/api/rate-limit-feedback?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback)
        setCounts(data.counts)
      }
    } catch (error) {
      console.error("Failed to fetch feedback:", error)
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, statusFilter, typeFilter])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const updateFeedbackStatus = async (
    feedbackId: string,
    status: string,
    resolution?: string,
    notes?: string
  ) => {
    if (!firebaseUser) return

    setUpdating(true)
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/rate-limit-feedback", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedbackId, status, resolution, notes }),
      })

      if (response.ok) {
        // Refresh the list
        await fetchFeedback()
        setSelectedFeedback(null)
      }
    } catch (error) {
      console.error("Failed to update feedback:", error)
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Rate Limit Feedback</h1>
          <p className="mt-1 text-sm text-gray-400">
            Review user reports of incorrect rate limiting
          </p>
        </div>
        <Button onClick={fetchFeedback} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "Pending", value: counts.pending, color: "text-yellow-500" },
          { label: "Reviewed", value: counts.reviewed, color: "text-blue-500" },
          { label: "Resolved", value: counts.resolved, color: "text-green-500" },
          { label: "Dismissed", value: counts.dismissed, color: "text-gray-400" },
          { label: "Total", value: counts.total, color: "text-white" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter:</span>
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          {["pending", "reviewed", "resolved", "dismissed", "all"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                statusFilter === status
                  ? "border border-[#c4703f]/30 bg-[#c4703f]/20 text-[#c4703f]"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              )}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter || ""}
          onChange={(e) => setTypeFilter(e.target.value || null)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300"
        >
          <option value="">All Types</option>
          <option value="rate_limit">Rate Limit</option>
          <option value="budget_exceeded">Budget Exceeded</option>
          <option value="concurrent_limit">Concurrent Limit</option>
          <option value="session_limit">Session Limit</option>
        </select>
      </div>

      {/* Feedback list */}
      <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#c4703f]" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
            <p className="text-gray-400">No feedback matching filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {feedback.map((item) => {
              const TypeIcon = getTypeIcon(item.type)

              return (
                <div
                  key={item.id}
                  className={cn(
                    "cursor-pointer p-4 transition-colors hover:bg-gray-800/30",
                    selectedFeedback?.id === item.id && "bg-gray-800/50"
                  )}
                  onClick={() => setSelectedFeedback(item)}
                >
                  <div className="flex items-start gap-4">
                    {/* Type icon */}
                    <div className={cn("rounded-lg border p-2", typeColors[item.type])}>
                      <TypeIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {item.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        {item.code && (
                          <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
                            {item.code}
                          </code>
                        )}
                        <Badge
                          variant="outline"
                          className={cn("text-xs", statusColors[item.status])}
                        >
                          {item.status}
                        </Badge>
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                        {item.systemMessage}
                      </p>

                      {item.userMessage && (
                        <div className="mt-2 flex items-start gap-2">
                          <MessageSquare className="mt-0.5 h-3.5 w-3.5 text-gray-500" />
                          <p className="line-clamp-2 text-xs text-gray-500 italic">
                            "{item.userMessage}"
                          </p>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.userEmail || item.userId?.slice(0, 8) || "Anonymous"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {item.clientIp}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.createdAt)}
                        </span>
                        {item.tier && (
                          <Badge variant="outline" className="text-xs">
                            {item.tier}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateFeedbackStatus(item.id, "resolved")
                        }}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-green-500/10 hover:text-green-500"
                        title="Mark as resolved"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateFeedbackStatus(item.id, "dismissed")
                        }}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Dismiss"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedFeedback && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-gray-800 bg-gray-900 shadow-xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 p-4 backdrop-blur-sm">
            <h2 className="font-semibold text-white">Feedback Details</h2>
            <button
              onClick={() => setSelectedFeedback(null)}
              className="rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-6 p-4">
            {/* Type & Status */}
            <div className="flex items-center gap-3">
              <div className={cn("rounded-lg border p-2", typeColors[selectedFeedback.type])}>
                {(() => {
                  const Icon = getTypeIcon(selectedFeedback.type)
                  return <Icon className="h-5 w-5" />
                })()}
              </div>
              <div>
                <p className="font-medium text-white">
                  {selectedFeedback.type
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
                {selectedFeedback.code && (
                  <code className="text-xs text-gray-400">{selectedFeedback.code}</code>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn("ml-auto", statusColors[selectedFeedback.status])}
              >
                {selectedFeedback.status}
              </Badge>
            </div>

            {/* System Message */}
            <div>
              <label className="text-xs tracking-wider text-gray-500 uppercase">
                System Message
              </label>
              <p className="mt-1 rounded-lg bg-gray-800/50 p-3 text-sm text-gray-300">
                {selectedFeedback.systemMessage}
              </p>
            </div>

            {/* User Message */}
            {selectedFeedback.userMessage && (
              <div>
                <label className="text-xs tracking-wider text-gray-500 uppercase">
                  User Feedback
                </label>
                <p className="mt-1 rounded-lg bg-gray-800/50 p-3 text-sm text-gray-300 italic">
                  "{selectedFeedback.userMessage}"
                </p>
              </div>
            )}

            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-wider text-gray-500 uppercase">User</label>
                <p className="mt-1 text-sm text-gray-300">
                  {selectedFeedback.userEmail || selectedFeedback.userId || "Anonymous"}
                </p>
              </div>
              <div>
                <label className="text-xs tracking-wider text-gray-500 uppercase">Tier</label>
                <p className="mt-1 text-sm text-gray-300 capitalize">
                  {selectedFeedback.tier || "Unknown"}
                </p>
              </div>
              <div>
                <label className="text-xs tracking-wider text-gray-500 uppercase">IP Address</label>
                <p className="mt-1 font-mono text-sm text-gray-300">{selectedFeedback.clientIp}</p>
              </div>
              <div>
                <label className="text-xs tracking-wider text-gray-500 uppercase">
                  Reported At
                </label>
                <p className="mt-1 text-sm text-gray-300">
                  {formatDate(selectedFeedback.createdAt)}
                </p>
              </div>
            </div>

            {/* User Agent */}
            {selectedFeedback.userAgent && (
              <div>
                <label className="text-xs tracking-wider text-gray-500 uppercase">User Agent</label>
                <p className="mt-1 rounded bg-gray-800/50 p-2 font-mono text-xs break-all text-gray-400">
                  {selectedFeedback.userAgent}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-800 pt-4">
              <label className="mb-3 block text-xs tracking-wider text-gray-500 uppercase">
                Update Status
              </label>
              <div className="flex flex-wrap gap-2">
                {["reviewed", "resolved", "dismissed"].map((status) => (
                  <Button
                    key={status}
                    onClick={() => updateFeedbackStatus(selectedFeedback.id, status)}
                    disabled={updating || selectedFeedback.status === status}
                    variant={selectedFeedback.status === status ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                  >
                    {updating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            {/* Review Info */}
            {selectedFeedback.reviewedAt && (
              <div className="rounded-lg bg-gray-800/30 p-3 text-sm">
                <p className="text-gray-400">
                  Reviewed by <span className="text-gray-300">{selectedFeedback.reviewedBy}</span>
                  {" on "}
                  <span className="text-gray-300">{formatDate(selectedFeedback.reviewedAt)}</span>
                </p>
                {selectedFeedback.resolution && (
                  <p className="mt-2 text-gray-300">{selectedFeedback.resolution}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
