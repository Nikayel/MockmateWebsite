"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { AdminLayout, DataTable, renderBadge } from "@/components/admin/shared"
import { useResearchData } from "@/lib/hooks/useResearchData"
import { useEnhancedResearch } from "@/lib/hooks/useEnhancedResearch"
import { useResearchUsers } from "@/lib/hooks/useResearchUsers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  SignificanceTestCard,
  PredictionAccuracyPanel,
  SampleSizeAnalysisPanel,
  QualityScorePanel,
  RecommendationsPanel,
  UserAlgorithmBreakdown,
} from "@/components/admin/research"
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
  Download,
  FileJson,
  FileSpreadsheet,
  ChevronDown,
  Users,
  ShieldAlert,
} from "lucide-react"

// Helper component for trend indicators
interface TrendIndicatorProps {
  label: string
  direction: "improving" | "declining" | "stable"
  slope: number
}

function TrendIndicator({ label, direction, slope }: TrendIndicatorProps) {
  const Icon =
    direction === "improving" ? TrendingUp : direction === "declining" ? TrendingDown : Minus
  const colorClass =
    direction === "improving"
      ? "text-green-400"
      : direction === "declining"
        ? "text-red-400"
        : "text-gray-400"

  const slopeDisplay =
    direction === "stable" ? "Stable" : `${slope > 0 ? "+" : ""}${(slope * 100).toFixed(2)}%/day`

  return (
    <div className="flex flex-col items-center rounded-lg bg-gray-800/50 p-3">
      <Icon className={`mb-1 h-5 w-5 ${colorClass}`} />
      <span className="mb-1 text-xs text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${colorClass}`}>{slopeDisplay}</span>
    </div>
  )
}

