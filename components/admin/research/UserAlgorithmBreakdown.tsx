"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Search,
  Brain,
  Target,
  TrendingUp,
  Clock,
  Award,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
  Flame,
} from "lucide-react"
import type { UserAlgorithmData, AggregateStats, PatternStats } from "@/lib/hooks/useResearchUsers"

interface UserAlgorithmBreakdownProps {
  users: UserAlgorithmData[]
  pagination: {
    page: number
    limit: number
    totalUsers: number
    totalPages: number
  }
  aggregateStats: AggregateStats
  patternStats: PatternStats
  loading: boolean
  onParamsChange: (params: {
    algorithm?: "sm2" | "fsrs" | "all"
    page?: number
    search?: string
    sortBy?: "retention" | "score" | "reviews" | "created"
    sortOrder?: "asc" | "desc"
  }) => void
  currentParams: {
    algorithm?: string
    page?: number
    search?: string
    sortBy?: string
    sortOrder?: string
  }
}

export function UserAlgorithmBreakdown({
  users,
  pagination,
  aggregateStats,
  patternStats,
  loading,
  onParamsChange,
  currentParams,
}: UserAlgorithmBreakdownProps) {
  const [searchInput, setSearchInput] = useState(currentParams.search || "")

  const handleSearch = () => {
    onParamsChange({ search: searchInput, page: 1 })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AlgorithmSummaryCard title="SM-2 Users" color="blue" stats={aggregateStats.sm2} />
        <AlgorithmSummaryCard title="FSRS Users" color="purple" stats={aggregateStats.fsrs} />
      </div>

      {/* Pattern Comparison */}
      <PatternComparisonCard patternStats={patternStats} />

      {/* Users Table */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-[#00d9ff]" />
                Users by Algorithm
              </CardTitle>
              <CardDescription>
                {pagination.totalUsers} users • Page {pagination.page} of {pagination.totalPages}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-48 border-gray-700 bg-gray-800 pl-10 text-white"
                />
              </div>

              {/* Algorithm Filter */}
              <Select
                value={currentParams.algorithm || "all"}
                onValueChange={(v) =>
                  onParamsChange({ algorithm: v as "sm2" | "fsrs" | "all", page: 1 })
                }
              >
                <SelectTrigger className="w-32 border-gray-700 bg-gray-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-900">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sm2">SM-2</SelectItem>
                  <SelectItem value="fsrs">FSRS</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select
                value={currentParams.sortBy || "created"}
                onValueChange={(v) =>
                  onParamsChange({ sortBy: v as "retention" | "score" | "reviews" | "created" })
                }
              >
                <SelectTrigger className="w-32 border-gray-700 bg-gray-800 text-white">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-900">
                  <SelectItem value="created">Joined</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                  <SelectItem value="retention">Retention</SelectItem>
                  <SelectItem value="reviews">Reviews</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#00d9ff]" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-gray-400">No users found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                        User
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-400">
                        Algorithm
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Score
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Retention
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Reviews
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Mastered
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">
                        Streak
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                        Top Pattern
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <UserRow key={user.id} user={user} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
                  <div className="text-sm text-gray-400">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.totalUsers)} of{" "}
                    {pagination.totalUsers}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onParamsChange({ page: Math.max(1, pagination.page - 1) })}
                      disabled={pagination.page === 1}
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onParamsChange({
                          page: Math.min(pagination.totalPages, pagination.page + 1),
                        })
                      }
                      disabled={pagination.page === pagination.totalPages}
                      className="border-gray-700 text-gray-400 hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Algorithm Summary Card
interface AlgorithmSummaryCardProps {
  title: string
  color: "blue" | "purple"
  stats: AggregateStats["sm2"] | AggregateStats["fsrs"]
}

