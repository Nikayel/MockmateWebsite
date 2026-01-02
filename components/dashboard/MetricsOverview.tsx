"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target,
  Brain,
  ArrowRight,
  Flame,
  Sparkles,
} from "lucide-react"

interface QuickMetrics {
  totalSessions: number
  totalPracticeHours: number
  averageScore: number
  weeklyAverage: number
  trend: 'improving' | 'stable' | 'declining'
  topPattern?: {
    name: string
    score: number
    proficiency: string
  }
  weakestPattern?: {
    name: string
    score: number
  }
}

export function MetricsOverview() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null)
  const [loading, setLoading] = useState(true)

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

            // Find strongest and weakest patterns
            const sortedPatterns = [...patterns].sort((a: any, b: any) => b.averageScore - a.averageScore)
            const topPattern = sortedPatterns[0]
            const weakestPattern = sortedPatterns[sortedPatterns.length - 1]

            setMetrics({
              totalSessions: overview.totalSessions,
              totalPracticeHours: overview.totalPracticeHours,
              averageScore: overview.averageScore,
              weeklyAverage: trends.weeklyAverage,
              trend: trends.trend,
              topPattern: topPattern ? {
                name: topPattern.displayName,
                score: topPattern.averageScore,
                proficiency: topPattern.proficiency,
              } : undefined,
              weakestPattern: weakestPattern && weakestPattern !== topPattern ? {
                name: weakestPattern.displayName,
                score: weakestPattern.averageScore,
              } : undefined,
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
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-medium flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            <div className="h-4 bg-gray-800 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics || metrics.totalSessions === 0) {
    return (
      <Card className="bg-gray-900/50 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-medium flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Sparkles className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm mb-3">Start practicing to see your insights</p>
            <Link href="/interview">
              <Button size="sm" className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
                Begin Practice
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = metrics.trend === 'improving' ? TrendingUp :
                    metrics.trend === 'declining' ? TrendingDown : Minus
  const trendColor = metrics.trend === 'improving' ? 'text-green-400' :
                     metrics.trend === 'declining' ? 'text-red-400' : 'text-gray-400'

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm font-medium flex items-center justify-between">
          <span className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance Insights
          </span>
          <Link href="/metrics">
            <Button variant="ghost" size="sm" className="text-[#00d9ff] hover:text-white h-6 px-2">
              View All
              <ArrowRight className="h-3 w-3 ml-1" />
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
            <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${trendColor}`}>
              {metrics.weeklyAverage}%
              <TrendIcon className="h-4 w-4" />
            </div>
            <div className="text-xs text-gray-400">This Week</div>
          </div>
        </div>

        {/* Average Score Progress */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400 flex items-center">
              <Target className="h-3 w-3 mr-1" />
              Average Score
            </span>
            <span className="text-sm font-mono text-white">{metrics.averageScore}%</span>
          </div>
          <Progress value={metrics.averageScore} className="h-2" />
        </div>

        {/* Pattern Highlights */}
        {metrics.topPattern && (
          <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-green-400" />
              <div>
                <div className="text-xs text-green-400 font-medium">Strongest</div>
                <div className="text-sm text-white">{metrics.topPattern.name}</div>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              {metrics.topPattern.score}%
            </Badge>
          </div>
        )}

        {metrics.weakestPattern && (
          <div className="flex items-center justify-between p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <div>
                <div className="text-xs text-orange-400 font-medium">Focus Area</div>
                <div className="text-sm text-white">{metrics.weakestPattern.name}</div>
              </div>
            </div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
              {metrics.weakestPattern.score}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MetricsOverview
