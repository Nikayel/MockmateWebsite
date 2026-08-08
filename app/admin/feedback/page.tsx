"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  MessageSquare,
  RefreshCw,
  Bug,
  Lightbulb,
  ThumbsUp,
  Check,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { logger } from "@/lib/logger"
import {
  resolveFeedbackPriority,
  resolveFeedbackStatus,
  resolveFeedbackType,
  type FeedbackPriority,
  type FeedbackStatus,
  type UserFeedbackType,
} from "@/lib/feedback/user-feedback-schema"

interface FeedbackItem {
  id: string
  userId: string
  userEmail: string | null
  type: UserFeedbackType
  content: string
  path: string | null
  status: FeedbackStatus
  priority: FeedbackPriority
  votes: number
  createdAt: string | null
  repliedAt: string | null
  adminNotes: string | null
}

interface FeedbackStats {
  total: number
  new: number
  inProgress: number
  resolved: number
  featureRequests: number
  bugReports: number
}

const EMPTY_STATS: FeedbackStats = {
  total: 0,
  new: 0,
  inProgress: 0,
  resolved: 0,
  featureRequests: 0,
  bugReports: 0,
}

/**
 * Written as a `Record<UserFeedbackType, …>` on purpose: adding a submittable type without a
 * config entry now fails to compile instead of throwing at render time.
 *
 * "nps" is deliberately absent. It was a fourth key here, and the only writer of this collection
 * cannot produce it.
 */
const typeConfig: Record<UserFeedbackType, { icon: typeof Bug; color: string; label: string }> = {
  feedback: { icon: MessageSquare, color: "bg-blue-500/20 text-blue-400", label: "Feedback" },
  feature_request: { icon: Lightbulb, color: "bg-yellow-500/20 text-yellow-400", label: "Feature" },
  bug_report: { icon: Bug, color: "bg-red-500/20 text-red-400", label: "Bug" },
}

const statusConfig: Record<FeedbackStatus, { color: string; label: string }> = {
  new: { color: "bg-blue-500/20 text-blue-400", label: "New" },
  reviewed: { color: "bg-yellow-500/20 text-yellow-400", label: "Reviewed" },
  in_progress: { color: "bg-purple-500/20 text-purple-400", label: "In Progress" },
  resolved: { color: "bg-green-500/20 text-green-400", label: "Resolved" },
  declined: { color: "bg-gray-500/20 text-gray-400", label: "Declined" },
}

const priorityConfig: Record<FeedbackPriority, string> = {
  low: "bg-gray-500/20 text-gray-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
}

/**
 * Normalize one row from the API.
 *
 * FB-19: `typeConfig[item.type].icon` used to run on whatever string Firestore held. One legacy
 * "nps" row, one typo, or one value from a future release threw during render and blanked the
 * entire page, which the founder reads as "nobody has sent any feedback" rather than as a crash.
 * The server normalizes too; this is the boundary that must hold regardless.
 */
function normalizeFeedbackItem(raw: unknown): FeedbackItem {
  const item = (raw ?? {}) as Record<string, unknown>
  return {
    id: String(item.id ?? ""),
    userId: typeof item.userId === "string" ? item.userId : "",
    userEmail: typeof item.userEmail === "string" ? item.userEmail : null,
    type: resolveFeedbackType(item.type),
    content: typeof item.content === "string" ? item.content : "",
    path: typeof item.path === "string" ? item.path : null,
    status: resolveFeedbackStatus(item.status),
    priority: resolveFeedbackPriority(item.priority),
    votes: typeof item.votes === "number" ? item.votes : 0,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : null,
    repliedAt: typeof item.repliedAt === "string" ? item.repliedAt : null,
    adminNotes: typeof item.adminNotes === "string" ? item.adminNotes : null,
  }
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown date"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString()
}

