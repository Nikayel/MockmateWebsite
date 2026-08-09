"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
} from "@/components/ui/dialog"
import {
  Megaphone,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  Bell,
  Users,
  Calendar,
  ExternalLink,
  MoreHorizontal,
  Power,
  PowerOff,
} from "lucide-react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"

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
  info: {
    icon: Info,
    label: "Info",
    color: "bg-accent/10 text-accent border-accent/20",
    iconColor: "text-accent",
    badgeClass: "bg-accent/10 text-accent border-accent/20",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    iconColor: "text-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  critical: {
    icon: AlertCircle,
    label: "Critical",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    iconColor: "text-destructive",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
  },
  success: {
    icon: CheckCircle,
    label: "Success",
    color: "bg-neural/10 text-neural border-neural/20",
    iconColor: "text-neural",
    badgeClass: "bg-neural/10 text-neural border-neural/20",
  },
}

// "page" is deliberately absent: the type exists in the schema but nothing on
// the client renders it, so offering it here published announcements nobody
// could ever see.
const typeConfig = {
  banner: { label: "Banner", description: "Top banner across all pages" },
  modal: { label: "Modal", description: "Popup dialog on first visit" },
  toast: { label: "Toast", description: "Temporary notification" },
}

const audienceConfig = {
  all: { label: "All Users", icon: Users },
  free: { label: "Free", icon: Users },
  pro: { label: "Pro", icon: Users },
  enterprise: { label: "Enterprise", icon: Users },
  specific: { label: "Specific", icon: Users },
}

/**
 * Format a date for a `datetime-local` input, which expects LOCAL wall-clock
 * time with no zone. The old `toISOString().slice(0, 16)` put UTC digits in a
 * local field, so a "starts now" announcement was actually scheduled hours into
 * the future (7h for a US Pacific admin) and silently never showed.
 */
function toDatetimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

/**
 * Convert a `datetime-local` value back to an unambiguous ISO instant before it
 * leaves the browser. Sending the raw zoneless string let the server (UTC on
 * Vercel) reinterpret it, shifting every date on each edit round-trip.
 */
function datetimeLocalToISO(value: string): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

interface AnnouncementFormData {
  title: string
  message: string
  type: "banner" | "modal" | "toast" | "page"
  priority: "info" | "warning" | "critical" | "success"
  targetAudience: "all" | "free" | "pro" | "enterprise" | "specific"
  targetUserIds: string
  startDate: string
  endDate: string
  dismissible: boolean
  active: boolean
  cta: { text: string; url: string }
}