function AlgorithmSummaryCard({ title, color, stats }: AlgorithmSummaryCardProps) {
  const bgClass = color === "blue" ? "bg-blue-500/10" : "bg-purple-500/10"
  const borderClass = color === "blue" ? "border-blue-500/30" : "border-purple-500/30"
  const textClass = color === "blue" ? "text-blue-400" : "text-purple-400"

  return (
    <Card className={`border ${borderClass} ${bgClass}`}>
      <CardContent className="pt-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className={`font-semibold ${textClass}`}>{title}</h3>
          <Badge variant="outline" className={`${borderClass} ${textClass}`}>
            {stats.totalUsers} users
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatItem
            icon={<Target className="h-4 w-4" />}
            label="Avg Score"
            value={stats.avgScore}
            format="number"
          />
          <StatItem
            icon={<Brain className="h-4 w-4" />}
            label="Avg Retention"
            value={stats.avgRetention}
            format="percent"
          />
          <StatItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="Total Reviews"
            value={stats.totalReviews}
            format="number"
          />
          <StatItem
            icon={<Award className="h-4 w-4" />}
            label="Mastered"
            value={stats.totalMastered}
            format="number"
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Stat Item
interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: number
  format: "number" | "percent"
}

function StatItem({ icon, label, value, format }: StatItemProps) {
  const formattedValue = format === "percent" ? `${value}%` : value.toLocaleString()

  return (
    <div className="text-center">
      <div className="mb-1 flex items-center justify-center gap-1 text-gray-400">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{formattedValue}</p>
    </div>
  )
}

// Pattern Comparison Card
interface PatternComparisonCardProps {
  patternStats: PatternStats
}

function PatternComparisonCard({ patternStats }: PatternComparisonCardProps) {
  // Handle null/undefined patternStats
  if (!patternStats || Object.keys(patternStats).length === 0) {
    return (
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <BarChart3 className="h-4 w-4 text-[#00d9ff]" />
            Pattern Performance by Algorithm
          </CardTitle>
          <CardDescription>No pattern data available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            Pattern statistics will appear once users start practicing.
          </p>
        </CardContent>
      </Card>
    )
  }

  const patterns = Object.entries(patternStats)
    .filter(([, stats]) => stats && (stats.sm2?.users > 0 || stats.fsrs?.users > 0))
    .sort(
      (a, b) =>
        (b[1]?.sm2?.users || 0) +
        (b[1]?.fsrs?.users || 0) -
        ((a[1]?.sm2?.users || 0) + (a[1]?.fsrs?.users || 0))
    )
    .slice(0, 8)

  if (patterns.length === 0) {
    return null
  }

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <BarChart3 className="h-4 w-4 text-[#00d9ff]" />
          Pattern Performance by Algorithm
        </CardTitle>
        <CardDescription>Average scores and mastery rates across patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {patterns.map(([pattern, stats]) => {
            const sm2 = stats?.sm2 || { users: 0, totalProblems: 0, mastered: 0, avgScore: 0 }
            const fsrs = stats?.fsrs || { users: 0, totalProblems: 0, mastered: 0, avgScore: 0 }

            return (
              <div key={pattern} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white capitalize">
                    {pattern.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-gray-400">{sm2.users + fsrs.users} users</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* SM-2 */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-blue-400">SM-2</span>
                      <span className="text-gray-400">
                        {sm2.mastered}/{sm2.totalProblems} mastered
                      </span>
                    </div>
                    <Progress
                      value={sm2.totalProblems > 0 ? (sm2.mastered / sm2.totalProblems) * 100 : 0}
                      className="h-2"
                    />
                    <p className="mt-1 text-right text-xs text-gray-400">
                      Avg: {Math.round(sm2.avgScore || 0)}
                    </p>
                  </div>
                  {/* FSRS */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-purple-400">FSRS</span>
                      <span className="text-gray-400">
                        {fsrs.mastered}/{fsrs.totalProblems} mastered
                      </span>
                    </div>
                    <Progress
                      value={
                        fsrs.totalProblems > 0 ? (fsrs.mastered / fsrs.totalProblems) * 100 : 0
                      }
                      className="h-2"
                    />
                    <p className="mt-1 text-right text-xs text-gray-400">
                      Avg: {Math.round(fsrs.avgScore || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// User Row Component
interface UserRowProps {
  user: UserAlgorithmData
}

function UserRow({ user }: UserRowProps) {
  const algorithmColor =
    user.algorithm === "sm2"
      ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
      : "text-purple-400 border-purple-500/30 bg-purple-500/10"

  // Find top pattern by count - handle empty/null patternBreakdown
  type PatternEntry = [string, { count: number; avgScore: number; mastered: number }]
  const patternEntries: PatternEntry[] = user.patternBreakdown
    ? (Object.entries(user.patternBreakdown) as PatternEntry[])
    : []
  const topPattern =
    patternEntries.length > 0 ? patternEntries.sort((a, b) => b[1].count - a[1].count)[0] : null

  // Handle null/undefined scores with proper defaults
  const score = user.averageScore ?? 0
  const retention = user.retentionRate ?? 0

  const scoreColor =
    score >= 70
      ? "text-green-400"
      : score >= 50
        ? "text-yellow-400"
        : score > 0
          ? "text-red-400"
          : "text-gray-500"
  const retentionColor =
    retention >= 70
      ? "text-green-400"
      : retention >= 50
        ? "text-yellow-400"
        : retention > 0
          ? "text-red-400"
          : "text-gray-500"

  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-800/30">
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="font-medium text-white">{user.email}</span>
          {user.fullName && <span className="text-xs text-gray-400">{user.fullName}</span>}
          <span className="text-xs text-gray-500">
            Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <Badge className={algorithmColor}>
          {user.algorithm.toUpperCase()}
          {user.algorithmOverridden && <span className="ml-1 text-xs">(manual)</span>}
        </Badge>
      </td>
      <td className={`px-4 py-3 text-right font-medium ${scoreColor}`}>
        {score > 0 ? Math.round(score) : "-"}
      </td>
      <td className={`px-4 py-3 text-right ${retentionColor}`}>
        {retention > 0 ? `${Math.round(retention)}%` : "-"}
      </td>
      <td className="px-4 py-3 text-right text-gray-300">{user.totalReviews.toLocaleString()}</td>
      <td className="px-4 py-3 text-right text-gray-300">
        {user.problemsMastered}/{user.totalProblems}
      </td>
      <td className="px-4 py-3 text-right">
        {user.streakDays > 0 ? (
          <span className="flex items-center justify-end gap-1 text-orange-400">
            <Flame className="h-3 w-3" />
            {user.streakDays}
          </span>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        {topPattern ? (
          <div className="flex flex-col">
            <span className="text-sm text-gray-300 capitalize">
              {topPattern[0].replace(/_/g, " ")}
            </span>
            <span className="text-xs text-gray-500">
              {topPattern[1].count} problems, avg {topPattern[1].avgScore}
            </span>
          </div>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
    </tr>
  )
}
