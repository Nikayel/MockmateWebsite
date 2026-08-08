"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { MetricCard, TimeSeriesChart, DistributionChart } from "@/components/admin/charts"
import {
  PageHeader,
  MetricsGridSkeleton,
  ChartSkeleton,
  UserListSkeleton,
} from "@/components/admin/shared"
import { UserProfileDrawer } from "@/components/admin/UserProfileDrawer"
import { Users, UserPlus, Crown, Search, RefreshCw, Trash2, X, Eye, Loader2 } from "lucide-react"
import { logger } from "@/lib/logger"

interface UserProfile {
  id: string
  email: string
  full_name?: string
  auth_provider?: string
  subscription_tier: string
  subscription_status?: string
  created_at: string
  updated_at?: string
  onboarding_completed?: boolean
  stripe_customer_id?: string | null
  // Computed server-side from the non-public protected-admin list (DISCLOSE-1).
  is_protected?: boolean
}

export default function UsersPage() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [timeRange, setTimeRange] = useState("30d")
  /**
   * What the box shows, updated on every keystroke so typing stays responsive.
   */
  const [searchInput, setSearchInput] = useState("")
  /**
   * What the server is actually asked for, updated only once typing pauses.
   *
   * These were a single value, and it was a fetch dependency, so every character
   * fired a request. The route behind it scans up to 5000 accounts and issues one
   * profile query per 30 of them, so typing an eight-character email cost eight
   * full scans and well over a thousand Firestore reads, of which only the last
   * result was ever rendered.
   */
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      setAuthToken(token) // Store token for profile drawer
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMetrics(data.metrics)
        }
      }
    } catch (error) {
      logger.error("Error loading user data", { error, timeRange })
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, timeRange])

  const loadUsers = useCallback(async () => {
    if (!firebaseUser) return

    setUsersLoading(true)
    try {
      const token = await firebaseUser.getIdToken()
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      })
      if (searchQuery) {
        params.append("search", searchQuery)
      }

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUsers(data.users)
          setTotalPages(data.pagination.totalPages)
        }
      }
    } catch (error) {
      logger.error("Error loading users list", { error, search: searchQuery })
    } finally {
      setUsersLoading(false)
    }
  }, [firebaseUser, page, searchQuery])

  // Settle the search term before asking the server for it. 350ms is below the
  // threshold where a pause feels like lag and above a fast typist's gap between
  // keystrokes, so a burst of typing produces one query rather than one per letter.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleDelete = async () => {
    if (!userToDelete || !firebaseUser) return

    setDeleting(true)
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      })

      if (response.ok) {
        // Reload users and metrics
        await loadUsers()
        await loadData()
        setDeleteDialogOpen(false)
        setUserToDelete(null)
      } else {
        const data = await response.json()
        alert(`Failed to delete user: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      logger.error("Error deleting user", { error, userId: userToDelete?.id })
      alert("Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Users" subtitle="User management and analytics" />
        <MetricsGridSkeleton count={4} />
        <ChartSkeleton height={280} />
        <UserListSkeleton rows={8} />
      </div>
    )
  }

  const tierDistribution = metrics
    ? [
        { name: "Free", value: metrics.users.byTier.free, color: "#6B7280" },
        { name: "Pro", value: metrics.users.byTier.pro, color: "#FBBF24" },
        { name: "Enterprise", value: metrics.users.byTier.enterprise, color: "#A855F7" },
      ]
    : []

  const conversionRate =
    metrics && metrics.users.total > 0
      ? ((metrics.users.byTier.pro / metrics.users.total) * 100).toFixed(1)
      : "0"

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Users"
        subtitle="User management and analytics"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={loadData}
      />

      {/* Key Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={metrics.users.total}
              icon={Users}
              sparklineData={metrics.timeSeries?.users.slice(-7).map((u: any) => u.total)}
              sparklineColor="#c4703f"
            />
            <MetricCard
              title="Pro Users"
              value={metrics.users.byTier.pro}
              subtitle={`${conversionRate}% of total`}
              icon={Crown}
              iconColor="text-yellow-400"
              valueColor="text-yellow-400"
            />
            <MetricCard title="Free Users" value={metrics.users.byTier.free} icon={UserPlus} />
            <MetricCard
              title="Enterprise"
              value={metrics.users.byTier.enterprise}
              icon={Users}
              iconColor="text-purple-400"
              valueColor="text-purple-400"
            />
          </div>

          {/* User Growth Chart */}
          {metrics.timeSeries?.users && (
            <TimeSeriesChart
              title="User Growth"
              subtitle="Total users over time"
              data={metrics.timeSeries.users}
              series={[
                { key: "free", name: "Free", color: "#6B7280" },
                { key: "pro", name: "Pro", color: "#FBBF24" },
                { key: "enterprise", name: "Enterprise", color: "#A855F7" },
              ]}
              stacked
              icon={Users}
            />
          )}

          {/* Distribution */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DistributionChart
              title="User Distribution"
              data={tierDistribution}
              type="pie"
              icon={Users}
            />

            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="text-white">Tier Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { tier: "Free", count: metrics.users.byTier.free, color: "gray" },
                  { tier: "Pro", count: metrics.users.byTier.pro, color: "yellow" },
                  { tier: "Enterprise", count: metrics.users.byTier.enterprise, color: "purple" },
                ].map((item) => (
                  <div key={item.tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          item.color === "yellow"
                            ? "border-yellow-600/30 bg-yellow-600/20 text-yellow-400"
                            : item.color === "purple"
                              ? "border-purple-600/30 bg-purple-600/20 text-purple-400"
                              : "border-gray-600/30 bg-gray-600/20 text-gray-400"
                        }
                      >
                        {item.tier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-white">{item.count}</span>
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-700">
                        <div
                          className={`h-full rounded-full ${
                            item.color === "yellow"
                              ? "bg-yellow-400"
                              : item.color === "purple"
                                ? "bg-purple-400"
                                : "bg-gray-400"
                          }`}
                          style={{
                            width: `${metrics.users.total > 0 ? (item.count / metrics.users.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-sm text-gray-500">
                        {metrics.users.total > 0
                          ? ((item.count / metrics.users.total) * 100).toFixed(0)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* User List */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">All Users</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Search users..."
                  aria-label="Search users by email or ID"
                  value={searchInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearchInput(e.target.value)
                  }}
                  className="w-64 border-gray-700 bg-gray-800 pl-10 text-white"
                />
              </div>
              <Button
                onClick={loadUsers}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-400 hover:text-white"
                disabled={usersLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${usersLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#c4703f]"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-gray-400">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Tier</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: UserProfile) => {
                    const protectedUser = !!user.is_protected
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30"
                      >
                        <td className="px-4 py-3">
                          <div className="text-white">{user.email}</div>
                          <div className="font-mono text-xs text-gray-500">
                            {user.id.substring(0, 20)}...
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{user.full_name || "-"}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              user.auth_provider === "github"
                                ? "border-gray-600/30 bg-gray-600/20 text-gray-300"
                                : user.auth_provider === "google"
                                  ? "border-blue-600/30 bg-blue-600/20 text-blue-300"
                                  : "border-gray-600/30 bg-gray-600/20 text-gray-400"
                            }
                          >
                            {user.auth_provider || "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              user.subscription_tier === "pro"
                                ? "border-yellow-600/30 bg-yellow-600/20 text-yellow-400"
                                : user.subscription_tier === "enterprise"
                                  ? "border-purple-600/30 bg-purple-600/20 text-purple-400"
                                  : "border-gray-600/30 bg-gray-600/20 text-gray-400"
                            }
                          >
                            {user.subscription_tier || "free"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {protectedUser ? (
                            <Badge className="border-green-600/30 bg-green-600/20 text-green-400">
                              Protected
                            </Badge>
                          ) : (
                            <Badge className="border-gray-600/30 bg-gray-600/20 text-gray-400">
                              {user.subscription_status || "none"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUserId(user.id)
                                setProfileDrawerOpen(true)
                              }}
                              className="text-[#c4703f] hover:bg-[#c4703f]/10 hover:text-[#c4703f]/80"
                              title="View Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {protectedUser ? (
                              <span className="ml-2 text-sm text-gray-500">Protected</span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setUserToDelete(user)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
                  <div className="text-sm text-gray-400">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-gray-800 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete{" "}
              <strong className="text-white">{userToDelete?.email}</strong>?
              <br />
              <br />
              This will permanently delete:
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>User profile and all Firestore data</li>
                <li>All interview sessions</li>
                <li>All learning progress and mastery data</li>
                <li>All analytics and usage data</li>
                <li>Firebase Auth account</li>
                <li>Pinecone vectors (if configured)</li>
              </ul>
              <br />
              <strong className="text-red-400">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Profile Drawer */}
      <UserProfileDrawer
        isOpen={profileDrawerOpen}
        onClose={() => {
          setProfileDrawerOpen(false)
          setSelectedUserId(null)
        }}
        userId={selectedUserId}
        token={authToken}
      />
    </div>
  )
}