export default function FeedbackPage() {
  const { firebaseUser } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<FeedbackStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState("")

  const loadFeedback = useCallback(
    async (showRefreshing = false) => {
      if (!firebaseUser) return
      if (showRefreshing) setRefreshing(true)

      try {
        const token = await firebaseUser.getIdToken()
        const params = new URLSearchParams()
        if (statusFilter !== "all") params.set("status", statusFilter)
        if (typeFilter !== "all") params.set("type", typeFilter)

        const response = await fetch(`/api/admin/feedback?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        // A failed request used to fall through this block silently, leaving the previous render in
        // place and the empty state showing. "Could not load" and "nothing to triage" are opposite
        // facts and must not look the same.
        if (!response.ok) {
          setLoadError(
            response.status === 403
              ? "Your account does not have permission to view feedback."
              : `Could not load feedback (${response.status}).`
          )
          return
        }

        const data = await response.json()
        if (!data.success) {
          setLoadError(typeof data.error === "string" ? data.error : "Could not load feedback.")
          return
        }

        setFeedback((Array.isArray(data.feedback) ? data.feedback : []).map(normalizeFeedbackItem))
        setStats(data.stats ? { ...EMPTY_STATS, ...data.stats } : EMPTY_STATS)
        setLoadError(null)
      } catch (error) {
        logger.error("Error loading feedback", { error })
        setLoadError("Could not reach the server. Check your connection and try again.")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser, statusFilter, typeFilter]
  )

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  const updateFeedback = useCallback(
    async (body: Record<string, unknown>, failureMessage: string) => {
      if (!firebaseUser) return false
      setActionError(null)
      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/admin/feedback", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!response.ok) {
          setActionError(failureMessage)
          return false
        }
        await loadFeedback(true)
        return true
      } catch (error) {
        logger.error("Error updating feedback", { error })
        setActionError(failureMessage)
        return false
      }
    },
    [firebaseUser, loadFeedback]
  )

  const handleUpdateStatus = (id: string, status: FeedbackStatus) =>
    updateFeedback({ id, status }, "Could not update that status. Please try again.")

  const handleSaveNotes = async () => {
    if (!selectedItem) return
    const saved = await updateFeedback(
      { id: selectedItem.id, adminNotes },
      "Could not save your notes. They are still here, so you can retry."
    )
    // The dialog stays open on failure. Closing it would discard notes the server never stored.
    if (saved) setDialogOpen(false)
  }

  const openDetails = (item: FeedbackItem) => {
    setSelectedItem(item)
    setAdminNotes(item.adminNotes || "")
    setActionError(null)
    setDialogOpen(true)
  }

  if (loading) {
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
          <h1 className="font-heading text-3xl font-bold text-white">User Feedback</h1>
          <p className="mt-1 text-gray-400">Manage feedback, feature requests, and bug reports</p>
        </div>
        <Button
          onClick={() => loadFeedback(true)}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-400"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loadError && (
        <Card className="border-red-900/60 bg-red-950/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium text-red-200">Feedback could not be loaded</p>
              <p className="mt-1 text-sm text-red-300/80">{loadError}</p>
              <p className="mt-1 text-sm text-red-300/60">
                The queue below may be out of date or incomplete. This is not the same as an empty
                queue.
              </p>
            </div>
            <Button
              onClick={() => loadFeedback(true)}
              disabled={refreshing}
              size="sm"
              variant="outline"
              className="border-red-800 text-red-200"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Total</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.new}</p>
            <p className="text-xs text-gray-400">New</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{stats.inProgress}</p>
            <p className="text-xs text-gray-400">In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
            <p className="text-xs text-gray-400">Resolved</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.featureRequests}</p>
            <p className="text-xs text-gray-400">Features</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.bugReports}</p>
            <p className="text-xs text-gray-400">Bugs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] border-gray-700 bg-gray-800 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-800">
            <SelectItem value="all" className="text-white">
              All Status
            </SelectItem>
            {(Object.keys(statusConfig) as FeedbackStatus[]).map((status) => (
              <SelectItem key={status} value={status} className="text-white">
                {statusConfig[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px] border-gray-700 bg-gray-800 text-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="border-gray-700 bg-gray-800">
            <SelectItem value="all" className="text-white">
              All Types
            </SelectItem>
            {(Object.keys(typeConfig) as UserFeedbackType[]).map((type) => (
              <SelectItem key={type} value={type} className="text-white">
                {typeConfig[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {actionError && (
        <p className="text-sm text-red-400" role="status" aria-live="polite">
          {actionError}
        </p>
      )}

      {/* Feedback List */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="h-5 w-5 text-[#c4703f]" />
            Feedback ({feedback.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <p className="py-8 text-center text-gray-400">
              {loadError ? "Nothing loaded." : "No feedback found"}
            </p>
          ) : (
            <div className="space-y-3">
              {feedback.map((item) => {
                const TypeIcon = typeConfig[item.type].icon
                return (
                  <div
                    key={item.id}
                    className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800/50 p-4 hover:border-gray-600"
                    onClick={() => openDetails(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        openDetails(item)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-1 items-start gap-3">
                        <div
                          className={`rounded-lg p-2 ${typeConfig[item.type].color.split(" ")[0]}`}
                        >
                          <TypeIcon
                            className={`h-4 w-4 ${typeConfig[item.type].color.split(" ")[1]}`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge className={typeConfig[item.type].color}>
                              {typeConfig[item.type].label}
                            </Badge>
                            <Badge className={statusConfig[item.status].color}>
                              {statusConfig[item.status].label}
                            </Badge>
                            <Badge className={priorityConfig[item.priority]}>{item.priority}</Badge>
                            {item.repliedAt && (
                              <Badge className="bg-green-500/20 text-green-400">Replied</Badge>
                            )}
                          </div>
                          <p className="line-clamp-2 text-sm text-gray-300">{item.content}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>{item.userEmail || item.userId.substring(0, 8) || "Unknown"}</span>
                            <span>{formatDate(item.createdAt)}</span>
                            {item.path && <span className="truncate">from {item.path}</span>}
                            {item.votes > 0 && (
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" /> {item.votes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Mark resolved"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateStatus(item.id, "resolved")
                          }}
                          className="text-green-400 hover:text-green-300"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Mark in progress"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateStatus(item.id, "in_progress")
                          }}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl border-gray-800 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge className={typeConfig[selectedItem.type].color}>
                  {typeConfig[selectedItem.type].label}
                </Badge>
                <Badge className={statusConfig[selectedItem.status].color}>
                  {statusConfig[selectedItem.status].label}
                </Badge>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="whitespace-pre-wrap text-gray-300">{selectedItem.content}</p>
              </div>
              <div className="text-sm text-gray-400">
                <p>From: {selectedItem.userEmail || selectedItem.userId || "Unknown"}</p>
                <p>Date: {formatDate(selectedItem.createdAt)}</p>
                {selectedItem.path && <p>Sent from: {selectedItem.path}</p>}
              </div>
              <div className="space-y-2">
                <label htmlFor="admin-notes" className="text-sm text-gray-400">
                  Admin Notes
                </label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm text-gray-400">Update Status</span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(statusConfig) as FeedbackStatus[]).map((status) => (
                    <Button
                      key={status}
                      variant={selectedItem.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedItem.id, status)}
                      className={
                        selectedItem.status === status
                          ? "bg-[#c4703f] text-black"
                          : "border-gray-700"
                      }
                    >
                      {statusConfig[status].label}
                    </Button>
                  ))}
                </div>
              </div>
              {actionError && (
                <p className="text-sm text-red-400" role="status" aria-live="polite">
                  {actionError}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} className="bg-[#c4703f] text-black">
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