// A function rather than a module constant so "starts now" means now at the
// moment the dialog opens, not whenever the page bundle was first evaluated.
function makeDefaultFormData(): AnnouncementFormData {
  return {
    title: "",
    message: "",
    type: "banner",
    priority: "info",
    targetAudience: "all",
    targetUserIds: "",
    startDate: toDatetimeLocalValue(new Date()),
    endDate: "",
    dismissible: true,
    active: true,
    cta: { text: "", url: "" },
  }
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
  const [formData, setFormData] = useState<AnnouncementFormData>(makeDefaultFormData)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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
    setFormData(makeDefaultFormData())
    setDialogOpen(true)
  }

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title || "",
      message: announcement.message || "",
      type: announcement.type || "banner",
      priority: announcement.priority || "info",
      targetAudience: announcement.targetAudience || "all",
      targetUserIds: (announcement as any).targetUserIds?.join(", ") || "",
      // Stored dates are ISO instants; render them as the admin's local time.
      startDate: announcement.startDate
        ? toDatetimeLocalValue(new Date(announcement.startDate))
        : "",
      endDate: announcement.endDate ? toDatetimeLocalValue(new Date(announcement.endDate)) : "",
      dismissible: announcement.dismissible ?? true,
      active: announcement.active ?? true,
      cta: announcement.cta || { text: "", url: "" },
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!firebaseUser) return

    const ctaText = formData.cta.text.trim()
    const ctaUrl = formData.cta.url.trim()
    if ((ctaText && !ctaUrl) || (!ctaText && ctaUrl)) {
      toast.error("A call to action needs both button text and a URL.")
      return
    }

    const startISO = datetimeLocalToISO(formData.startDate)
    const endISO = datetimeLocalToISO(formData.endDate)
    if (endISO && startISO && endISO <= startISO) {
      toast.error("The end date must be after the start date.")
      return
    }

    if (formData.targetAudience === "specific" && !formData.targetUserIds.trim()) {
      toast.error("A specific-audience announcement needs at least one user ID.")
      return
    }

    setSaving(true)
    try {
      const token = await firebaseUser.getIdToken()
      const method = editingAnnouncement ? "PUT" : "POST"

      const body: any = editingAnnouncement
        ? { id: editingAnnouncement.id, ...formData }
        : { ...formData }

      // Send unambiguous ISO instants: the raw datetime-local string would be
      // reinterpreted in the server's timezone.
      body.startDate = startISO ?? undefined
      body.endDate = endISO

      if (formData.targetAudience === "specific" && formData.targetUserIds) {
        body.targetUserIds = formData.targetUserIds
          .split(",")
          .map((id: string) => id.trim())
          .filter((id: string) => id.length > 0)
      } else {
        delete body.targetUserIds
      }

      body.cta = ctaText && ctaUrl ? { text: ctaText, url: ctaUrl } : null

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
        toast.success(editingAnnouncement ? "Announcement updated" : "Announcement created")
        loadAnnouncements(true)
      } else {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || "Failed to save the announcement.")
      }
    } catch (error) {
      logger.error("Error saving announcement", { error })
      toast.error("Failed to save the announcement.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setDeleteConfirmId(null)
        toast.success("Announcement deleted")
        loadAnnouncements(true)
      } else {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || "Failed to delete the announcement.")
      }
    } catch (error) {
      logger.error("Error deleting announcement", { error })
      toast.error("Failed to delete the announcement.")
    }
  }

  const handleToggleActive = async (announcement: Announcement) => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/announcements", {
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

      if (response.ok) {
        toast.success(announcement.active ? "Announcement deactivated" : "Announcement activated")
      } else {
        const data = await response.json().catch(() => null)
        toast.error(data?.error || "Failed to update the announcement.")
      }
      loadAnnouncements(true)
    } catch (error) {
      logger.error("Error toggling announcement", { error })
      toast.error("Failed to update the announcement.")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="border-muted h-12 w-12 rounded-full border-2" />
            <div className="border-accent absolute inset-0 h-12 w-12 animate-spin rounded-full border-t-2" />
          </div>
          <p className="text-muted-foreground text-sm">Loading announcements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Announcements
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage system announcements and user notifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => loadAnnouncements(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="h-9"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>

          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 h-9"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-accent/10 flex h-11 w-11 items-center justify-center rounded-xl">
                <Megaphone className="text-accent h-5 w-5" />
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold tracking-tight">{stats.total}</p>
                <p className="text-muted-foreground text-xs">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="bg-neural/10 flex h-11 w-11 items-center justify-center rounded-xl">
                <Bell className="text-neural h-5 w-5" />
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold tracking-tight">{stats.active}</p>
                <p className="text-muted-foreground text-xs">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
                <Eye className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold tracking-tight">
                  {formatNumber(stats.totalViews)}
                </p>
                <p className="text-muted-foreground text-xs">Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
                <X className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold tracking-tight">
                  {formatNumber(stats.totalDismissals)}
                </p>
                <p className="text-muted-foreground text-xs">Dismissals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <Card className="border-border bg-card">
        <CardHeader className="border-border border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Megaphone className="text-accent h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">All Announcements</CardTitle>
              <CardDescription className="text-xs">
                {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent
          className={cn("p-0 transition-opacity", refreshing && "pointer-events-none opacity-50")}
          aria-busy={refreshing}
        >
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-muted/50 flex h-14 w-14 items-center justify-center rounded-2xl">
                <Megaphone className="text-muted-foreground h-7 w-7" />
              </div>
              <p className="text-foreground mt-4 text-sm font-medium">No announcements yet</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Create your first announcement to communicate with users
              </p>
              <Button onClick={handleOpenCreate} variant="outline" size="sm" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Announcement
              </Button>
            </div>
          ) : (
            <div className="divide-border divide-y">
              {announcements.map((announcement) => {
                const PriorityIcon = priorityConfig[announcement.priority].icon
                const isExpired =
                  announcement.endDate && new Date(announcement.endDate) < new Date()
                const isInactive = !announcement.active || isExpired

                return (
                  <div
                    key={announcement.id}
                    className={cn(
                      "group hover:bg-muted/30 flex items-start gap-4 p-4 transition-colors",
                      isInactive && "opacity-60"
                    )}
                  >
                    {/* Priority Icon */}
                    <div
                      className={cn(
                        "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
                        priorityConfig[announcement.priority].color
                      )}
                    >
                      <PriorityIcon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-foreground font-medium">{announcement.title}</h3>

                        {/* Status badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] tracking-wide uppercase",
                              priorityConfig[announcement.priority].badgeClass
                            )}
                          >
                            {announcement.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-border text-muted-foreground text-[10px] tracking-wide uppercase"
                          >
                            {announcement.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-purple-500/20 bg-purple-500/10 text-[10px] tracking-wide text-purple-400 uppercase"
                          >
                            <Users className="mr-1 h-2.5 w-2.5" />
                            {announcement.targetAudience}
                          </Badge>

                          {!announcement.active && (
                            <Badge
                              variant="outline"
                              className="border-border text-muted-foreground bg-muted/50 text-[10px] tracking-wide uppercase"
                            >
                              <PowerOff className="mr-1 h-2.5 w-2.5" />
                              Inactive
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge
                              variant="outline"
                              className="border-destructive/20 text-destructive bg-destructive/10 text-[10px] tracking-wide uppercase"
                            >
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {announcement.message}
                      </p>

                      {/* Meta info */}
                      <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(announcement.createdAt)}
                        </span>
                        {announcement.endDate && (
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/60">Ends:</span>
                            {formatDate(announcement.endDate)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(announcement.views)}
                        </span>
                        <span className="flex items-center gap-1">
                          <X className="h-3 w-3" />
                          {formatNumber(announcement.dismissals)}
                        </span>
                        {announcement.cta && (
                          <span className="text-accent flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {announcement.cta.text}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions - always visible on touch, revealed on hover with a pointer */}
                    <div className="flex items-center gap-1 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          announcement.active
                            ? "text-neural hover:text-neural hover:bg-neural/10"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => handleToggleActive(announcement)}
                        title={announcement.active ? "Deactivate" : "Activate"}
                      >
                        {announcement.active ? (
                          <Power className="h-4 w-4" />
                        ) : (
                          <PowerOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-8 w-8"
                        onClick={() => handleOpenEdit(announcement)}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        onClick={() => setDeleteConfirmId(announcement.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="border-border bg-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {editingAnnouncement
                ? "Update the announcement details below"
                : "Create a new announcement to communicate with your users"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
                className="h-10"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Message</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Announcement message..."
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Type and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex flex-col">
                          <span className="font-medium capitalize">{config.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {config.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <config.icon className={cn("h-4 w-4", config.iconColor)} />
                          <span className="capitalize">{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Audience and Dismissible */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Target Audience</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, targetAudience: value })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(audienceConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <config.icon className="text-muted-foreground h-4 w-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Dismissible</Label>
                <div className="border-input bg-background flex h-10 items-center gap-3 rounded-md border px-3">
                  <Switch
                    checked={formData.dismissible}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, dismissible: checked })
                    }
                  />
                  <span className="text-muted-foreground text-sm">
                    {formData.dismissible ? "Users can dismiss" : "Cannot be dismissed"}
                  </span>
                </div>
              </div>
            </div>

            {/* Target User IDs (conditional) */}
            {formData.targetAudience === "specific" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Target User IDs</Label>
                <Textarea
                  value={formData.targetUserIds}
                  onChange={(e) => setFormData({ ...formData, targetUserIds: e.target.value })}
                  placeholder="Enter user IDs separated by commas (e.g., user123, user456)"
                  className="min-h-[80px] resize-none"
                />
                <p className="text-muted-foreground text-xs">
                  Comma-separated list of Firebase user IDs to target
                </p>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">End Date & Time (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Call to Action (Optional)</Label>
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
                  className="h-10"
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
                  className="h-10"
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="border-border bg-muted/30 flex items-center gap-3 rounded-lg border p-4">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <div>
                <Label className="text-sm font-medium">Active immediately</Label>
                <p className="text-muted-foreground text-xs">
                  When enabled, the announcement will be visible to users right away
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.title || !formData.message}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingAnnouncement ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="border-border bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Delete Announcement</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Are you sure you want to delete this announcement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
