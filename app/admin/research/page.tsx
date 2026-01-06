"use client"

import { useAuth } from "@/lib/auth-context"
import { AdminLayout, DataTable, Column, renderBadge } from "@/components/admin/shared"
import { useResearchData } from "@/lib/hooks/useResearchData"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  FlaskConical,
  Database,
  Repeat,
  Brain,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Award,
  Activity,
  BarChart3,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react"

export default function ResearchDashboard() {
  const { firebaseUser } = useAuth()
  const {
    data,
    loading,
    refreshing,
    error,
    loadData,
    migrateUsers,
    backfillData,
    migrating,
    backfilling,
  } = useResearchData(firebaseUser)

  const { distribution, comparison, insights, recentEvents } = data || {}
  const sm2Stats = comparison?.sm2
  const fsrsStats = comparison?.fsrs
  const comp = comparison?.comparison

  const totalUsers = (distribution?.sm2.total || 0) + (distribution?.fsrs.total || 0)

  return (
    <AdminLayout
      title="Algorithm Research"
      description="A/B Testing: SM-2 vs FSRS spaced repetition algorithms"
      icon={FlaskConical}
      loading={loading}
      error={error}
      onRefresh={() => loadData(true)}
      refreshing={refreshing}
      actions={
        <>
          <Button
            onClick={migrateUsers}
            variant="outline"
            disabled={migrating}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            {migrating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Migrate Users
          </Button>
          <Button
            onClick={backfillData}
            variant="outline"
            disabled={backfilling}
            className="border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10"
          >
            {backfilling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Repeat className="mr-2 h-4 w-4" />
            )}
            Backfill Data
          </Button>
        </>
      }
    >
      {/* Distribution Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AlgorithmCard
          name="SM-2 Algorithm"
          color="blue"
          total={distribution?.sm2.total || 0}
          active7d={distribution?.sm2.active_7d || 0}
          overridden={distribution?.sm2.overridden || 0}
          percentage={
            totalUsers > 0 ? Math.round(((distribution?.sm2.total || 0) / totalUsers) * 100) : 0
          }
        />

        <AlgorithmCard
          name="FSRS Algorithm"
          color="purple"
          total={distribution?.fsrs.total || 0}
          active7d={distribution?.fsrs.active_7d || 0}
          overridden={distribution?.fsrs.overridden || 0}
          percentage={
            totalUsers > 0 ? Math.round(((distribution?.fsrs.total || 0) / totalUsers) * 100) : 0
          }
        />

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="pt-4">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#00d9ff]" />
              <span className="font-medium text-white">Research Status</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Users in Study</span>
                <span className="font-medium text-white">{totalUsers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Sample Size Status</span>
                <span
                  className={comp?.sufficient_sample_size ? "text-green-400" : "text-yellow-400"}
                >
                  {comp?.sufficient_sample_size ? "Sufficient" : "Collecting"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Last Updated</span>
                <span className="text-xs text-gray-300">
                  {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "Never"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Winner Banner */}
      {comp && (
        <WinnerBanner
          winner={comp.overall_winner}
          confidence={comp.confidence_level}
          fsrsWins={comp.fsrs_wins_count}
          sm2Wins={comp.sm2_wins_count}
          sufficientSample={comp.sufficient_sample_size}
        />
      )}

      {/* Insights Summary */}
      {insights && (
        <Card className="border-gray-700 bg-gradient-to-r from-gray-900/80 to-gray-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#00d9ff]" />
              Research Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg text-white">{insights.summary}</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {insights.keyFindings.length > 0 && (
                <InsightSection
                  title="Key Findings"
                  icon={CheckCircle}
                  items={insights.keyFindings}
                  color="green"
                />
              )}

              {insights.recommendations.length > 0 && (
                <InsightSection
                  title="Recommendations"
                  icon={Target}
                  items={insights.recommendations}
                  color="cyan"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Metrics Comparison */}
      {sm2Stats && fsrsStats && comp && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricComparisonCard
            title="Retention Rate"
            sm2Value={sm2Stats.average_retention_rate}
            fsrsValue={fsrsStats.average_retention_rate}
            difference={comp.retention_rate_difference}
            format="percent"
            icon={<Brain className="h-5 w-5" />}
            description="% of reviews recalled correctly"
          />
          <MetricComparisonCard
            title="Avg Score"
            sm2Value={sm2Stats.average_score}
            fsrsValue={fsrsStats.average_score}
            difference={comp.average_score_difference}
            format="number"
            icon={<Target className="h-5 w-5" />}
            description="Average performance score (0-100)"
          />
          <MetricComparisonCard
            title="Time to Mastery"
            sm2Value={sm2Stats.average_time_to_mastery_days}
            fsrsValue={fsrsStats.average_time_to_mastery_days}
            difference={-comp.time_to_mastery_difference_days}
            format="days"
            invertBetter
            icon={<Clock className="h-5 w-5" />}
            description="Days to master a problem"
          />
          <MetricComparisonCard
            title="Daily Reviews"
            sm2Value={sm2Stats.average_daily_reviews}
            fsrsValue={fsrsStats.average_daily_reviews}
            difference={comp.engagement_difference}
            format="decimal"
            icon={<Activity className="h-5 w-5" />}
            description="Reviews completed per day"
          />
          <MetricComparisonCard
            title="Interval Accuracy"
            sm2Value={sm2Stats.interval_accuracy}
            fsrsValue={fsrsStats.interval_accuracy}
            difference={comp.interval_efficiency_difference}
            format="percent"
            icon={<CheckCircle className="h-5 w-5" />}
            description="How well intervals predict retention"
          />
        </div>
      )}

      {/* Recent Events Table */}
      {recentEvents && (
        <DataTable
          title="Recent Review Events"
          description="Latest spaced repetition reviews across both algorithms"
          data={recentEvents.slice(0, 20)}
          columns={[
            {
              key: "algorithm",
              label: "Algorithm",
              render: (value) =>
                renderBadge(value.toUpperCase(), value === "fsrs" ? "default" : "default"),
            },
            { key: "pattern", label: "Pattern" },
            {
              key: "difficulty",
              label: "Difficulty",
              render: (value) =>
                renderBadge(
                  value,
                  value === "easy" ? "success" : value === "medium" ? "warning" : "error"
                ),
            },
            { key: "score", label: "Score", align: "right" },
            {
              key: "interval_days",
              label: "Next Interval",
              align: "right",
              render: (v) => `${v}d`,
            },
            {
              key: "actual_retention",
              label: "Retention",
              align: "center",
              render: (value) =>
                value ? (
                  <CheckCircle className="mx-auto h-4 w-4 text-green-400" />
                ) : (
                  <XCircle className="mx-auto h-4 w-4 text-red-400" />
                ),
            },
            {
              key: "retention_as_predicted",
              label: "Predicted",
              align: "center",
              render: (value) =>
                value ? (
                  <CheckCircle className="mx-auto h-4 w-4 text-[#00d9ff]" />
                ) : (
                  <Minus className="mx-auto h-4 w-4 text-gray-500" />
                ),
            },
            {
              key: "timestamp",
              label: "Time",
              render: (value) => new Date(value).toLocaleString(),
            },
          ]}
          keyExtractor={(event) => event.id}
          emptyMessage="No review events recorded yet. Data will appear as users practice."
        />
      )}

      {/* Last Updated */}
      <p className="text-center text-xs text-gray-500">
        Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "Unknown"}
      </p>
    </AdminLayout>
  )
}

