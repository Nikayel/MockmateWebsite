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
  Star,
  Bug,
  Lightbulb,
  ThumbsUp,
  MoreVertical,
  Check,
  Clock,
  X,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface FeedbackItem {
  id: string
  userId: string
  userEmail?: string
  type: "feedback" | "feature_request" | "bug_report" | "nps"
  content: string
  rating?: number
  npsScore?: number
  status: "new" | "reviewed" | "in_progress" | "resolved" | "declined"
  priority: "low" | "medium" | "high" | "critical"
  votes: number
  createdAt: string
  adminNotes?: string
}

const typeConfig = {
  feedback: { icon: MessageSquare, color: "bg-blue-500/20 text-blue-400", label: "Feedback" },
  feature_request: { icon: Lightbulb, color: "bg-yellow-500/20 text-yellow-400", label: "Feature" },
  bug_report: { icon: Bug, color: "bg-red-500/20 text-red-400", label: "Bug" },
  nps: { icon: Star, color: "bg-purple-500/20 text-purple-400", label: "NPS" },
}

const statusConfig = {
  new: { color: "bg-blue-500/20 text-blue-400", label: "New" },
  reviewed: { color: "bg-yellow-500/20 text-yellow-400", label: "Reviewed" },
  in_progress: { color: "bg-purple-500/20 text-purple-400", label: "In Progress" },
  resolved: { color: "bg-green-500/20 text-green-400", label: "Resolved" },
  declined: { color: "bg-gray-500/20 text-gray-400", label: "Declined" },
}

const priorityConfig = {
  low: "bg-gray-500/20 text-gray-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
}

export default function FeedbackPage() {
  const { firebaseUser } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    featureRequests: 0,
    bugReports: 0,
    npsScore: 0,
    avgRating: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
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

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setFeedback(data.feedback)
            setStats(data.stats)
          }
        }
      } catch (error) {
        logger.error("Error loading feedback", { error })
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

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      await fetch("/api/admin/feedback", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      loadFeedback(true)
    } catch (error) {
      logger.error("Error updating feedback", { error })
    }
  }

  const handleSaveNotes = async () => {
    if (!firebaseUser || !selectedItem) return

    try {
      const token = await firebaseUser.getIdToken()
      await fetch("/api/admin/feedback", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedItem.id, adminNotes }),
      })
      setDialogOpen(false)
      loadFeedback(true)
    } catch (error) {
      logger.error("Error saving notes", { error })
    }
  }

  const openDetails = (item: FeedbackItem) => {
    setSelectedItem(item)
    setAdminNotes(item.adminNotes || "")
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
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
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#c4703f]">{stats.npsScore}</p>
            <p className="text-xs text-gray-400">NPS Score</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.avgRating}</p>
            <p className="text-xs text-gray-400">Avg Rating</p>
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
            <SelectItem value="new" className="text-white">
              New
            </SelectItem>
            <SelectItem value="reviewed" className="text-white">
              Reviewed
            </SelectItem>
            <SelectItem value="in_progress" className="text-white">
              In Progress
            </SelectItem>
            <SelectItem value="resolved" className="text-white">
              Resolved
            </SelectItem>
            <SelectItem value="declined" className="text-white">
              Declined
            </SelectItem>
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
            <SelectItem value="feedback" className="text-white">
              Feedback
            </SelectItem>
            <SelectItem value="feature_request" className="text-white">
              Feature Request
            </SelectItem>
            <SelectItem value="bug_report" className="text-white">
              Bug Report
            </SelectItem>
            <SelectItem value="nps" className="text-white">
              NPS
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            <p className="py-8 text-center text-gray-400">No feedback found</p>
          ) : (
            <div className="space-y-3">
              {feedback.map((item) => {
                const TypeIcon = typeConfig[item.type].icon
                return (
                  <div
                    key={item.id}
                    className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800/50 p-4 hover:border-gray-600"
                    onClick={() => openDetails(item)}
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
                            {item.npsScore !== undefined && (
                              <Badge className="bg-purple-500/20 text-purple-400">
                                NPS: {item.npsScore}
                              </Badge>
                            )}
                            {item.rating && (
                              <span className="flex items-center text-sm text-yellow-400">
                                <Star className="mr-1 h-3 w-3 fill-current" />
                                {item.rating}
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 text-sm text-gray-300">{item.content}</p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>{item.userEmail || item.userId.substring(0, 8)}</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
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
                <p className="text-gray-300">{selectedItem.content}</p>
              </div>
              <div className="text-sm text-gray-400">
                <p>From: {selectedItem.userEmail || selectedItem.userId}</p>
                <p>Date: {new Date(selectedItem.createdAt).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Update Status</label>
                <div className="flex gap-2">
                  {(["new", "reviewed", "in_progress", "resolved", "declined"] as const).map(
                    (status) => (
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
                    )
                  )}
                </div>
              </div>
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
