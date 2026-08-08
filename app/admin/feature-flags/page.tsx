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
import { Slider } from "@/components/ui/slider"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Flag,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Zap,
  FlaskConical,
  Shield,
  Power,
  Users,
  Percent,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { logger } from "@/lib/logger"

type FlagType = "release" | "experiment" | "ops" | "permission" | "kill_switch"
type FlagEnvironment = "all" | "production" | "staging" | "development"

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string
  enabled: boolean
  type: FlagType
  rolloutPercentage: number
  targetTiers: string[]
  environment: FlagEnvironment
  createdAt: string
  updatedAt: string
  expiresAt?: string
  /** Whether any code path reads this key. False means toggling it changes nothing. */
  wired: boolean
}

/**
 * Read a response from the flags API, turning a non-OK status or a
 * `{ success: false }` body into a thrown error carrying the server's message.
 *
 * Every call here used to ignore the response entirely: a 403 from a missing
 * permission and a 400 from a rejected field both looked exactly like success,
 * because the page reloaded the list and the row simply stayed as it was. An
 * operator flipping a kill switch had no way to tell "saved" from "refused".
 */
/**
 * How long a change takes to reach every running server. Mirrors
 * FLAG_CACHE_TTL_MS in lib/feature-flags.ts. An operator flipping a kill
 * switch mid-incident has to know this number, because the switch looks
 * instant here and is not instant in production.
 */
const PROPAGATION_NOTE =
  "Changes reach running servers within about 30 seconds. Other server instances keep serving the previous value until their own cache expires."

/**
 * Whether a toggle is consequential enough to confirm.
 *
 * Confirmed: any kill switch in either direction, and turning OFF a flag that
 * is currently on. Both take a working feature away from live users, and both
 * were previously one stray click on a switch with no undo and no prompt.
 * Turning a non-kill-switch flag on is not confirmed: it is the additive,
 * reversible direction.
 */
function toggleNeedsConfirmation(flag: FeatureFlag): boolean {
  return flag.type === "kill_switch" || flag.enabled
}

async function readFlagResponse<T>(response: Response): Promise<T> {
  let payload: (T & { success?: boolean; error?: string }) | null = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error || `Request failed with status ${response.status}. Nothing was changed.`
    )
  }

  return payload as T
}

const typeConfig = {
  release: { icon: Zap, color: "bg-blue-500/20 text-blue-400", label: "Release" },
  experiment: {
    icon: FlaskConical,
    color: "bg-purple-500/20 text-purple-400",
    label: "Experiment",
  },
  ops: { icon: Shield, color: "bg-yellow-500/20 text-yellow-400", label: "Ops" },
  permission: { icon: Users, color: "bg-green-500/20 text-green-400", label: "Permission" },
  kill_switch: { icon: Power, color: "bg-red-500/20 text-red-400", label: "Kill Switch" },
}

const defaultFlag: {
  key: string
  name: string
  description: string
  enabled: boolean
  type: FlagType
  rolloutPercentage: number
  targetTiers: string[]
  environment: FlagEnvironment
  expiresAt: string
} = {
  key: "",
  name: "",
  description: "",
  enabled: false,
  type: "release",
  rolloutPercentage: 100,
  targetTiers: [],
  environment: "all",
  expiresAt: "",
}

