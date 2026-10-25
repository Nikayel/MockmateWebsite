"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Brain,
  ArrowRight,
  Flame,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  RefreshCw,
  BookOpen,
  Trophy,
  ExternalLink,
} from "lucide-react"
import type { UserMetricsData } from "@/lib/user-metrics/service"
import { formatMetricScore } from "@/lib/user-metrics/display"
import { ScoreInfoTooltip } from "@/components/ui/score-info-tooltip"

interface MasteredProblem {
  problemId: string
  scenarioId: string
  title: string
  pattern: string
  difficulty: string
  masteredAt: string
}

export function MetricsOverview({
  data,
  error = false,
  onRetry,
}: {
  data: UserMetricsData | null
  error?: boolean
  onRetry?: () => void
}) {
  const { firebaseUser } = useAuth()
  const [showOverallScore, setShowOverallScore] = useState(true) // Default to Interview Score (includes communication)
  const [masteredProblems, setMasteredProblems] = useState<MasteredProblem[]>([])
  const [loadingMastered, setLoadingMastered] = useState(false)
  const [masteredDialogOpen, setMasteredDialogOpen] = useState(false)

  const loadMasteredProblems = async () => {
    if (!firebaseUser || loadingMastered) return
    setLoadingMastered(true)
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/user/mastered-problems", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setMasteredProblems(data.problems || [])
      }
    } catch (error) {
      console.error("Failed to load mastered problems:", error)
    } finally {
      setLoadingMastered(false)
    }
  }

  const metrics = data
    ? {
        ...data.overview,
        ...data.trends,
        patterns: data.patterns,
        scoreBreakdown: data.scoreBreakdown,
        mastery: data.mastery,
      }
    : null
  const loading = !data && !error

  // Derive strongest / focus-area patterns from the metric that is actually
  // displayed (interview vs technical). Ranking and the shown number must use
  // the same score, otherwise the badges can look swapped (e.g. "Strongest"
  // showing a lower % than "Focus Area").
  const { topPattern, weakestPattern } = useMemo(() => {
    const patterns = (metrics?.patterns ?? []).filter(
      (p) => showOverallScore || p.averageTechnicalScore !== null
    )
    if (patterns.length === 0) {
      return { topPattern: undefined, weakestPattern: undefined }
    }
    const scoreOf = (p: UserMetricsData["patterns"][number]) =>
      showOverallScore ? p.averageScore : (p.averageTechnicalScore ?? p.averageScore)
    const sorted = [...patterns].sort((a, b) => scoreOf(b) - scoreOf(a))
    const top = sorted[0]
    const weak = sorted[sorted.length - 1]
    const toView = (p: UserMetricsData["patterns"][number]) => ({
      name: p.displayName,
      score: p.averageScore,
      technicalScore: p.averageTechnicalScore ?? p.averageScore,
      proficiency: p.proficiency,
    })
    return {
      topPattern: top ? toView(top) : undefined,
      weakestPattern: weak && weak !== top ? toView(weak) : undefined,
    }
  }, [metrics?.patterns, showOverallScore])

  if (error)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p role="alert" className="text-muted-foreground text-sm">
            Couldn't load your metrics.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )

  if (loading) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center text-sm font-medium">
            <BarChart3 className="mr-2 h-4 w-4" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="bg-muted h-4 w-3/4 rounded"></div>
            <div className="bg-muted h-4 w-1/2 rounded"></div>
            <div className="bg-muted h-4 w-2/3 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics || metrics.totalSessions === 0) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center text-sm font-medium">
            <BarChart3 className="mr-2 h-4 w-4" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center">
            <Sparkles className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
            <p className="text-muted-foreground mb-3 text-sm">
              Complete an interview to see interview insights. Guided practice is shown separately.
            </p>
            <Link href="/interview">
              <Button size="sm" className="bg-[#c4703f] text-white hover:bg-[#c4703f]/80">
                Begin Practice
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon =
    metrics.trend === "improving"
      ? TrendingUp
      : metrics.trend === "declining"
        ? TrendingDown
        : Minus
  const trendColor =
    metrics.trend === "improving"
      ? "text-green-400"
      : metrics.trend === "declining"
        ? "text-red-400"
        : "text-muted-foreground"

  return (
    <Card className="border-border bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground flex items-center justify-between text-sm font-medium">
          <span className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Performance Insights
          </span>
          <Link href="/metrics">
            <Button
              variant="ghost"
              size="sm"
              className="hover:text-foreground h-6 px-2 text-[#c4703f]"
            >
              View All
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-foreground text-2xl font-bold">{metrics.totalSessions}</div>
            <div className="text-muted-foreground text-xs">Interviews</div>
          </div>
          <div>
            <div className="text-foreground text-2xl font-bold">{metrics.totalPracticeHours}h</div>
            <div className="text-muted-foreground text-xs">Interview practice</div>
          </div>
          <div>
            <div
              className={`flex items-center justify-center gap-1 text-2xl font-bold ${trendColor}`}
            >
              {formatMetricScore(metrics.weeklyAverage)}
              <TrendIcon className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground text-xs">Last 7 days</div>
          </div>
        </div>

        {/* Average Score Progress with Toggle */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Target className="h-3 w-3" />
              {showOverallScore ? "Mock Interview Score" : "Technical Score"}
              <ScoreInfoTooltip type={showOverallScore ? "interviewAverage" : "technicalAverage"} />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-foreground font-mono text-sm">
                {formatMetricScore(
                  showOverallScore ? metrics.averageScore : metrics.averageTechnicalScore
                )}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label={
                      showOverallScore ? "Switch to Technical Score" : "Switch to Interview Score"
                    }
                    onClick={() => setShowOverallScore(!showOverallScore)}
                    className="text-muted-foreground transition-colors hover:text-[#c4703f]"
                  >
                    {showOverallScore ? (
                      <ToggleRight className="h-4 w-4 text-[#c4703f]" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-muted text-foreground">
                  <p>
                    {showOverallScore ? "Switch to Technical Score" : "Switch to Interview Score"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <Progress
            value={
              (showOverallScore ? metrics.averageScore : metrics.averageTechnicalScore) ?? undefined
            }
            className="h-2"
          />
          <div className="text-muted-foreground mt-1 text-[10px]">
            {showOverallScore
              ? "Final feedback across completed interviews; includes communication."
              : "Objective metrics: test pass rate, time efficiency, independence"}
          </div>
        </div>

        {/* Mastery Progress */}
        {metrics.mastery && metrics.mastery.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                Mastery Progress
                <ScoreInfoTooltip type="mastery" />
              </span>
              <span className="text-foreground font-mono text-xs">
                {metrics.mastery.masteryRate}% mastered
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Dialog open={masteredDialogOpen} onOpenChange={setMasteredDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="rounded bg-emerald-500/10 p-2 transition-colors hover:bg-emerald-500/20"
                    onClick={() => {
                      setMasteredDialogOpen(true)
                      loadMasteredProblems()
                    }}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400">
                        {metrics.mastery.mastered}
                      </span>
                    </div>
                    <div className="text-muted-foreground flex items-center justify-center text-[10px]">
                      Mastered
                      <ScoreInfoTooltip type="mastered" iconClassName="h-2.5 w-2.5" asSpan />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-emerald-400" />
                      Mastered Problems ({masteredProblems.length})
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {loadingMastered ? (
                      <div className="text-muted-foreground py-8 text-center">Loading...</div>
                    ) : masteredProblems.length === 0 ? (
                      <div className="text-muted-foreground py-8 text-center">
                        No mastered problems yet. Keep practicing!
                      </div>
                    ) : (
                      masteredProblems.map((problem) => (
                        <Link
                          key={problem.problemId}
                          href={`/interview?scenario=${problem.scenarioId}`}
                          className="border-border bg-card/50 hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-emerald-500/30"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-foreground truncate font-medium">
                              {problem.title}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              <span className="capitalize">
                                {problem.pattern.replace(/-/g, " ")}
                              </span>
                              <span>•</span>
                              <span
                                className={
                                  problem.difficulty === "easy"
                                    ? "text-emerald-400"
                                    : problem.difficulty === "medium"
                                      ? "text-amber-400"
                                      : "text-red-400"
                                }
                              >
                                {problem.difficulty}
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="text-muted-foreground h-4 w-4 shrink-0" />
                        </Link>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <div className="rounded bg-amber-500/10 p-2">
                <div className="flex items-center justify-center gap-1">
                  <RefreshCw className="h-3 w-3 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">
                    {metrics.mastery.reviewing}
                  </span>
                </div>
                <div className="text-muted-foreground flex items-center justify-center text-[10px]">
                  Reviewing
                  <ScoreInfoTooltip type="reviewing" iconClassName="h-2.5 w-2.5" />
                </div>
              </div>
              <div className="rounded bg-blue-500/10 p-2">
                <div className="flex items-center justify-center gap-1">
                  <BookOpen className="h-3 w-3 text-blue-400" />
                  <span className="text-sm font-bold text-blue-400">
                    {metrics.mastery.learning}
                  </span>
                </div>
                <div className="text-muted-foreground flex items-center justify-center text-[10px]">
                  Learning
                  <ScoreInfoTooltip type="learning" iconClassName="h-2.5 w-2.5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown - 4 weighted categories */}
        {metrics.scoreBreakdown && (
          <div className="space-y-2">
            <div className="text-muted-foreground mb-2 text-xs font-medium">Skill Breakdown</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center text-xs">
                    Code Quality
                    <ScoreInfoTooltip type="codeQuality" iconClassName="h-2.5 w-2.5" />
                  </span>
                  <span className="text-foreground font-mono text-xs">
                    {formatMetricScore(metrics.scoreBreakdown.codeQuality)}
                  </span>
                </div>
                <Progress value={metrics.scoreBreakdown.codeQuality ?? undefined} className="h-1" />
              </div>
              <div className="bg-muted/50 rounded p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center text-xs">
                    Problem Solving
                    <ScoreInfoTooltip type="problemSolving" iconClassName="h-2.5 w-2.5" />
                  </span>
                  <span className="text-foreground font-mono text-xs">
                    {formatMetricScore(metrics.scoreBreakdown.problemSolving)}
                  </span>
                </div>
                <Progress
                  value={metrics.scoreBreakdown.problemSolving ?? undefined}
                  className="h-1"
                />
              </div>
              <div className="bg-muted/50 rounded p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center text-xs">
                    Understanding
                    <ScoreInfoTooltip type="understanding" iconClassName="h-2.5 w-2.5" />
                  </span>
                  <span className="text-foreground font-mono text-xs">
                    {formatMetricScore(metrics.scoreBreakdown.understanding)}
                  </span>
                </div>
                <Progress
                  value={metrics.scoreBreakdown.understanding ?? undefined}
                  className="h-1"
                />
              </div>
              <div className="bg-muted/50 rounded p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center text-xs">
                    Communication
                    <ScoreInfoTooltip type="communication" iconClassName="h-2.5 w-2.5" />
                  </span>
                  <span className="text-foreground font-mono text-xs">
                    {formatMetricScore(metrics.scoreBreakdown.communication)}
                  </span>
                </div>
                <Progress
                  value={metrics.scoreBreakdown.communication ?? undefined}
                  className="h-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Pattern Highlights - score changes based on toggle */}
        {topPattern && (
          <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 p-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-green-400" />
              <div>
                <div className="text-xs font-medium text-green-400">Strongest</div>
                <div className="text-foreground text-sm">{topPattern.name}</div>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="cursor-default border-green-500/30 bg-green-500/20 text-xs text-green-400">
                  {showOverallScore ? topPattern.score : topPattern.technicalScore}%
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {showOverallScore ? "Interview" : "Technical"} score for this pattern
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {weakestPattern && (
          <div className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/10 p-2">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <div>
                <div className="text-xs font-medium text-orange-400">Focus Area</div>
                <div className="text-foreground text-sm">{weakestPattern.name}</div>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="cursor-default border-orange-500/30 bg-orange-500/20 text-xs text-orange-400">
                  {showOverallScore ? weakestPattern.score : weakestPattern.technicalScore}%
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {showOverallScore ? "Interview" : "Technical"} score for this pattern
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MetricsOverview
