"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  FlaskConical,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Brain,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  Database,
  BarChart3,
  Activity,
  Zap,
  Calendar,
  Award,
  XCircle,
  Timer,
  Repeat,
} from "lucide-react"

interface AlgorithmDistribution {
  sm2: { total: number; active_7d: number; overridden: number }
  fsrs: { total: number; active_7d: number; overridden: number }
}

interface CohortStats {
  algorithm: string
  total_users: number
  active_users_7d: number
  active_users_30d: number
  users_with_overrides: number
  average_retention_rate: number
  median_retention_rate: number
  average_score: number
  median_score: number
  total_problems_mastered: number
  average_problems_mastered_per_user: number
  average_time_to_mastery_days: number
  average_streak_days: number
  average_daily_reviews: number
  average_session_length_minutes: number
  churn_rate_7d: number
  churn_rate_30d: number
  score_distribution: {
    '0-20': number
    '21-40': number
    '41-60': number
    '61-80': number
    '81-100': number
  }
  average_lapse_rate: number
  users_with_zero_lapses: number
  average_interval_days: number
  interval_accuracy: number
  weekly_trends: Array<{
    week: string
    active_users: number
    average_score: number
    retention_rate: number
    problems_mastered: number
  }>
}

interface Comparison {
  retention_rate_difference: number
  average_score_difference: number
  time_to_mastery_difference_days: number
  engagement_difference: number
  interval_efficiency_difference: number
  sufficient_sample_size: boolean
  overall_winner: string | null
  confidence_level: number | null
  fsrs_wins_count: number
  sm2_wins_count: number
}

interface ResearchData {
  distribution: AlgorithmDistribution
  comparison: {
    sm2: CohortStats
    fsrs: CohortStats
    comparison: Comparison
    last_updated: string
  } | null
  recentEvents: Array<{
    id: string
    algorithm: string
    score: number
    quality_rating: number
    pattern: string
    difficulty: string
    actual_retention: boolean
    retention_as_predicted: boolean
    interval_days: number
    timestamp: string
  }>
  insights: {
    summary: string
    keyFindings: string[]
    recommendations: string[]
  }
  lastUpdated: string
}