export default function FeatureFlagsPage() {
  const { firebaseUser } = useAuth()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [stats, setStats] = useState({ total: 0, enabled: 0, experiments: 0, killSwitches: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null)
  const [formData, setFormData] = useState(defaultFlag)
  /** The flag whose toggle is mid-flight, so only that row shows a spinner. */
  const [pendingFlagId, setPendingFlagId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  /** The flag awaiting confirmation, if the requested toggle needs one. */
  const [flagToConfirm, setFlagToConfirm] = useState<FeatureFlag | null>(null)

  const loadFlags = useCallback(
    async (showRefreshing = false) => {
      if (!firebaseUser) return
      if (showRefreshing) setRefreshing(true)

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/admin/feature-flags", {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await readFlagResponse<{
          flags: FeatureFlag[]
          stats: typeof stats
        }>(response)
        setFlags(data.flags)
        setStats(data.stats)
        setErrorMessage(null)
      } catch (error) {
        logger.error("Error loading feature flags", { error })
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load feature flags."
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser]
  )

  useEffect(() => {
    loadFlags()
  }, [loadFlags])

  const handleOpenCreate = () => {
    setEditingFlag(null)
    setFormData(defaultFlag)
    setDialogOpen(true)
  }

  const handleOpenEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag)
    setFormData({
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      type: flag.type,
      rolloutPercentage: flag.rolloutPercentage,
      targetTiers: flag.targetTiers,
      environment: flag.environment,
      expiresAt: flag.expiresAt?.split("T")[0] || "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!firebaseUser) return
    setSaving(true)
    setErrorMessage(null)

    try {
      const token = await firebaseUser.getIdToken()
      const method = editingFlag ? "PUT" : "POST"
      // `key` is immutable server-side, so an edit sends only what can change.
      // Sending it anyway is now a 400 rather than a silently ignored field.
      const { key: _immutableKey, ...mutable } = formData
      const body = editingFlag ? { id: editingFlag.id, ...mutable } : formData

      const response = await fetch("/api/admin/feature-flags", {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      await readFlagResponse(response)
      setDialogOpen(false)
      loadFlags(true)
    } catch (error) {
      logger.error("Error saving feature flag", { error })
      setErrorMessage(error instanceof Error ? error.message : "Could not save the flag.")
    } finally {
      setSaving(false)
    }
  }

  /** Apply a toggle. Callers decide whether it needed confirming first. */
  const applyToggle = async (flag: FeatureFlag) => {
    if (!firebaseUser) return
    setPendingFlagId(flag.id)
    setErrorMessage(null)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: flag.id, enabled: !flag.enabled }),
      })

      await readFlagResponse(response)
      await loadFlags(true)
    } catch (error) {
      logger.error("Error toggling flag", { error })
      setErrorMessage(
        error instanceof Error ? error.message : `Could not change ${flag.name}.`
      )
    } finally {
      setPendingFlagId(null)
    }
  }

  /** Route a toggle through confirmation when it takes something away from users. */
  const requestToggle = (flag: FeatureFlag) => {
    if (toggleNeedsConfirmation(flag)) {
      setFlagToConfirm(flag)
      return
    }
    void applyToggle(flag)
  }

  const confirmToggle = async () => {
    const flag = flagToConfirm
    setFlagToConfirm(null)
    if (flag) await applyToggle(flag)
  }

  const handleDelete = async (flag: FeatureFlag) => {
    if (!firebaseUser || !confirm(`Delete the flag "${flag.name}"?`)) return
    setPendingFlagId(flag.id)
    setErrorMessage(null)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/feature-flags?id=${flag.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      await readFlagResponse(response)
      await loadFlags(true)
    } catch (error) {
      logger.error("Error deleting flag", { error })
      setErrorMessage(error instanceof Error ? error.message : "Could not delete the flag.")
    } finally {
      setPendingFlagId(null)
    }
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
          <h1 className="font-heading text-3xl font-bold text-white">Feature Flags</h1>
          <p className="mt-1 text-gray-400">Control feature rollouts and experiments</p>
          <p className="mt-1 text-sm text-gray-500">{PROPAGATION_NOTE}</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadFlags(true)}
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
            className="bg-[#c4703f] text-black hover:bg-[#c4703f]/80"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Flag
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-900/20 p-3"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <span className="text-sm text-red-300">{errorMessage}</span>
          <Button
            onClick={() => setErrorMessage(null)}
            variant="ghost"
            size="sm"
            className="ml-auto text-red-400 hover:text-red-300"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#c4703f]/20 p-3">
                <Flag className="h-6 w-6 text-[#c4703f]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">Total Flags</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/20 p-3">
                <Zap className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.enabled}</p>
                <p className="text-sm text-gray-400">Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/20 p-3">
                <FlaskConical className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.experiments}</p>
                <p className="text-sm text-gray-400">Experiments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/20 p-3">
                <Power className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{stats.killSwitches}</p>
                <p className="text-sm text-gray-400">Kill Switches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flags List */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Flag className="h-5 w-5 text-[#c4703f]" />
            All Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <div className="py-12 text-center">
              <Flag className="mx-auto mb-4 h-12 w-12 text-gray-600" />
              <p className="text-gray-400">No feature flags yet</p>
              <Button onClick={handleOpenCreate} variant="outline" className="mt-4 border-gray-700">
                Create your first flag
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {flags.map((flag) => {
                const TypeIcon = typeConfig[flag.type].icon
                return (
                  <div
                    key={flag.id}
                    className={`rounded-lg border bg-gray-800/50 p-4 ${
                      flag.enabled ? "border-gray-700" : "border-gray-800 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-1 items-center gap-4">
                        <div
                          className={`rounded-lg p-2 ${typeConfig[flag.type].color.split(" ")[0]}`}
                        >
                          <TypeIcon
                            className={`h-5 w-5 ${typeConfig[flag.type].color.split(" ")[1]}`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-white">{flag.name}</h3>
                            <code className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                              {flag.key}
                            </code>
                            <Badge className={typeConfig[flag.type].color}>
                              {typeConfig[flag.type].label}
                            </Badge>
                            {flag.rolloutPercentage < 100 && (
                              <Badge className="bg-yellow-500/20 text-yellow-400">
                                <Percent className="mr-1 h-3 w-3" />
                                {flag.rolloutPercentage}%
                              </Badge>
                            )}
                          </div>
                          {flag.description && (
                            <p className="mt-1 text-sm text-gray-400">{flag.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {pendingFlagId === flag.id && (
                          <Loader2
                            className="h-4 w-4 animate-spin text-[#c4703f]"
                            aria-label={`Saving ${flag.name}`}
                          />
                        )}
                        <Switch
                          checked={flag.enabled}
                          disabled={pendingFlagId === flag.id}
                          onCheckedChange={() => requestToggle(flag)}
                          aria-label={`${flag.enabled ? "Disable" : "Enable"} ${flag.name}`}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(flag)}
                          className="text-gray-400 hover:text-white"
                          aria-label={`Edit ${flag.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pendingFlagId === flag.id}
                          onClick={() => handleDelete(flag)}
                          className="text-gray-400 hover:text-red-400"
                          aria-label={`Delete ${flag.name}`}
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

      {/* Confirm a toggle that takes a working feature away from live users */}
      <AlertDialog
        open={flagToConfirm !== null}
        onOpenChange={(open) => !open && setFlagToConfirm(null)}
      >
        <AlertDialogContent className="border-gray-800 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {flagToConfirm?.enabled ? "Turn off" : "Turn on"} {flagToConfirm?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-gray-400">
              <span className="block">
                {flagToConfirm?.type === "kill_switch"
                  ? "This is a kill switch. Flipping it changes what live users can do."
                  : "This flag is on. Turning it off removes the feature for live users."}
              </span>
              <span className="block">
                Key: <code className="text-[#c4703f]">{flagToConfirm?.key}</code>
              </span>
              {flagToConfirm && !flagToConfirm.wired && (
                <span className="block text-yellow-400">
                  No code reads this key, so this change will not affect anything.
                </span>
              )}
              <span className="block">{PROPAGATION_NOTE}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggle}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {flagToConfirm?.enabled ? "Turn off" : "Turn on"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl border-gray-800 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle>{editingFlag ? "Edit Flag" : "Create Flag"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure feature flag settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Key (unique identifier)</Label>
                <Input
                  value={formData.key}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      key: e.target.value.toLowerCase().replace(/\s/g, "_"),
                    })
                  }
                  placeholder="feature_name"
                  className="border-gray-700 bg-gray-800 font-mono text-white"
                  disabled={!!editingFlag}
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Feature Name"
                  className="border-gray-700 bg-gray-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this flag control?"
                className="border-gray-700 bg-gray-800 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as FlagType })}
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800">
                    <SelectItem value="release" className="text-white">
                      Release
                    </SelectItem>
                    <SelectItem value="experiment" className="text-white">
                      Experiment
                    </SelectItem>
                    <SelectItem value="ops" className="text-white">
                      Ops
                    </SelectItem>
                    <SelectItem value="permission" className="text-white">
                      Permission
                    </SelectItem>
                    <SelectItem value="kill_switch" className="text-white">
                      Kill Switch
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) => setFormData({ ...formData, environment: value as FlagEnvironment })}
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-800">
                    <SelectItem value="all" className="text-white">
                      All
                    </SelectItem>
                    <SelectItem value="production" className="text-white">
                      Production
                    </SelectItem>
                    <SelectItem value="staging" className="text-white">
                      Staging
                    </SelectItem>
                    <SelectItem value="development" className="text-white">
                      Development
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rollout Percentage: {formData.rolloutPercentage}%</Label>
              <Slider
                value={[formData.rolloutPercentage]}
                onValueChange={(value) => setFormData({ ...formData, rolloutPercentage: value[0] })}
                max={100}
                step={5}
                className="py-4"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label>Enabled</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.key || !formData.name}
              className="bg-[#c4703f] text-black hover:bg-[#c4703f]/80"
            >
              {saving ? "Saving..." : editingFlag ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
