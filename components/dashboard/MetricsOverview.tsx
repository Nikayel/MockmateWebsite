"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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
  HelpCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"

interface QuickMetrics {
  totalSessions: number
  totalPracticeHours: number
  averageScore: number // Overall (includes communication)
  averageTechnicalScore: number // Technical (code-focused, excludes communication)
  weeklyAverage: number
  trend: "improving" | "stable" | "declining"
  topPattern?: {
    name: string
    score: number
    technicalScore: number
    proficiency: string
  }
  weakestPattern?: {
    name: string
    score: number
    technicalScore: number
  }
  // Score breakdown from the 4 weighted categories
  scoreBreakdown?: {
    codeQuality: number // 30%
    problemSolving: number // 25%
    understanding: number // 25%
    communication: number // 20%
  }
}

export function MetricsOverview() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOverallScore, setShowOverallScore] = useState(false) // Default to technical score

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

            // Find strongest and weakest patterns (use technical score for ranking)
            const sortedPatterns = [...patterns].sort(
              (a: any, b: any) =>
                (b.averageTechnicalScore || b.averageScore) -
                (a.averageTechnicalScore || a.averageScore)
            )
            const topPattern = sortedPatterns[0]
            const weakestPattern = sortedPatterns[sortedPatterns.length - 1]

            setMetrics({
              totalSessions: overview.totalSessions,
              totalPracticeHours: overview.totalPracticeHours,
              averageScore: overview.averageScore,
              averageTechnicalScore: overview.averageTechnicalScore || overview.averageScore,
              weeklyAverage: trends.weeklyAverage,
              trend: trends.trend,
              topPattern: topPattern
                ? {
                    name: topPattern.displayName,
                    score: topPattern.averageScore,
                    technicalScore: topPattern.averageTechnicalScore || topPattern.averageScore,
                    proficiency: topPattern.proficiency,
                  }
                : undefined,
              weakestPattern:
                weakestPattern && weakestPattern !== topPattern
                  ? {
                      name: weakestPattern.displayName,
                      score: weakestPattern.averageScore,
                      technicalScore:
                        weakestPattern.averageTechnicalScore || weakestPattern.averageScore,
                    }
                  : undefined,
              scoreBreakdown: data.data.scoreBreakdown || undefined,
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

  if (loading) {
    return (
      <Card className="border-gray-700 bg-gray-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-medium text-white">
            <BarChart3 className="mr-2 h-4 w-4" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-gray-800"></div>
            <div className="h-4 w-1/2 rounded bg-gray-800"></div>
            <div className="h-4 w-2/3 rounded bg-gray-800"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics || metrics.totalSessions === 0) {
    return (
      <Card className="border-gray-700 bg-gray-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm font-medium text-white">
            <BarChart3 className="mr-2 h-4 w-4" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-gray-600" />
            <p className="mb-3 text-sm text-gray-400">Start practicing to see your insights</p>
            <Link href="/interview">
              <Button size="sm" className="bg-[#00d9ff] text-white hover:bg-[#00d9ff]/80">
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
        : "text-gray-400"

  return (
    <Card className="border-gray-700 bg-gray-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-white">
          <span className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            Performance Insights
          </span>
          <Link href="/metrics">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[#00d9ff] hover:text-white">
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
            <div className="text-2xl font-bold text-white">{metrics.totalSessions}</div>
            <div className="text-xs text-gray-400">Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{metrics.totalPracticeHours}h</div>
            <div className="text-xs text-gray-400">Practice</div>
          </div>
          <div>
            <div
              className={`flex items-center justify-center gap-1 text-2xl font-bold ${trendColor}`}
            >
              {metrics.weeklyAverage}%
              <TrendIcon className="h-4 w-4" />
            </div>
            <div className="text-xs text-gray-400">This Week</div>
          </div>
        </div>

        {/* Average Score Progress with Toggle */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Target className="h-3 w-3" />
              {showOverallScore ? "Interview Score" : "Technical Score"}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowOverallScore(!showOverallScore)}
                    className="ml-1 text-gray-500 transition-colors hover:text-[#00d9ff]"
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-zinc-800 text-zinc-200">
                  <p>
                    {showOverallScore
                      ? "Interview Score: Includes communication (20%). Click to see Technical Score."
                      : "Technical Score: Code quality + problem solving + understanding. Click to see Interview Score (includes communication)."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-white">
                {showOverallScore ? metrics.averageScore : metrics.averageTechnicalScore}%
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowOverallScore(!showOverallScore)}
                    className="text-gray-500 transition-colors hover:text-[#00d9ff]"
                  >
                    {showOverallScore ? (
                      <ToggleRight className="h-4 w-4 text-[#00d9ff]" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-800 text-zinc-200">
                  <p>Toggle score type</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <Progress
            value={showOverallScore ? metrics.averageScore : metrics.averageTechnicalScore}
            className="h-2"
          />
          <div className="mt-1 text-[10px] text-gray-500">
            {showOverallScore
              ? "Overall interview performance (includes communication 20%)"
              : "Code-focused score (understanding, problem solving, code quality)"}
          </div>
        </div>

        {/* Score Breakdown - 4 weighted categories */}
        {metrics.scoreBreakdown && (
          <div className="space-y-2">
            <div className="mb-2 text-xs font-medium text-gray-400">Skill Breakdown</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-gray-800/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Code Quality</span>
                  <span className="font-mono text-xs text-white">
                    {metrics.scoreBreakdown.codeQuality}%
                  </span>
                </div>
                <Progress value={metrics.scoreBreakdown.codeQuality} className="h-1" />
              </div>
              <div className="rounded bg-gray-800/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Problem Solving</span>
                  <span className="font-mono text-xs text-white">
                    {metrics.scoreBreakdown.problemSolving}%
                  </span>
                </div>
                <Progress value={metrics.scoreBreakdown.problemSolving} className="h-1" />
              </div>
              <div className="rounded bg-gray-800/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Understanding</span>
                  <span className="font-mono text-xs text-white">
                    {metrics.scoreBreakdown.understanding}%
                  </span>
                </div>
                <Progress value={metrics.scoreBreakdown.understanding} className="h-1" />
              </div>
              <div className="rounded bg-gray-800/50 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Communication</span>
                  <span className="font-mono text-xs text-white">
                    {metrics.scoreBreakdown.communication}%
                  </span>
                </div>
                <Progress value={metrics.scoreBreakdown.communication} className="h-1" />
              </div>
            </div>
          </div>
        )}

        {/* Pattern Highlights - uses technical score by default */}
        {metrics.topPattern && (
          <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/10 p-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-green-400" />
              <div>
                <div className="text-xs font-medium text-green-400">Strongest</div>
                <div className="text-sm text-white">{metrics.topPattern.name}</div>
              </div>
            </div>
            <Badge className="border-green-500/30 bg-green-500/20 text-xs text-green-400">
              {showOverallScore ? metrics.topPattern.score : metrics.topPattern.technicalScore}%
            </Badge>
          </div>
        )}

        {metrics.weakestPattern && (
          <div className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/10 p-2">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <div>
                <div className="text-xs font-medium text-orange-400">Focus Area</div>
                <div className="text-sm text-white">{metrics.weakestPattern.name}</div>
              </div>
            </div>
            <Badge className="border-orange-500/30 bg-orange-500/20 text-xs text-orange-400">
              {showOverallScore
                ? metrics.weakestPattern.score
                : metrics.weakestPattern.technicalScore}
              %
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MetricsOverview
