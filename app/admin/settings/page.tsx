"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  Settings,
  DollarSign,
  Cpu,
  Shield,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  User,
  Calendar,
  Clock,
} from "lucide-react"
import { getAllPricingTiers, getProviderCostInfo, AI_BUDGET_CAPS } from "@/lib/pricing"
import { PageHeader, SettingsCardSkeleton } from "@/components/admin/shared"
import { logger } from "@/lib/logger"

interface AdminUser {
  userId: string
  email: string
  role: "super_admin" | "admin" | "analyst" | "support"
  grantedBy: string
  grantedAt: string | null
  lastAccess: string | null
  active: boolean
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: {
    label: "Super Admin",
    color: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  },
  admin: { label: "Admin", color: "bg-blue-600/20 text-blue-400 border-blue-600/30" },
  analyst: { label: "Analyst", color: "bg-green-600/20 text-green-400 border-green-600/30" },
  support: { label: "Support", color: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30" },
}

export default function AdminSettingsPage() {
  const { firebaseUser } = useAuth()
  const [activeTab, setActiveTab] = useState<"pricing" | "ai" | "admins">("admins")
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Add admin form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [newAdminUserId, setNewAdminUserId] = useState("")
  const [newAdminRole, setNewAdminRole] = useState<string>("analyst")
  const [addingAdmin, setAddingAdmin] = useState(false)

  // Revoke dialog
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [adminToRevoke, setAdminToRevoke] = useState<AdminUser | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Alerts
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const pricingTiers = getAllPricingTiers()
  const providerCosts = getProviderCostInfo()

  const loadAdmins = useCallback(
    async (showRefresh = false) => {
      if (!firebaseUser) return

      if (showRefresh) setRefreshing(true)

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/admin/admins", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setAdmins(data.admins)
          }
        } else if (response.status === 403) {
          // Not super_admin, just show env admin info
          setAdmins([])
        }
      } catch (error) {
        logger.error("Error loading admins", { error })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser]
  )

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  const handleAddAdmin = async () => {
    if (!firebaseUser || !newAdminEmail || !newAdminUserId) return

    setAddingAdmin(true)
    setErrorMessage(null)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: newAdminUserId,
          email: newAdminEmail,
          role: newAdminRole,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccessMessage(`Admin role granted to ${newAdminEmail}`)
        setNewAdminEmail("")
        setNewAdminUserId("")
        setNewAdminRole("analyst")
        setShowAddForm(false)
        await loadAdmins()
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setErrorMessage(data.error || "Failed to add admin")
      }
    } catch (error) {
      logger.error("Error adding admin", { error })
      setErrorMessage("Failed to add admin")
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleRevokeAdmin = async () => {
    if (!firebaseUser || !adminToRevoke) return

    setRevoking(true)
    setErrorMessage(null)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/admins?userId=${adminToRevoke.userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccessMessage(`Admin access revoked for ${adminToRevoke.email}`)
        setRevokeDialogOpen(false)
        setAdminToRevoke(null)
        await loadAdmins()
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setErrorMessage(data.error || "Failed to revoke admin")
      }
    } catch (error) {
      logger.error("Error revoking admin", { error })
      setErrorMessage("Failed to revoke admin")
    } finally {
      setRevoking(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Settings" subtitle="Platform configuration and admin management" />
        <div className="flex gap-2 border-b border-gray-800 pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-md bg-gray-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6">
          <SettingsCardSkeleton />
          <SettingsCardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Settings"
        subtitle="Platform configuration and admin management"
        onRefresh={() => loadAdmins(true)}
        refreshing={refreshing}
      />

      {/* Alerts */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-900/20 p-3">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-sm text-green-300">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 p-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-4">
        {[
          { id: "admins", label: "Admin Users", icon: Shield },
          { id: "pricing", label: "Pricing", icon: DollarSign },
          { id: "ai", label: "AI Providers", icon: Cpu },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={
              activeTab === tab.id
                ? "bg-[#c4703f] text-black hover:bg-[#c4703f]/80"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }
          >
            <tab.icon className="mr-2 h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Admin Users Tab */}
      {activeTab === "admins" && (
        <div className="space-y-6">
          {/* Admin List */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="h-5 w-5 text-[#c4703f]" />
                    Admin Users
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage who has access to the admin dashboard
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-[#c4703f] text-black hover:bg-[#c4703f]/80"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Admin
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Admin Form */}
              {showAddForm && (
                <div className="space-y-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <h4 className="text-sm font-medium text-white">Add New Admin</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label
                        htmlFor="new-admin-user-id"
                        className="mb-1 block text-xs text-gray-400"
                      >
                        User ID
                      </label>
                      <Input
                        id="new-admin-user-id"
                        placeholder="Firebase User ID"
                        value={newAdminUserId}
                        onChange={(e) => setNewAdminUserId(e.target.value)}
                        className="border-gray-700 bg-gray-800 text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-admin-email" className="mb-1 block text-xs text-gray-400">
                        Email
                      </label>
                      <Input
                        id="new-admin-email"
                        placeholder="admin@example.com"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        className="border-gray-700 bg-gray-800 text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-admin-role" className="mb-1 block text-xs text-gray-400">
                        Role
                      </label>
                      <Select value={newAdminRole} onValueChange={setNewAdminRole}>
                        <SelectTrigger
                          id="new-admin-role"
                          className="border-gray-700 bg-gray-800 text-white"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-gray-700 bg-gray-800">
                          <SelectItem value="admin">Admin - Full access</SelectItem>
                          <SelectItem value="analyst">Analyst - Read-only analytics</SelectItem>
                          <SelectItem value="support">Support - User management</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      className="border-gray-700 text-gray-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddAdmin}
                      disabled={addingAdmin || !newAdminEmail || !newAdminUserId}
                      className="bg-[#c4703f] text-black hover:bg-[#c4703f]/80"
                    >
                      {addingAdmin ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Add Admin
                    </Button>
                  </div>
                </div>
              )}

              {/* Admin List */}
              <div className="space-y-2">
                {admins.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <Shield className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No additional admins configured.</p>
                    <p className="mt-1 text-sm">Only the environment admin has access.</p>
                  </div>
                ) : (
                  admins.map((admin) => (
                    <div
                      key={admin.userId}
                      className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 transition-colors hover:border-gray-600/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#c4703f] to-[#3fb883]">
                          <User className="h-5 w-5 text-black" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{admin.email}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                            <span className="font-mono">{admin.userId.substring(0, 12)}...</span>
                            {admin.lastAccess && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last: {new Date(admin.lastAccess).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={ROLE_LABELS[admin.role]?.color || "bg-gray-600"}>
                          {ROLE_LABELS[admin.role]?.label || admin.role}
                        </Badge>
                        {admin.role !== "super_admin" && admin.grantedBy !== "system" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdminToRevoke(admin)
                              setRevokeDialogOpen(true)
                            }}
                            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {admin.grantedBy === "system" && (
                          <span className="text-xs text-gray-500">Environment</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Permissions Matrix */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-white">Permission Matrix</CardTitle>
              <CardDescription className="text-gray-400">What each role can access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-gray-400">Permission</th>
                      <th className="px-4 py-3 text-center text-purple-400">Super Admin</th>
                      <th className="px-4 py-3 text-center text-blue-400">Admin</th>
                      <th className="px-4 py-3 text-center text-green-400">Analyst</th>
                      <th className="px-4 py-3 text-center text-yellow-400">Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "View Analytics", roles: [true, true, true, false] },
                      { name: "View Revenue", roles: [true, true, true, false] },
                      { name: "Export Data", roles: [true, true, true, false] },
                      { name: "View Users", roles: [true, true, true, true] },
                      { name: "Manage Users", roles: [true, true, false, true] },
                      { name: "View AI Usage", roles: [true, true, true, false] },
                      { name: "Manage Budgets", roles: [true, true, false, false] },
                      { name: "View Errors", roles: [true, true, true, true] },
                      { name: "Manage Settings", roles: [true, true, false, false] },
                      { name: "Manage Admins", roles: [true, false, false, false] },
                    ].map((perm) => (
                      <tr
                        key={perm.name}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30"
                      >
                        <td className="px-4 py-3 text-white">{perm.name}</td>
                        {perm.roles.map((has, i) => (
                          <td key={i} className="px-4 py-3 text-center">
                            {has ? (
                              <CheckCircle className="mx-auto h-4 w-4 text-green-400" />
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <div className="space-y-6">
          {/* Info Banner */}
          <Card className="border-blue-500/30 bg-blue-900/20">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
              <div>
                <p className="text-sm text-blue-300">
                  Pricing is currently managed in{" "}
                  <code className="rounded bg-blue-900/30 px-1.5 py-0.5 text-[#c4703f]">
                    lib/config.ts
                  </code>
                  . Changes require a code deployment.
                </p>
                <p className="mt-1 text-xs text-blue-400/70">
                  Dynamic pricing configuration via Firestore is planned for a future release.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Tiers */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.tier}
                className={`border-gray-800 bg-gray-900/50 ${
                  tier.tier === "pro" ? "ring-2 ring-yellow-500/30" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{tier.name}</CardTitle>
                    {tier.tier === "pro" && (
                      <Badge className="border-yellow-600/30 bg-yellow-600/20 text-yellow-400">
                        Popular
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-4xl font-bold text-white">${tier.monthlyPrice}</span>
                    <span className="text-gray-400">/month</span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-gray-800 py-2">
                      <span className="text-gray-400">Annual Price</span>
                      <span className="font-medium text-white">${tier.annualPrice}/year</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800 py-2">
                      <span className="text-gray-400">AI Budget Cap</span>
                      <span className="font-medium text-[#c4703f]">${tier.aiBudgetCap}/month</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Sessions/Month</span>
                      <span className="font-medium text-white">
                        {tier.sessionsPerMonth ?? "Unlimited"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Budget Caps Summary */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Cpu className="h-5 w-5 text-[#c4703f]" />
                AI Budget Caps
              </CardTitle>
              <CardDescription className="text-gray-400">
                Monthly AI API spending limits per subscription tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(AI_BUDGET_CAPS).map(([tier, cap]) => (
                  <div
                    key={tier}
                    className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-6 text-center"
                  >
                    <div className="text-3xl font-bold text-white">${cap}</div>
                    <div className="mt-1 text-sm text-gray-400 capitalize">{tier}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Providers Tab */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          {/* Provider Costs */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Cpu className="h-5 w-5 text-[#c4703f]" />
                AI Provider Costs
              </CardTitle>
              <CardDescription className="text-gray-400">
                Cost per 1,000 tokens (input + output averaged)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {providerCosts.map((provider) => (
                  <div
                    key={provider.provider}
                    className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#c4703f]/20 to-[#3fb883]/20">
                        <Cpu className="h-5 w-5 text-[#c4703f]" />
                      </div>
                      <div>
                        <span className="font-medium text-white">{provider.displayName}</span>
                        <span className="block text-sm text-gray-500">{provider.provider}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-lg text-[#3fb883]">
                        ${provider.costPer1kTokens.toFixed(6)}
                      </span>
                      <span className="block text-sm text-gray-500">/1K tokens</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Provider Status */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-white">Provider Status</CardTitle>
              <CardDescription className="text-gray-400">
                Active AI providers in your environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {["Gemini", "Claude", "OpenAI", "Deepseek"].map((provider) => (
                  <div
                    key={provider}
                    className="flex items-center gap-3 rounded-lg border border-gray-700/50 bg-gray-800/30 p-4"
                  >
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                    <span className="text-white">{provider}</span>
                    <Badge className="ml-auto border-green-600/30 bg-green-600/20 text-xs text-green-400">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Environment Variables */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-white">Required Environment Variables</CardTitle>
              <CardDescription className="text-gray-400">
                API keys needed for AI providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { key: "GOOGLE_AI_API_KEY", provider: "Gemini" },
                  { key: "ANTHROPIC_API_KEY", provider: "Claude" },
                  { key: "OPENAI_API_KEY", provider: "OpenAI" },
                  { key: "DEEPSEEK_API_KEY", provider: "Deepseek" },
                ].map((env) => (
                  <div
                    key={env.key}
                    className="flex items-center justify-between rounded-lg bg-gray-800/30 p-3"
                  >
                    <code className="font-mono text-sm text-[#c4703f]">{env.key}</code>
                    <span className="text-sm text-gray-500">{env.provider}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revoke Admin Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent className="border-gray-800 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Revoke Admin Access</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to revoke admin access for{" "}
              <strong className="text-white">{adminToRevoke?.email}</strong>?
              <br />
              <br />
              They will no longer be able to access the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAdmin}
              disabled={revoking}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {revoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Access"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
