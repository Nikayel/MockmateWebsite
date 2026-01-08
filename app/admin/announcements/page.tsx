"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Megaphone,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  Bell,
  Users,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface Announcement {
  id: string
  title: string
  message: string
  type: "banner" | "modal" | "toast" | "page"
  priority: "info" | "warning" | "critical" | "success"
  targetAudience: "all" | "free" | "pro" | "enterprise" | "specific"
  startDate: string
  endDate?: string
  dismissible: boolean
  active: boolean
  createdAt: string
  views: number
  dismissals: number
  cta?: {
    text: string
    url: string
  }
}

const priorityConfig = {
  info: { icon: Info, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  warning: { icon: AlertTriangle, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  critical: { icon: AlertCircle, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  success: { icon: CheckCircle, color: "bg-green-500/20 text-green-400 border-green-500/30" },
}

const typeConfig = {
  banner: "Top banner across all pages",
  modal: "Popup dialog on first visit",
  toast: "Temporary notification",
  page: "Dedicated announcement page",
}

const defaultAnnouncement: {
  title: string
  message: string
  type: "banner" | "modal" | "toast" | "page"
  priority: "info" | "warning" | "critical" | "success"
  targetAudience: "all" | "free" | "pro" | "enterprise" | "specific"
  startDate: string
  endDate: string
  dismissible: boolean
  active: boolean
  cta: { text: string; url: string }
} = {
  title: "",
  message: "",
  type: "banner",
  priority: "info",
  targetAudience: "all",
  startDate: new Date().toISOString().slice(0, 16), // Format: YYYY-MM-DDTHH:MM
  endDate: "",
  dismissible: true,
  active: true,
  cta: { text: "", url: "" },
}

export default function AnnouncementsPage() {
  const { firebaseUser } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, totalViews: 0, totalDismissals: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<Announcement> | null>(null)
  const [formData, setFormData] = useState(defaultAnnouncement)

  const loadAnnouncements = useCallback(
    async (showRefreshing = false) => {
      if (!firebaseUser) return

      if (showRefreshing) setRefreshing(true)

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/admin/announcements", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setAnnouncements(data.announcements)
            setStats(data.stats)
          }
        }
      } catch (error) {
        logger.error("Error loading announcements", { error })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser]
  )

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const handleOpenCreate = () => {
    setEditingAnnouncement(null)
    setFormData(defaultAnnouncement)
    setDialogOpen(true)
  }

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      targetAudience: announcement.targetAudience,
      startDate: announcement.startDate?.slice(0, 16) || "",
      endDate: announcement.endDate?.slice(0, 16) || "",
      dismissible: announcement.dismissible,
      active: announcement.active,
      cta: announcement.cta || { text: "", url: "" },
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!firebaseUser) return

    setSaving(true)
    try {
      const token = await firebaseUser.getIdToken()
      const method = editingAnnouncement ? "PUT" : "POST"
      const body = editingAnnouncement ? { id: editingAnnouncement.id, ...formData } : formData

      // Clean up empty CTA
      if (!body.cta?.text && !body.cta?.url) {
        body.cta = undefined as any
      }

      const response = await fetch("/api/admin/announcements", {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        setDialogOpen(false)
        loadAnnouncements(true)
      }
    } catch (error) {
      logger.error("Error saving announcement", { error })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!firebaseUser || !confirm("Are you sure you want to delete this announcement?")) return

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        loadAnnouncements(true)
      }
    } catch (error) {
      logger.error("Error deleting announcement", { error })
    }
  }

  const handleToggleActive = async (announcement: Announcement) => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: announcement.id,
          active: !announcement.active,
        }),
      })

      loadAnnouncements(true)
    } catch (error) {
      logger.error("Error toggling announcement", { error })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00d9ff]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Announcements</h1>
          <p className="mt-1 text-gray-400">Manage system announcements and user notifications</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadAnnouncements(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={handleOpenCreate}
            className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#00d9ff]/20 p-3">
                <Megaphone className="h-6 w-6 text-[#00d9ff]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">Total Announcements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/20 p-3">
                <Bell className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.active}</p>
                <p className="text-sm text-gray-400">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-500/20 p-3">
                <Eye className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.totalViews.toLocaleString()}</p>
                <p className="text-sm text-gray-400">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-3">
                <X className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {stats.totalDismissals.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">Dismissals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Megaphone className="h-5 w-5 text-[#00d9ff]" />
            All Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="py-12 text-center">
              <Megaphone className="mx-auto mb-4 h-12 w-12 text-gray-600" />
              <p className="text-gray-400">No announcements yet</p>
              <Button
                onClick={handleOpenCreate}
                variant="outline"
                className="mt-4 border-gray-700 text-gray-400 hover:text-white"
              >
                Create your first announcement
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => {
                const PriorityIcon = priorityConfig[announcement.priority].icon
                const isExpired =
                  announcement.endDate && new Date(announcement.endDate) < new Date()

                return (
                  <div
                    key={announcement.id}
                    className={`rounded-lg border bg-gray-800/50 p-4 ${
                      announcement.active && !isExpired
                        ? "border-gray-700"
                        : "border-gray-800 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-1 items-start gap-4">
                        <div
                          className={`rounded-lg p-2 ${priorityConfig[announcement.priority].color.split(" ")[0]}`}
                        >
                          <PriorityIcon
                            className={`h-5 w-5 ${priorityConfig[announcement.priority].color.split(" ")[1]}`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-white">{announcement.title}</h3>
                            <Badge className={priorityConfig[announcement.priority].color}>
                              {announcement.priority}
                            </Badge>
                            <Badge className="border-gray-600/30 bg-gray-600/20 text-gray-400">
                              {announcement.type}
                            </Badge>
                            <Badge className="border-purple-600/30 bg-purple-600/20 text-purple-400">
                              <Users className="mr-1 h-3 w-3" />
                              {announcement.targetAudience}
                            </Badge>
                            {!announcement.active && (
                              <Badge className="border-gray-600/30 bg-gray-600/20 text-gray-500">
                                Inactive
                              </Badge>
                            )}
                            {isExpired && (
                              <Badge className="border-red-600/30 bg-red-600/20 text-red-400">
                                Expired
                              </Badge>
                            )}
                          </div>

                          <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                            {announcement.message}
                          </p>

                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            <span>
                              Created: {new Date(announcement.createdAt).toLocaleDateString()}
                            </span>
                            {announcement.endDate && (
                              <span>
                                Ends: {new Date(announcement.endDate).toLocaleDateString()}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {announcement.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <X className="h-3 w-3" /> {announcement.dismissals}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex items-center gap-2">
                        <Switch
                          checked={announcement.active}
                          onCheckedChange={() => handleToggleActive(announcement)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(announcement)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(announcement.id)}
                          className="text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl border-gray-800 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingAnnouncement
                ? "Update the announcement details below"
                : "Create a new announcement to communicate with your users"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
                className="border-gray-700 bg-gray-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Announcement message..."
                className="min-h-[100px] border-gray-700 bg-gray-800 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800">
                    {Object.entries(typeConfig).map(([value, description]) => (
                      <SelectItem key={value} value={value} className="text-white">
                        <div>
                          <span className="capitalize">{value}</span>
                          <span className="ml-2 text-xs text-gray-500">- {description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800">
                    <SelectItem value="info" className="text-white">
                      Info
                    </SelectItem>
                    <SelectItem value="success" className="text-white">
                      Success
                    </SelectItem>
                    <SelectItem value="warning" className="text-white">
                      Warning
                    </SelectItem>
                    <SelectItem value="critical" className="text-white">
                      Critical
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, targetAudience: value })
                  }
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800">
                    <SelectItem value="all" className="text-white">
                      All Users
                    </SelectItem>
                    <SelectItem value="free" className="text-white">
                      Free Users Only
                    </SelectItem>
                    <SelectItem value="pro" className="text-white">
                      Pro Users Only
                    </SelectItem>
                    <SelectItem value="enterprise" className="text-white">
                      Enterprise Only
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dismissible</Label>
                <div className="flex h-10 items-center gap-2">
                  <Switch
                    checked={formData.dismissible}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, dismissible: checked })
                    }
                  />
                  <span className="text-sm text-gray-400">
                    {formData.dismissible ? "Users can dismiss" : "Cannot be dismissed"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label>End Date & Time (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Call to Action (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={formData.cta?.text || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cta: { ...formData.cta!, text: e.target.value },
                    })
                  }
                  placeholder="Button text"
                  className="border-gray-700 bg-gray-800 text-white"
                />
                <Input
                  value={formData.cta?.url || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cta: { ...formData.cta!, url: e.target.value },
                    })
                  }
                  placeholder="Button URL"
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label>Active immediately</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-gray-700 text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.title || !formData.message}
              className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
            >
              {saving ? "Saving..." : editingAnnouncement ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