export default function ResearchDashboard() {
  const { firebaseUser } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [exportStatus, setExportStatus] = useState<{
    loading: boolean
    message: string | null
    type: "success" | "error" | null
  }>({ loading: false, message: null, type: null })

  // Basic research data
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
    runAbDryRun,
    confirmEndAbTest,
    clearAbDryRun,
    endingAb,
    abDryRunResult,
    abFinalResult,
  } = useResearchData(firebaseUser)

  // Enhanced statistical analysis
  const {
    data: enhancedData,
    loading: enhancedLoading,
    exportData: rawExportData,
  } = useEnhancedResearch(firebaseUser)

  // Wrap export to show status
  const exportData = async (
    format: "csv" | "json",
    type: "events" | "summary" | "comparison",
    range?: string
  ) => {
    setExportStatus({ loading: true, message: null, type: null })
    try {
      await rawExportData(format, type, range)
      setExportStatus({
        loading: false,
        message: `Exported ${type} as ${format.toUpperCase()}`,
        type: "success",
      })
      // Clear success message after 3 seconds
      setTimeout(() => setExportStatus({ loading: false, message: null, type: null }), 3000)
    } catch {
      setExportStatus({
        loading: false,
        message: "Export failed. Please try again.",
        type: "error",
      })
    }
  }

  // Users with algorithm breakdown
  const {
    data: usersData,
    loading: usersLoading,
    setParams: setUsersParams,
    params: usersParams,
  } = useResearchUsers(firebaseUser)

  const { distribution, comparison, insights, recentEvents } = data || {}
  const sm2Stats = comparison?.sm2
  const fsrsStats = comparison?.fsrs
  const comp = comparison?.comparison

  const totalUsers = (distribution?.sm2.total || 0) + (distribution?.fsrs.total || 0)
  const abEnded = data?.abStatus?.ab_ended === true

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
          {/* Export Status */}
          {exportStatus.message && (
            <div
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${
                exportStatus.type === "success"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {exportStatus.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {exportStatus.message}
            </div>
          )}

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={exportStatus.loading}
              >
                {exportStatus.loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-gray-700 bg-gray-900">
              <DropdownMenuItem
                onClick={() => exportData("csv", "events", "30d")}
                className="cursor-pointer text-gray-300 hover:bg-gray-800"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Events (CSV, 30d)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportData("csv", "events", "all")}
                className="cursor-pointer text-gray-300 hover:bg-gray-800"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Events (CSV, All)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportData("csv", "summary")}
                className="cursor-pointer text-gray-300 hover:bg-gray-800"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                User Summaries (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportData("json", "comparison")}
                className="cursor-pointer text-gray-300 hover:bg-gray-800"
              >
                <FileJson className="mr-2 h-4 w-4" />
                Comparison (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Random-assignment migration is meaningless once the A/B has ended */}
          {!abEnded && (
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
          )}
          {!abEnded && (
            <Button
              onClick={runAbDryRun}
              variant="outline"
              disabled={endingAb}
              className="border-red-800 text-red-400 hover:bg-red-900/20"
            >
              {endingAb ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="mr-2 h-4 w-4" />
              )}
              End A/B — Switch All to FSRS
            </Button>
          )}
          <Button
            onClick={backfillData}
            variant="outline"
            disabled={backfilling}
            className="border-[#c4703f] text-[#c4703f] hover:bg-[#c4703f]/10"
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
      {/* End-A/B confirmation: opens once the dry run has counts */}
      <AlertDialog open={!!abDryRunResult} onOpenChange={(open) => !open && clearAbDryRun()}>
        <AlertDialogContent className="border-gray-700 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">
              End the SM-2/FSRS A/B test?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-gray-400">
                <p>
                  This is final: comparison data stops accruing and every new user gets FSRS.
                  Dry-run results:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  <li>
                    <span className="font-medium text-gray-200">
                      {abDryRunResult?.usersFlippedToFsrs ?? 0}
                    </span>{" "}
                    users will switch to FSRS ({abDryRunResult?.usersAlreadyFsrs ?? 0} already on
                    it)
                  </li>
                  <li>
                    <span className="font-medium text-gray-200">
                      {abDryRunResult?.cardsConverted ?? 0}
                    </span>{" "}
                    cards will be converted in place (schedules preserved)
                  </li>
                  {(abDryRunResult?.usersOverriddenSkipped ?? 0) > 0 && (
                    <li>
                      {abDryRunResult?.usersOverriddenSkipped} users chose their algorithm manually
                      and keep it
                    </li>
                  )}
                  {(abDryRunResult?.errors.length ?? 0) > 0 && (
                    <li className="text-red-400">
                      {abDryRunResult?.errors.length} users hit errors in the dry run — inspect
                      before proceeding
                    </li>
                  )}
                </ul>
                <p className="text-sm">
                  Historical A/B research data stays in Firestore for later analysis.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEndAbTest}
              className="bg-red-700 text-white hover:bg-red-600"
            >
              End A/B and switch everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* A/B ended banner */}
      {abEnded && (
        <Card className="border-emerald-900/60 bg-emerald-950/30">
          <CardContent className="flex items-center gap-3 py-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
            <div className="text-sm text-emerald-200">
              A/B test ended
              {data?.abStatus?.ended_at
                ? ` on ${new Date(data.abStatus.ended_at).toLocaleDateString()}`
                : ""}{" "}
              — all users are on FSRS. The comparison data below is historical.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion notice for the just-run sweep */}
      {abFinalResult && (
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="py-3 text-sm text-gray-300">
            Sweep complete: flipped {abFinalResult.usersFlippedToFsrs} users, converted{" "}
            {abFinalResult.cardsConverted} cards
            {abFinalResult.usersOverriddenSkipped > 0
              ? `, ${abFinalResult.usersOverriddenSkipped} overridden users kept their choice`
              : ""}
            {abFinalResult.errors.length > 0 ? (
              <span className="text-red-400">
                {" "}
                — {abFinalResult.errors.length} errors (see admin audit log)
              </span>
            ) : (
              ""
            )}
            . Re-run the dry run to verify all-zero deltas.
          </CardContent>
        </Card>
      )}

      {/* Data Health Summary */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Algorithm Assignment Status */}
              <div className="flex items-center gap-2">
                {totalUsers > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                )}
                <span className="text-sm text-gray-300">{totalUsers} users assigned</span>
              </div>

              {/* Event Tracking Status */}
              <div className="flex items-center gap-2">
                {(recentEvents?.length || 0) > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-400" />
                )}
                <span className="text-sm text-gray-300">
                  {recentEvents?.length || 0} events tracked
                </span>
              </div>

              {/* Statistical Power Status */}
              <div className="flex items-center gap-2">
                {comp?.sufficient_sample_size ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                )}
                <span className="text-sm text-gray-300">
                  {comp?.sufficient_sample_size ? "Sufficient sample" : "Need more data"}
                </span>
              </div>
            </div>

            {/* Last Updated */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Database className="h-3 w-3" />
              Updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "Never"}
            </div>
          </div>
        </CardContent>
      </Card>

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
              <BarChart3 className="h-5 w-5 text-[#c4703f]" />
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
          winner={comp.overall_winner as "sm2" | "fsrs" | null}
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
              <Brain className="h-5 w-5 text-[#c4703f]" />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

      {/* Tabbed Advanced Analysis Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="-mx-1 overflow-x-auto px-1 pb-2">
          <TabsList className="inline-flex w-full min-w-max bg-gray-800/50 md:grid md:grid-cols-5">
            <TabsTrigger
              value="overview"
              className="flex-1 whitespace-nowrap data-[state=active]:bg-gray-700"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex-1 whitespace-nowrap data-[state=active]:bg-gray-700"
            >
              <Users className="mr-1 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="statistics"
              className="flex-1 whitespace-nowrap data-[state=active]:bg-gray-700"
            >
              Statistics
            </TabsTrigger>
            <TabsTrigger
              value="predictions"
              className="flex-1 whitespace-nowrap data-[state=active]:bg-gray-700"
            >
              Predictions
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="flex-1 whitespace-nowrap data-[state=active]:bg-gray-700"
            >
              Events
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab - Research Quality & Recommendations */}
        <TabsContent value="overview" className="space-y-4">
          {enhancedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#c4703f]" />
              <span className="ml-2 text-gray-400">Loading enhanced analysis...</span>
            </div>
          ) : enhancedData ? (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <QualityScorePanel qualityScore={enhancedData.qualityScore} />
                <SampleSizeAnalysisPanel analysis={enhancedData.sampleAnalysis} />
              </div>
              <RecommendationsPanel recommendations={enhancedData.recommendations} />
            </>
          ) : (
            <Card className="border-gray-800 bg-gray-900/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <FlaskConical className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                  <h3 className="mb-2 text-lg font-medium text-white">
                    Research Analysis Unavailable
                  </h3>
                  <p className="mx-auto max-w-md text-sm text-gray-400">
                    Enhanced research analysis could not be loaded. This may happen if there is no
                    research data yet or if there was a connection issue.
                  </p>
                  <Button
                    onClick={() => loadData(true)}
                    variant="outline"
                    className="mt-4 border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Repeat className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Users Tab - Algorithm Breakdown by User */}
        <TabsContent value="users" className="space-y-4">
          {usersData ? (
            <UserAlgorithmBreakdown
              users={usersData.users}
              pagination={usersData.pagination}
              aggregateStats={usersData.aggregateStats}
              patternStats={usersData.patternStats}
              loading={usersLoading}
              onParamsChange={setUsersParams}
              currentParams={usersParams}
            />
          ) : usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#c4703f]" />
              <span className="ml-2 text-gray-400">Loading user data...</span>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">No user data available</div>
          )}
        </TabsContent>

        {/* Statistics Tab - Significance Tests */}
        <TabsContent value="statistics" className="space-y-4">
          {enhancedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#c4703f]" />
              <span className="ml-2 text-gray-400">Computing statistical analysis...</span>
            </div>
          ) : enhancedData?.significanceTests ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <BarChart3 className="h-5 w-5 text-[#c4703f]" />
                    Statistical Significance Tests
                  </h3>
                  <p className="text-sm text-gray-400">
                    T-tests comparing SM-2 and FSRS performance. p &lt; 0.05 indicates statistical
                    significance.
                  </p>
                </div>
                {enhancedData.metadata && (
                  <Badge variant="outline" className="border-gray-700 text-gray-400">
                    {enhancedData.metadata.totalEventsAnalyzed.toLocaleString()} events analyzed
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <SignificanceTestCard
                  title="Retention Rate"
                  test={enhancedData.significanceTests.retention}
                  description="% of reviews where user recalled correctly"
                />
                <SignificanceTestCard
                  title="Average Score"
                  test={enhancedData.significanceTests.score}
                  description="Performance score on practice problems"
                />
                <SignificanceTestCard
                  title="Interval Accuracy"
                  test={enhancedData.significanceTests.intervalAccuracy}
                  description="How well scheduled intervals predict retention"
                />
              </div>

              {/* Additional Tests - Placeholders */}
              <Card className="border-gray-800 bg-gray-900/50">
                <CardContent className="py-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-300">
                    Additional Metrics (Coming Soon)
                  </h4>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="flex items-center gap-2 rounded bg-gray-800/50 p-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-400">Time to Mastery comparison</span>
                      <Badge
                        variant="outline"
                        className="ml-auto border-gray-700 text-xs text-gray-500"
                      >
                        Pending
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 rounded bg-gray-800/50 p-2">
                      <Activity className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-400">Daily Reviews comparison</span>
                      <Badge
                        variant="outline"
                        className="ml-auto border-gray-700 text-xs text-gray-500"
                      >
                        Pending
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Confidence Intervals */}
              {enhancedData.confidenceIntervals && (
                <Card className="border-gray-800 bg-gray-900/50">
                  <CardHeader>
                    <CardTitle className="text-base">95% Confidence Intervals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-blue-400">SM-2</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Retention</span>
                            <span className="text-gray-300">
                              {enhancedData.confidenceIntervals.sm2Retention
                                ? `${(enhancedData.confidenceIntervals.sm2Retention.lower * 100).toFixed(1)}% - ${(enhancedData.confidenceIntervals.sm2Retention.upper * 100).toFixed(1)}%`
                                : "Insufficient data"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Score</span>
                            <span className="text-gray-300">
                              {enhancedData.confidenceIntervals.sm2Score
                                ? `${enhancedData.confidenceIntervals.sm2Score.lower.toFixed(1)} - ${enhancedData.confidenceIntervals.sm2Score.upper.toFixed(1)}`
                                : "Insufficient data"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-purple-400">FSRS</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Retention</span>
                            <span className="text-gray-300">
                              {enhancedData.confidenceIntervals.fsrsRetention
                                ? `${(enhancedData.confidenceIntervals.fsrsRetention.lower * 100).toFixed(1)}% - ${(enhancedData.confidenceIntervals.fsrsRetention.upper * 100).toFixed(1)}%`
                                : "Insufficient data"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Score</span>
                            <span className="text-gray-300">
                              {enhancedData.confidenceIntervals.fsrsScore
                                ? `${enhancedData.confidenceIntervals.fsrsScore.lower.toFixed(1)} - ${enhancedData.confidenceIntervals.fsrsScore.upper.toFixed(1)}`
                                : "Insufficient data"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-gray-800 bg-gray-900/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                  <h3 className="mb-2 text-lg font-medium text-white">
                    Statistical Analysis Unavailable
                  </h3>
                  <p className="mx-auto max-w-md text-sm text-gray-400">
                    Not enough data to compute statistical tests. Need at least 30 events per
                    algorithm for meaningful t-tests.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Predictions Tab - Accuracy Metrics */}
        <TabsContent value="predictions" className="space-y-4">
          {enhancedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#c4703f]" />
              <span className="ml-2 text-gray-400">Computing prediction metrics...</span>
            </div>
          ) : enhancedData?.predictionAccuracy ? (
            <>
              <PredictionAccuracyPanel
                sm2Metrics={enhancedData.predictionAccuracy.sm2}
                fsrsMetrics={enhancedData.predictionAccuracy.fsrs}
                comparison={enhancedData.predictionAccuracy.comparison}
              />

              {/* Trend Analysis */}
              {enhancedData.trends ? (
                <Card className="border-gray-800 bg-gray-900/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-[#c4703f]" />
                      30-Day Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <TrendIndicator
                        label="SM-2 Retention"
                        direction={enhancedData.trends.sm2Retention?.direction || "stable"}
                        slope={enhancedData.trends.sm2Retention?.slope || 0}
                      />
                      <TrendIndicator
                        label="FSRS Retention"
                        direction={enhancedData.trends.fsrsRetention?.direction || "stable"}
                        slope={enhancedData.trends.fsrsRetention?.slope || 0}
                      />
                      <TrendIndicator
                        label="SM-2 Score"
                        direction={enhancedData.trends.sm2Score?.direction || "stable"}
                        slope={enhancedData.trends.sm2Score?.slope || 0}
                      />
                      <TrendIndicator
                        label="FSRS Score"
                        direction={enhancedData.trends.fsrsScore?.direction || "stable"}
                        slope={enhancedData.trends.fsrsScore?.slope || 0}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-gray-800 bg-gray-900/50">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <TrendingUp className="mx-auto mb-2 h-8 w-8 text-gray-600" />
                      <p className="text-sm text-gray-400">
                        Trend data requires at least 7 days of events
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-gray-800 bg-gray-900/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <Target className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                  <h3 className="mb-2 text-lg font-medium text-white">
                    Prediction Metrics Unavailable
                  </h3>
                  <p className="mx-auto max-w-md text-sm text-gray-400">
                    Not enough data to compute prediction accuracy. Metrics will appear once users
                    complete more reviews with both algorithms.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Events Tab - Recent Activity */}
        <TabsContent value="events" className="space-y-4">
          {/* Event Tracking Health Check */}
          <Card className="border-gray-800 bg-gray-900/50">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {recentEvents && recentEvents.length > 0 ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="text-sm text-green-400">Events tracking active</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        <span className="text-sm text-yellow-400">No events recorded yet</span>
                      </>
                    )}
                  </div>
                  <Badge variant="outline" className="border-gray-700 text-gray-400">
                    {recentEvents?.length || 0} recent events
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  Last checked: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {recentEvents && recentEvents.length > 0 ? (
            <DataTable
              title="Recent Review Events"
              description="Latest spaced repetition reviews across both algorithms"
              data={recentEvents.slice(0, 20)}
              columns={[
                {
                  key: "algorithm",
                  label: "Algorithm",
                  render: (value) =>
                    renderBadge(
                      value?.toUpperCase() || "N/A",
                      value === "fsrs" ? "default" : "default"
                    ),
                },
                {
                  key: "pattern",
                  label: "Pattern",
                  render: (value) => (
                    <span className="capitalize">{(value || "unknown").replace(/_/g, " ")}</span>
                  ),
                },
                {
                  key: "difficulty",
                  label: "Difficulty",
                  render: (value) =>
                    renderBadge(
                      value || "medium",
                      value === "easy" ? "success" : value === "medium" ? "warning" : "error"
                    ),
                },
                {
                  key: "score",
                  label: "Score",
                  align: "right",
                  render: (value) => (
                    <span
                      className={
                        value >= 70
                          ? "text-green-400"
                          : value >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                      }
                    >
                      {value ?? "-"}
                    </span>
                  ),
                },
                {
                  key: "interval_days",
                  label: "Next Interval",
                  align: "right",
                  render: (v) => (v ? `${v}d` : "-"),
                },
                {
                  key: "actual_retention",
                  label: "Retained",
                  align: "center",
                  render: (value) =>
                    value === true ? (
                      <CheckCircle className="mx-auto h-4 w-4 text-green-400" />
                    ) : value === false ? (
                      <XCircle className="mx-auto h-4 w-4 text-red-400" />
                    ) : (
                      <Minus className="mx-auto h-4 w-4 text-gray-500" />
                    ),
                },
                {
                  key: "retention_as_predicted",
                  label: "Predicted OK",
                  align: "center",
                  render: (value) =>
                    value === true ? (
                      <CheckCircle className="mx-auto h-4 w-4 text-[#c4703f]" />
                    ) : value === false ? (
                      <XCircle className="mx-auto h-4 w-4 text-orange-400" />
                    ) : (
                      <Minus className="mx-auto h-4 w-4 text-gray-500" />
                    ),
                },
                {
                  key: "timestamp",
                  label: "Time",
                  render: (value) =>
                    value ? (
                      <span className="text-xs text-gray-400">
                        {new Date(value).toLocaleDateString()}{" "}
                        {new Date(value).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : (
                      "-"
                    ),
                },
              ]}
              keyExtractor={(event) => event.id || `${event.timestamp}-${Math.random()}`}
              emptyMessage="No review events recorded yet. Data will appear as users practice."
            />
          ) : (
            <Card className="border-gray-800 bg-gray-900/50">
              <CardContent className="py-12">
                <div className="text-center">
                  <Database className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                  <h3 className="mb-2 text-lg font-medium text-white">No Events Recorded</h3>
                  <p className="mx-auto max-w-md text-sm text-gray-400">
                    Review events will appear here once users start practicing with spaced
                    repetition. Events are recorded each time a user completes a review session.
                  </p>
                  <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-300">Tracking Checklist</h4>
                    <ul className="space-y-1 text-left text-xs text-gray-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        Event tracking code deployed
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-yellow-400" />
                        Waiting for user activity
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-gray-500" />
                        Check if algorithm assignment is working
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Metadata */}
      {enhancedData?.metadata && (
        <p className="text-center text-xs text-gray-500">
          Analysis: {enhancedData.metadata.totalEventsAnalyzed.toLocaleString()} events from{" "}
          {enhancedData.metadata.totalUsersAnalyzed.toLocaleString()} users | Last updated:{" "}
          {new Date(enhancedData.metadata.analysisTimestamp).toLocaleString()}
        </p>
      )}
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

interface WinnerBannerProps {
  winner: "sm2" | "fsrs" | null
  confidence: number | null
  fsrsWins: number
  sm2Wins: number
  sufficientSample: boolean
}

function WinnerBanner({
  winner,
  confidence,
  fsrsWins,
  sm2Wins,
  sufficientSample,
}: WinnerBannerProps) {
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

interface InsightSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: string[]
  color: "green" | "cyan"
}

function InsightSection({ title, icon: Icon, items, color }: InsightSectionProps) {
  const dotColor = color === "green" ? "text-green-400" : "text-[#c4703f]"
  const iconColor = color === "green" ? "text-green-400" : "text-[#c4703f]"

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
