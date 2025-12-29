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
import { Users, UserPlus, Crown, Search, RefreshCw, Trash2, X } from "lucide-react"

interface UserProfile {
  id: string
  email: string
  full_name?: string
  subscription_tier: string
  subscription_status?: string
  created_at: string
  updated_at?: string
  onboarding_completed?: boolean
  stripe_customer_id?: string | null
}

export default function UsersPage() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [timeRange, setTimeRange] = useState("30d")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Protected emails - these users cannot be deleted
  const PROTECTED_EMAILS = [
    "alinikayeljamal@gmail.com",
    "nikayeeljamaljan@gmail.com",
  ]

  const loadData = useCallback(async () => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
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
      console.error("Error loading user data:", error)
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
      console.error("Error loading users:", error)
    } finally {
      setUsersLoading(false)
    }
  }, [firebaseUser, page, searchQuery])

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
      console.error("Error deleting user:", error)
      alert("Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  const isProtected = (email: string) => PROTECTED_EMAILS.includes(email.toLowerCase())

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
      </div>
    )
  }

  const tierDistribution = metrics ? [
    { name: "Free", value: metrics.users.byTier.free, color: "#6B7280" },
    { name: "Pro", value: metrics.users.byTier.pro, color: "#FBBF24" },
    { name: "Enterprise", value: metrics.users.byTier.enterprise, color: "#A855F7" },
  ] : []

  const conversionRate = metrics && metrics.users.total > 0
    ? ((metrics.users.byTier.pro / metrics.users.total) * 100).toFixed(1)
    : "0"

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Users</h1>
          <p className="text-gray-400 mt-1">User management and analytics</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
            {["7d", "30d", "90d", "all"].map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? "default" : "ghost"}
                onClick={() => setTimeRange(range)}
                className={
                  timeRange === range
                    ? "bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }
              >
                {range === "all" ? "All" : range.toUpperCase()}
              </Button>
            ))}
          </div>

          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={metrics.users.total}
              icon={Users}
              sparklineData={metrics.timeSeries?.users.slice(-7).map((u: any) => u.total)}
              sparklineColor="#00d9ff"
            />
            <MetricCard
              title="Pro Users"
              value={metrics.users.byTier.pro}
              subtitle={`${conversionRate}% of total`}
              icon={Crown}
              iconColor="text-yellow-400"
              valueColor="text-yellow-400"
            />
            <MetricCard
              title="Free Users"
              value={metrics.users.byTier.free}
              icon={UserPlus}
            />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionChart
              title="User Distribution"
              data={tierDistribution}
              type="pie"
              icon={Users}
            />

            <Card className="bg-gray-900/50 border-gray-800">
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
                            ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                            : item.color === "purple"
                            ? "bg-purple-600/20 text-purple-400 border-purple-600/30"
                            : "bg-gray-600/20 text-gray-400 border-gray-600/30"
                        }
                      >
                        {item.tier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-semibold">{item.count}</span>
                      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
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
                      <span className="text-gray-500 text-sm w-12">
                        {metrics.users.total > 0 ? ((item.count / metrics.users.total) * 100).toFixed(0) : 0}%
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
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">All Users</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10 w-64 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Button
                onClick={loadUsers}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-400 hover:text-white"
                disabled={usersLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${usersLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d9ff]"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Email</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Tier</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Created</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const protectedUser = isProtected(user.email)
                    return (
                      <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-3 px-4">
                          <div className="text-white">{user.email}</div>
                          <div className="text-xs text-gray-500 font-mono">{user.id.substring(0, 20)}...</div>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{user.full_name || "-"}</td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              user.subscription_tier === "pro"
                                ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                                : user.subscription_tier === "enterprise"
                                ? "bg-purple-600/20 text-purple-400 border-purple-600/30"
                                : "bg-gray-600/20 text-gray-400 border-gray-600/30"
                            }
                          >
                            {user.subscription_tier || "free"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
                          {protectedUser ? (
                            <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                              Protected
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-600/20 text-gray-400 border-gray-600/30">
                              {user.subscription_status || "none"}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {protectedUser ? (
                            <span className="text-gray-500 text-sm">Cannot delete</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(user)
                                setDeleteDialogOpen(true)
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                  <div className="text-sm text-gray-400">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete <strong className="text-white">{userToDelete?.email}</strong>?
              <br />
              <br />
              This will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
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
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700">
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
    </div>
  )
}