export default function ResearchDashboard() {
  const { firebaseUser } = useAuth()
  const [data, setData] = useState<ResearchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!firebaseUser) return

    if (forceRefresh) setRefreshing(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const url = `/api/admin/algorithm-research${forceRefresh ? '?refresh=true' : ''}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to load research data')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firebaseUser])

  const migrateUsers = async () => {
    if (!firebaseUser) return

    setMigrating(true)
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch('/api/admin/algorithm-research', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'migrate' }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Migration failed')
      }

      const result = await response.json()
      alert(result.message)
      loadData(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed')
    } finally {
      setMigrating(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00d9ff]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400">{error}</p>
        <Button onClick={() => loadData()} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    )
  }

  const { distribution, comparison, insights, recentEvents } = data || {}
  const sm2Stats = comparison?.sm2
  const fsrsStats = comparison?.fsrs
  const comp = comparison?.comparison

  const totalUsers = (distribution?.sm2.total || 0) + (distribution?.fsrs.total || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="h-7 w-7 text-[#00d9ff]" />
            Algorithm Research
          </h1>
          <p className="text-gray-400 mt-1">
            A/B Testing: SM-2 vs FSRS spaced repetition algorithms
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => loadData(true)}
            variant="outline"
            disabled={refreshing}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
          <Button
            onClick={migrateUsers}
            variant="outline"
            disabled={migrating}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            {migrating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Migrate Users
          </Button>
        </div>
      </div>

      {/* Distribution Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-white font-medium">SM-2 Algorithm</span>
              </div>
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {totalUsers > 0 ? Math.round((distribution?.sm2.total || 0) / totalUsers * 100) : 0}%
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-xl font-bold text-white">{distribution?.sm2.total || 0}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-xl font-bold text-green-400">{distribution?.sm2.active_7d || 0}</p>
                <p className="text-xs text-gray-400">Active 7d</p>
              </div>
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-xl font-bold text-yellow-400">{distribution?.sm2.overridden || 0}</p>
                <p className="text-xs text-gray-400">Overridden</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-white font-medium">FSRS Algorithm</span>
              </div>
              <Badge variant="outline" className="border-purple-500 text-purple-400">
                {totalUsers > 0 ? Math.round((distribution?.fsrs.total || 0) / totalUsers * 100) : 0}%
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-xl font-bold text-white">{distribution?.fsrs.total || 0}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-xl font-bold text-green-400">{distribution?.fsrs.active_7d || 0}</p>
                <p className="text-xs text-gray-400">Active 7d</p>
              </div>
              <div className="bg-gray-800/50 rounded p-2">
                <p className="text-xl font-bold text-yellow-400">{distribution?.fsrs.overridden || 0}</p>
                <p className="text-xs text-gray-400">Overridden</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-[#00d9ff]" />
              <span className="text-white font-medium">Research Status</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Users in Study</span>
                <span className="text-white font-medium">{totalUsers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Sample Size Status</span>
                <span className={comp?.sufficient_sample_size ? "text-green-400" : "text-yellow-400"}>
                  {comp?.sufficient_sample_size ? "Sufficient" : "Collecting"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Last Updated</span>
                <span className="text-gray-300 text-xs">
                  {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Winner Banner */}
      {comp && (
        <Card className={`border-2 ${
          comp.overall_winner === 'fsrs'
            ? 'bg-purple-500/10 border-purple-500/50'
            : comp.overall_winner === 'sm2'
            ? 'bg-blue-500/10 border-blue-500/50'
            : 'bg-gray-800/50 border-gray-700'
        }`}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {comp.overall_winner ? (
                  <Award className="h-10 w-10 text-yellow-400" />
                ) : (
                  <Activity className="h-10 w-10 text-gray-400" />
                )}
                <div>
                  {comp.overall_winner ? (
                    <>
                      <Badge className={`text-lg px-4 py-1 mb-1 ${
                        comp.overall_winner === 'fsrs' ? 'bg-purple-500' : 'bg-blue-500'
                      }`}>
                        {comp.overall_winner.toUpperCase()} WINNING
                      </Badge>
                      <p className="text-gray-300">
                        With {comp.confidence_level}% confidence based on current data
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-white">No Clear Winner Yet</p>
                      <p className="text-gray-400">
                        FSRS leads in {comp.fsrs_wins_count}/5 metrics, SM-2 leads in {comp.sm2_wins_count}/5
                      </p>
                    </>
                  )}
                </div>
              </div>
              {!comp.sufficient_sample_size && (
                <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 px-4 py-2 rounded-lg">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">Need more users for statistical significance</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Summary */}
      {insights && (
        <Card className="bg-gradient-to-r from-gray-900/80 to-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#00d9ff]" />
              Research Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg text-white">{insights.summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.keyFindings.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Key Findings
                  </h4>
                  <ul className="space-y-2">
                    {insights.keyFindings.map((finding, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-green-400 mt-1">•</span>
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {insights.recommendations.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#00d9ff]" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-[#00d9ff] mt-1">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comprehensive Metrics Comparison */}
      {sm2Stats && fsrsStats && comp && (
        <>
          {/* Primary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              icon={<Zap className="h-5 w-5" />}
              description="How well intervals predict retention"
            />
          </div>

          {/* Detailed Cohort Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SM-2 Detailed Stats */}
            <Card className="bg-gray-900/50 border-gray-800 border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  SM-2 Detailed Metrics
                </CardTitle>
                <CardDescription>Traditional spaced repetition algorithm</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <StatItem icon={Users} label="Total Users" value={sm2Stats.total_users} />
                  <StatItem icon={Activity} label="Active (7d)" value={sm2Stats.active_users_7d} color="text-green-400" />
                  <StatItem icon={Activity} label="Active (30d)" value={sm2Stats.active_users_30d} />
                  <StatItem icon={Brain} label="Retention Rate" value={`${sm2Stats.average_retention_rate}%`} />
                  <StatItem icon={Brain} label="Median Retention" value={`${sm2Stats.median_retention_rate}%`} />
                  <StatItem icon={Target} label="Avg Score" value={sm2Stats.average_score} />
                  <StatItem icon={Target} label="Median Score" value={sm2Stats.median_score} />
                  <StatItem icon={Award} label="Problems Mastered" value={sm2Stats.total_problems_mastered} color="text-yellow-400" />
                  <StatItem icon={Award} label="Per User" value={sm2Stats.average_problems_mastered_per_user} />
                  <StatItem icon={Clock} label="Time to Mastery" value={`${sm2Stats.average_time_to_mastery_days}d`} />
                  <StatItem icon={Calendar} label="Avg Streak" value={`${sm2Stats.average_streak_days}d`} />
                  <StatItem icon={Timer} label="Session Length" value={`${sm2Stats.average_session_length_minutes}m`} />
                  <StatItem icon={Repeat} label="Avg Interval" value={`${sm2Stats.average_interval_days}d`} />
                  <StatItem icon={XCircle} label="Lapse Rate" value={`${sm2Stats.average_lapse_rate}%`} color="text-red-400" />
                  <StatItem icon={TrendingDown} label="Churn (7d)" value={`${sm2Stats.churn_rate_7d}%`} color="text-orange-400" />
                  <StatItem icon={TrendingDown} label="Churn (30d)" value={`${sm2Stats.churn_rate_30d}%`} color="text-orange-400" />
                </div>

                {/* Score Distribution */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Score Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(sm2Stats.score_distribution || {}).map(([range, count]) => (
                      <div key={range} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-16">{range}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (count / sm2Stats.total_users) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300 w-8">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FSRS Detailed Stats */}
            <Card className="bg-gray-900/50 border-gray-800 border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500" />
                  FSRS Detailed Metrics
                </CardTitle>
                <CardDescription>ML-optimized algorithm (20-30% more efficient)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <StatItem icon={Users} label="Total Users" value={fsrsStats.total_users} />
                  <StatItem icon={Activity} label="Active (7d)" value={fsrsStats.active_users_7d} color="text-green-400" />
                  <StatItem icon={Activity} label="Active (30d)" value={fsrsStats.active_users_30d} />
                  <StatItem icon={Brain} label="Retention Rate" value={`${fsrsStats.average_retention_rate}%`} />
                  <StatItem icon={Brain} label="Median Retention" value={`${fsrsStats.median_retention_rate}%`} />
                  <StatItem icon={Target} label="Avg Score" value={fsrsStats.average_score} />
                  <StatItem icon={Target} label="Median Score" value={fsrsStats.median_score} />
                  <StatItem icon={Award} label="Problems Mastered" value={fsrsStats.total_problems_mastered} color="text-yellow-400" />
                  <StatItem icon={Award} label="Per User" value={fsrsStats.average_problems_mastered_per_user} />
                  <StatItem icon={Clock} label="Time to Mastery" value={`${fsrsStats.average_time_to_mastery_days}d`} />
                  <StatItem icon={Calendar} label="Avg Streak" value={`${fsrsStats.average_streak_days}d`} />
                  <StatItem icon={Timer} label="Session Length" value={`${fsrsStats.average_session_length_minutes}m`} />
                  <StatItem icon={Repeat} label="Avg Interval" value={`${fsrsStats.average_interval_days}d`} />
                  <StatItem icon={XCircle} label="Lapse Rate" value={`${fsrsStats.average_lapse_rate}%`} color="text-red-400" />
                  <StatItem icon={TrendingDown} label="Churn (7d)" value={`${fsrsStats.churn_rate_7d}%`} color="text-orange-400" />
                  <StatItem icon={TrendingDown} label="Churn (30d)" value={`${fsrsStats.churn_rate_30d}%`} color="text-orange-400" />
                </div>

                {/* Score Distribution */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Score Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(fsrsStats.score_distribution || {}).map(([range, count]) => (
                      <div key={range} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-16">{range}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (count / fsrsStats.total_users) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-300 w-8">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Recent Events Table */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle>Recent Review Events</CardTitle>
          <CardDescription>Latest spaced repetition reviews across both algorithms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left py-2 px-3">Algorithm</th>
                  <th className="text-left py-2 px-3">Pattern</th>
                  <th className="text-left py-2 px-3">Difficulty</th>
                  <th className="text-right py-2 px-3">Score</th>
                  <th className="text-right py-2 px-3">Next Interval</th>
                  <th className="text-center py-2 px-3">Retention</th>
                  <th className="text-center py-2 px-3">Predicted</th>
                  <th className="text-left py-2 px-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents?.slice(0, 20).map((event) => (
                  <tr key={event.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-3">
                      <Badge variant="outline" className={
                        event.algorithm === 'fsrs'
                          ? 'border-purple-500 text-purple-400'
                          : 'border-blue-500 text-blue-400'
                      }>
                        {event.algorithm.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-gray-300">{event.pattern}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className={
                        event.difficulty === 'easy' ? 'border-green-500 text-green-400' :
                        event.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' :
                        'border-red-500 text-red-400'
                      }>
                        {event.difficulty}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-white">{event.score}</td>
                    <td className="py-2 px-3 text-right text-gray-300">{event.interval_days}d</td>
                    <td className="py-2 px-3 text-center">
                      {event.actual_retention ? (
                        <CheckCircle className="h-4 w-4 text-green-400 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {event.retention_as_predicted ? (
                        <CheckCircle className="h-4 w-4 text-[#00d9ff] mx-auto" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-400 text-xs">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!recentEvents || recentEvents.length === 0) && (
            <p className="text-center text-gray-500 py-8">
              No review events recorded yet. Data will appear as users practice.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Last Updated */}
      <p className="text-xs text-gray-500 text-center">
        Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'Unknown'}
      </p>
    </div>
  )
}

// Stat Item Component
interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color?: string
}

function StatItem({ icon: Icon, label, value, color = "text-white" }: StatItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800/30 rounded">
      <Icon className="h-4 w-4 text-gray-500" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 truncate">{label}</p>
        <p className={`text-sm font-medium ${color}`}>{value}</p>
      </div>
    </div>
  )
}

interface MetricComparisonCardProps {
  title: string
  sm2Value: number
  fsrsValue: number
  difference: number
  format: 'percent' | 'number' | 'days' | 'decimal'
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
    if (format === 'percent') return `${val}%`
    if (format === 'days') return `${val}d`
    if (format === 'decimal') return val.toFixed(1)
    return val.toFixed(1)
  }

  const isFsrsBetter = invertBetter ? difference < 0 : difference > 0
  const isEqual = Math.abs(difference) < 0.5

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-gray-400 mb-3">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center p-2 rounded bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400 mb-1">SM-2</p>
            <p className="text-lg font-bold text-white">{formatValue(sm2Value)}</p>
          </div>
          <div className="text-center p-2 rounded bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-400 mb-1">FSRS</p>
            <p className="text-lg font-bold text-white">{formatValue(fsrsValue)}</p>
          </div>
        </div>

        <div className={`flex items-center justify-center gap-1 text-sm ${
          isEqual ? 'text-gray-400' :
          isFsrsBetter ? 'text-purple-400' : 'text-blue-400'
        }`}>
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

        {description && (
          <p className="text-xs text-gray-500 text-center mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
