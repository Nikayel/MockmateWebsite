"use client"

import { useEffect, useMemo, useState } from "react"
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
import { ScoreInfoTooltip } from "@/components/ui/score-info-tooltip"

interface MasteredProblem {
  problemId: string
  scenarioId: string
  title: string
  pattern: string
  difficulty: string
  masteredAt: string
}

interface PatternStat {
  displayName: string
  averageScore: number // Overall / interview score for this pattern
  averageTechnicalScore: number // Technical score for this pattern
  proficiency: string
}

interface QuickMetrics {
  totalSessions: number
  totalPracticeHours: number
  averageScore: number // Overall (includes communication)
  averageTechnicalScore: number // Technical (code-focused, excludes communication)
  weeklyAverage: number
  trend: "improving" | "stable" | "declining"
  patterns: PatternStat[]
  // Score breakdown from the 4 weighted categories
  scoreBreakdown?: {
    codeQuality: number // 30%
    problemSolving: number // 25%
    understanding: number // 25%
    communication: number // 20%
  }
  // Mastery statistics for spaced repetition
  mastery?: {
    total: number
    mastered: number
    reviewing: number
    learning: number
    new: number
    masteryRate: number
  }
}

export function MetricsOverview() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null)
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    const loadMetrics = async () => {
      if (!firebaseUser) {
        setLoading(false)
        return
      }

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/user/metrics?days=7", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const { overview, patterns, trends } = data.data

            setMetrics({
              totalSessions: overview.totalSessions,
              totalPracticeHours: overview.totalPracticeHours,
              averageScore: overview.averageScore,
              averageTechnicalScore: overview.averageTechnicalScore || overview.averageScore,
              weeklyAverage: trends.weeklyAverage,
              trend: trends.trend,
              // Keep the full pattern list; strongest/weakest are derived reactively
              // from whichever score (interview vs technical) is currently displayed,
              // so the ranking metric always matches the number shown on the badge.
              patterns: (patterns || []) as PatternStat[],
              scoreBreakdown: data.data.scoreBreakdown || undefined,
              mastery: data.data.mastery || undefined,
            })
          }
        }
      } catch (error) {
        console.error("Error loading metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [firebaseUser])

  // Derive strongest / focus-area patterns from the metric that is actually
  // displayed (interview vs technical). Ranking and the shown number must use
  // the same score, otherwise the badges can look swapped (e.g. "Strongest"
  // showing a lower % than "Focus Area").
  const { topPattern, weakestPattern } = useMemo(() => {
    const patterns = metrics?.patterns ?? []
    if (patterns.length === 0) {
      return { topPattern: undefined, weakestPattern: undefined }
    }
    const scoreOf = (p: PatternStat) =>
      showOverallScore ? p.averageScore : p.averageTechnicalScore ?? p.averageScore
    const sorted = [...patterns].sort((a, b) => scoreOf(b) - scoreOf(a))
    const top = sorted[0]
    const weak = sorted[sorted.length - 1]
    const toView = (p: PatternStat) => ({
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

  if (loading) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-medium text-foreground">
            <BarChart3 className="mr-2 h-4 w-4" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-muted"></div>
            <div className="h-4 w-1/2 rounded bg-muted"></div>
            <div className="h-4 w-2/3 rounded bg-muted"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics || metrics.totalSessions === 0) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-medium text-foreground">
            <BarChart3 className="mr-2 h-4 w-4" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="mb-3 text-sm text-muted-foreground">Start practicing to see your insights</p>
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
        <CardTitle className="flex items-center justify-between text-sm font-medium text-foreground">
          <span className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Performance Insights
          </span>
          <Link href="/metrics">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[#c4703f] hover:text-foreground">
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
            <div className="text-2xl font-bold text-foreground">{metrics.totalSessions}</div>
            <div className="text-xs text-muted-foreground">Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{metrics.totalPracticeHours}h</div>
            <div className="text-xs text-muted-foreground">Practice</div>
          </div>
          <div>
            <div
              className={`flex items-center justify-center gap-1 text-2xl font-bold ${trendColor}`}
            >
              {metrics.weeklyAverage}%
              <TrendIcon className="h-4 w-4" />
            </div>
            <div className="text-xs text-muted-foreground">This Week</div>
          </div>
        </div>

        {/* Average Score Progress with Toggle */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              {showOverallScore ? "Mock Interview Score" : "Technical Score"}
              <ScoreInfoTooltip type={showOverallScore ? "overall" : "technical"} />
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground">
                {showOverallScore ? metrics.averageScore : metrics.averageTechnicalScore}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
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
            value={showOverallScore ? metrics.averageScore : metrics.averageTechnicalScore}
            className="h-2"
          />
          <div className="mt-1 text-[10px] text-muted-foreground">
            {showOverallScore
              ? "What you'd likely get in a real interview (communication matters!)"
              : "Objective metrics: test pass rate, time efficiency, independence"}
          </div>
        </div>

        {/* Mastery Progress */}
        {metrics.mastery && metrics.mastery.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                Mastery Progress
                <ScoreInfoTooltip type="mastery" />
              </span>
              <span className="font-mono text-xs text-foreground">
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
                    <div className="flex items-center justify-center text-[10px] text-muted-foreground">
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
                      <div className="py-8 text-center text-muted-foreground">Loading...</div>
                    ) : masteredProblems.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        No mastered problems yet. Keep practicing!
                      </div>
                    ) : (
                      masteredProblems.map((problem) => (
                        <Link
                          key={problem.problemId}
                          href={`/interview?scenario=${problem.scenarioId}`}
                          className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3 transition-colors hover:border-emerald-500/30 hover:bg-muted/50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-foreground">{problem.title}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                <div className="flex items-center justify-center text-[10px] text-muted-foreground">
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
                <div className="flex items-center justify-center text-[10px] text-muted-foreground">
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
            <div className="mb-2 text-xs font-medium text-muted-foreground">Skill Breakdown</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-muted/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center text-xs text-muted-foreground">
                    Code Quality
                    <ScoreInfoTooltip type="codeQuality" iconClassName="h-2.5 w-2.5" />
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    {metrics.scoreBreakdown.codeQuality}%
                  </span>
                </div>
                <Progress value={metrics.scoreBreakdown.codeQuality} className="h-1" />
              </div>
              <div className="rounded bg-muted/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center text-xs text-muted-foreground">
                    Problem Solving
                    <ScoreInfoTooltip type="problemSolving" iconClassName="h-2.5 w-2.5" />
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    {metrics.scoreBreakdown.problemSolving}%
                  </span>
                </div>
                <Progress value={metrics.scoreBreakdown.problemSolving} className="h-1" />
              </div>
              <div className="rounded bg-muted/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center text-xs text-muted-foreground">
                    Understanding
                    <ScoreInfoTooltip type="understanding" iconClassName="h-2.5 w-2.5" />
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    {metrics.scoreBreakdown.understanding}%
                  </span>
                </div>
                <Progress value={metrics.scoreBreakdown.understanding} className="h-1" />
              </div>
              <div className="rounded bg-muted/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center text-xs text-muted-foreground">
                    Communication
                    <ScoreInfoTooltip type="communication" iconClassName="h-2.5 w-2.5" />
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    {metrics.scoreBreakdown.communication}%
                  </span>
                </div>
                <Progress value={metrics.scoreBreakdown.communication} className="h-1" />
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
                <div className="text-sm text-foreground">{topPattern.name}</div>
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
                <div className="text-sm text-foreground">{weakestPattern.name}</div>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="cursor-default border-orange-500/30 bg-orange-500/20 text-xs text-orange-400">
                  {showOverallScore
                    ? weakestPattern.score
                    : weakestPattern.technicalScore}
                  %
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