// Helper Components
interface AlgorithmCardProps {
  name: string
  color: "blue" | "purple"
  total: number
  active7d: number
  overridden: number
  percentage: number
}

function AlgorithmCard({
  name,
  color,
  total,
  active7d,
  overridden,
  percentage,
}: AlgorithmCardProps) {
  const bgColor = color === "blue" ? "bg-blue-500" : "bg-purple-500"
  const borderColor = color === "blue" ? "border-blue-500" : "border-purple-500"
  const textColor = color === "blue" ? "text-blue-400" : "text-purple-400"

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardContent className="pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${bgColor}`} />
            <span className="font-medium text-white">{name}</span>
          </div>
          <Badge variant="outline" className={`${borderColor} ${textColor}`}>
            {percentage}%
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded bg-gray-800/50 p-2">
            <p className="text-xl font-bold text-white">{total}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          <div className="rounded bg-gray-800/50 p-2">
            <p className="text-xl font-bold text-green-400">{active7d}</p>
            <p className="text-xs text-gray-400">Active 7d</p>
          </div>
          <div className="rounded bg-gray-800/50 p-2">
            <p className="text-xl font-bold text-yellow-400">{overridden}</p>
            <p className="text-xs text-gray-400">Overridden</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function WinnerBanner({ winner, confidence, fsrsWins, sm2Wins, sufficientSample }: any) {
  return (
    <Card
      className={`border-2 ${
        winner === "fsrs"
          ? "border-purple-500/50 bg-purple-500/10"
          : winner === "sm2"
            ? "border-blue-500/50 bg-blue-500/10"
            : "border-gray-700 bg-gray-800/50"
      }`}
    >
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {winner ? (
              <Award className="h-10 w-10 text-yellow-400" />
            ) : (
              <Activity className="h-10 w-10 text-gray-400" />
            )}
            <div>
              {winner ? (
                <>
                  <Badge
                    className={`mb-1 px-4 py-1 text-lg ${
                      winner === "fsrs" ? "bg-purple-500" : "bg-blue-500"
                    }`}
                  >
                    {winner.toUpperCase()} WINNING
                  </Badge>
                  <p className="text-gray-300">
                    With {confidence}% confidence based on current data
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-white">No Clear Winner Yet</p>
                  <p className="text-gray-400">
                    FSRS leads in {fsrsWins}/5 metrics, SM-2 leads in {sm2Wins}/5
                  </p>
                </>
              )}
            </div>
          </div>
          {!sufficientSample && (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">Need more users for statistical significance</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function InsightSection({ title, icon: Icon, items, color }: any) {
  const dotColor = color === "green" ? "text-green-400" : "text-[#00d9ff]"
  const iconColor = color === "green" ? "text-green-400" : "text-[#00d9ff]"

  return (
    <div className="rounded-lg bg-gray-800/50 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-400">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <span className={`${dotColor} mt-1`}>•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface MetricComparisonCardProps {
  title: string
  sm2Value: number
  fsrsValue: number
  difference: number
  format: "percent" | "number" | "days" | "decimal"
  invertBetter?: boolean
  icon: React.ReactNode
  description?: string
}

function MetricComparisonCard({
  title,
  sm2Value,
  fsrsValue,
  difference,
  format,
  invertBetter,
  icon,
  description,
}: MetricComparisonCardProps) {
  const formatValue = (val: number) => {
    if (format === "percent") return `${val}%`
    if (format === "days") return `${val}d`
    if (format === "decimal") return val.toFixed(1)
    return val.toFixed(1)
  }

  const isFsrsBetter = invertBetter ? difference < 0 : difference > 0
  const isEqual = Math.abs(difference) < 0.5

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardContent className="pt-4">
        <div className="mb-3 flex items-center gap-2 text-gray-400">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded border border-blue-500/20 bg-blue-500/10 p-2 text-center">
            <p className="mb-1 text-xs text-blue-400">SM-2</p>
            <p className="text-lg font-bold text-white">{formatValue(sm2Value)}</p>
          </div>
          <div className="rounded border border-purple-500/20 bg-purple-500/10 p-2 text-center">
            <p className="mb-1 text-xs text-purple-400">FSRS</p>
            <p className="text-lg font-bold text-white">{formatValue(fsrsValue)}</p>
          </div>
        </div>

        <div
          className={`flex items-center justify-center gap-1 text-sm ${
            isEqual ? "text-gray-400" : isFsrsBetter ? "text-purple-400" : "text-blue-400"
          }`}
        >
          {isEqual ? (
            <>
              <Minus className="h-4 w-4" />
              <span>Equal</span>
            </>
          ) : isFsrsBetter ? (
            <>
              <ArrowUpRight className="h-4 w-4" />
              <span>FSRS +{Math.abs(difference).toFixed(1)}</span>
            </>
          ) : (
            <>
              <ArrowDownRight className="h-4 w-4" />
              <span>SM-2 +{Math.abs(difference).toFixed(1)}</span>
            </>
          )}
        </div>

        {description && <p className="mt-2 text-center text-xs text-gray-500">{description}</p>}
      </CardContent>
    </Card>
  )
}
