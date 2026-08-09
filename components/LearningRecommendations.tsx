"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useAuthedFetch } from "@/lib/hooks/useAuthedFetch"
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
  recentTrend: "improving" | "stable" | "declining"
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
  const { firebaseUser } = useAuth()
  const { send } = useAuthedFetch()
  const [learningPath, setLearningPath] = useState<LearningStep[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [message, setMessage] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecommendations() {
      if (!userId || !firebaseUser) return

      setLoading(true)
      setError(null)

      try {
        const result = await send<{
          learningPath?: LearningStep[]
          profile?: UserProfile | null
          message?: string
        }>("/api/rag", "POST", {
          action: "get-learning-path",
          userId,
          targetSkills: currentProblemType ? [currentProblemType] : [],
        })

        if (!result.ok) {
          // An expired token has already been retried with a fresh one; if it is
          // still rejected the session is genuinely gone, so say so rather than
          // showing the generic failure.
          setError(
            result.needsReauth
              ? "Your session expired. Sign in again to see recommendations."
              : "Unable to load recommendations"
          )
          return
        }

        setLearningPath(result.data?.learningPath || [])
        setProfile(result.data?.profile || null)
        setMessage(result.data?.message || "")
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [userId, currentProblemType, firebaseUser, send])

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="text-muted-foreground h-4 w-4" />
    }
  }

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case "improving":
        return "text-green-600 bg-green-50"
      case "declining":
        return "text-red-600 bg-red-50"
      default:
        return "text-muted-foreground bg-muted"
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
        {message && <p className="text-muted-foreground text-sm">{message}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Profile Summary */}
        {profile && (
          <div className="bg-muted/50 flex items-center gap-4 rounded-lg p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Your Progress</span>
                <Badge variant="outline" className={getTrendColor(profile.recentTrend)}>
                  {getTrendIcon(profile.recentTrend)}
                  <span className="ml-1 capitalize">{profile.recentTrend}</span>
                </Badge>
              </div>
              <div className="text-muted-foreground mt-2 flex gap-4 text-sm">
                <span>{profile.totalSessions} sessions completed</span>
                <span>Avg score: {profile.averageScore}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Current Session Performance */}
        {performanceScore !== undefined && (
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <Target className="h-8 w-8 text-blue-500" />
            <div className="flex-1">
              <div className="text-sm font-medium">This Session</div>
              <div className="text-2xl font-bold">{performanceScore}%</div>
            </div>
            <Badge
              variant={
                performanceScore >= 70
                  ? "default"
                  : performanceScore >= 50
                    ? "secondary"
                    : "destructive"
              }
            >
              {performanceScore >= 70
                ? "Great!"
                : performanceScore >= 50
                  ? "Good effort"
                  : "Keep practicing"}
            </Badge>
          </div>
        )}

        {/* Learning Steps */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4" />
            Recommended Next Steps
          </h4>
          {learningPath.map((step) => (
            <div
              key={step.step}
              className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.currentTarget.click()
                }
              }}
              onClick={() => {
                // Extract problem type from focus text
                const focusLower = step.focus.toLowerCase()
                let problemType = "dsa"
                if (focusLower.includes("array") || focusLower.includes("string"))
                  problemType = "dsa"
                else if (focusLower.includes("tree") || focusLower.includes("graph"))
                  problemType = "dsa"
                else if (focusLower.includes("bug") || focusLower.includes("debug"))
                  problemType = "bugfix"
                else if (focusLower.includes("design") || focusLower.includes("system"))
                  problemType = "system-design"

                onSelectProblem?.(problemType, "medium")
              }}
            >
              <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium">
                {step.step}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{step.focus}</div>
                <div className="text-muted-foreground text-sm">{step.recommendation}</div>
                <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
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
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onSelectProblem?.("dsa", "easy")}
          >
            Practice Easy Problem
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => {
              const weakArea =
                profile?.recentTrend === "declining"
                  ? "dsa"
                  : learningPath[0]?.focus?.toLowerCase().includes("array")
                    ? "dsa"
                    : "dsa"
              onSelectProblem?.(weakArea, "medium")
            }}
          >
            Start Next Challenge
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}