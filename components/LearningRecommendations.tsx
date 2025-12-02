"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BookOpen,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  ChevronRight,
  Sparkles,
} from "lucide-react"

interface LearningStep {
  step: number
  focus: string
  recommendation: string
  estimatedProblems: number
  currentScore?: number
}

interface UserProfile {
  totalSessions: number
  averageScore: number
  recentTrend: 'improving' | 'stable' | 'declining'
}

interface LearningRecommendationsProps {
  userId: string
  currentProblemType?: string
  currentDifficulty?: string
  performanceScore?: number
  onSelectProblem?: (problemType: string, difficulty: string) => void
}

export function LearningRecommendations({
  userId,
  currentProblemType,
  currentDifficulty,
  performanceScore,
  onSelectProblem,
}: LearningRecommendationsProps) {
  const [learningPath, setLearningPath] = useState<LearningStep[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [message, setMessage] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecommendations() {
      if (!userId) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-learning-path",
            userId,
            targetSkills: currentProblemType ? [currentProblemType] : [],
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to fetch recommendations")
        }

        const data = await response.json()
        setLearningPath(data.learningPath || [])
        setProfile(data.profile || null)
        setMessage(data.message || "")
      } catch (err) {
        console.error("Error fetching learning recommendations:", err)
        setError("Unable to load recommendations")
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [userId, currentProblemType])

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50'
      case 'declining':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Loading Recommendations...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Learning Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Your Learning Path
        </CardTitle>
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Profile Summary */}
        {profile && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Your Progress</span>
                <Badge variant="outline" className={getTrendColor(profile.recentTrend)}>
                  {getTrendIcon(profile.recentTrend)}
                  <span className="ml-1 capitalize">{profile.recentTrend}</span>
                </Badge>
              </div>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>{profile.totalSessions} sessions completed</span>
                <span>Avg score: {profile.averageScore}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Current Session Performance */}
        {performanceScore !== undefined && (
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Target className="h-8 w-8 text-blue-500" />
            <div className="flex-1">
              <div className="text-sm font-medium">This Session</div>
              <div className="text-2xl font-bold">{performanceScore}%</div>
            </div>
            <Badge variant={performanceScore >= 70 ? "default" : performanceScore >= 50 ? "secondary" : "destructive"}>
              {performanceScore >= 70 ? "Great!" : performanceScore >= 50 ? "Good effort" : "Keep practicing"}
            </Badge>
          </div>
        )}

        {/* Learning Steps */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommended Next Steps
          </h4>
          {learningPath.map((step) => (
            <div
              key={step.step}
              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => {
                // Extract problem type from focus text
                const focusLower = step.focus.toLowerCase()
                let problemType = 'dsa'
                if (focusLower.includes('array') || focusLower.includes('string')) problemType = 'dsa'
                else if (focusLower.includes('tree') || focusLower.includes('graph')) problemType = 'dsa'
                else if (focusLower.includes('bug') || focusLower.includes('debug')) problemType = 'bugfix'
                else if (focusLower.includes('design') || focusLower.includes('system')) problemType = 'system-design'

                onSelectProblem?.(problemType, 'medium')
              }}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {step.step}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{step.focus}</div>
                <div className="text-sm text-muted-foreground">{step.recommendation}</div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    ~{step.estimatedProblems} problems
                  </Badge>
                  {step.currentScore !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      Current: {step.currentScore}%
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onSelectProblem?.('dsa', 'easy')}
          >
            Practice Easy Problem
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => {
              const weakArea = profile?.recentTrend === 'declining'
                ? 'dsa'
                : learningPath[0]?.focus?.toLowerCase().includes('array')
                ? 'dsa'
                : 'dsa'
              onSelectProblem?.(weakArea, 'medium')
            }}
          >
            Start Next Challenge
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact version for sidebar or inline use
 */
export function LearningRecommendationsCompact({
  userId,
  onSelectProblem,
}: {
  userId: string
  onSelectProblem?: (problemType: string, difficulty: string) => void
}) {
  const [recommendations, setRecommendations] = useState<{
    id: string
    reason: string
    priority: number
    scenario?: { id: string; type: string; difficulty: string; title: string }
  }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecs() {
      if (!userId) return

      try {
        // This would need available scenarios passed in or fetched
        // For now, show a simplified version
        setLoading(false)
      } catch (err) {
        console.error("Error:", err)
        setLoading(false)
      }
    }

    fetchRecs()
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-yellow-500" />
        Recommended
      </h4>
      <div className="space-y-1">
        {recommendations.slice(0, 3).map((rec) => (
          <Button
            key={rec.id}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-left h-auto py-2"
            onClick={() => onSelectProblem?.(rec.scenario?.type || 'dsa', rec.scenario?.difficulty || 'medium')}
          >
            <div className="flex-1 truncate">
              <div className="text-xs truncate">{rec.scenario?.title || 'Practice Problem'}</div>
              <div className="text-xs text-muted-foreground truncate">{rec.reason}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}
