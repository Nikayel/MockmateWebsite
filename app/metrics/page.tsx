"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target,
  Award,
  Calendar,
  Zap,
  Brain,
  Code,
  ArrowRight,
  Flame,
  Star,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface MetricsData {
  overview: {
    totalSessions: number
    totalPracticeMinutes: number
    totalPracticeHours: number
    averageScore: number
    lastSessionAt: string | null
  }
  patterns: Array<{
    pattern: string
    displayName: string
    sessions: number
    averageScore: number
    bestScore: number
    proficiency: 'novice' | 'learning' | 'practicing' | 'proficient' | 'expert'
  }>
  difficulty: Array<{
    difficulty: string
    sessions: number
    averageScore: number
  }>
  trends: {
    daily: Array<{ date: string; score: number; sessions: number }>
    weeklyAverage: number
    trend: 'improving' | 'stable' | 'declining'
    trendDescription: string
  }
  recentSessions: Array<{
    id: string
    scenarioId: string
    pattern: string
    difficulty: string
    performanceScore: number
    durationMinutes: number
    completedAt: string
    feedback: string
  }>
  usage: {
    totalCost: number
    totalRequests: number
    budgetUsedPercent: number
    budgetRemaining: number
  } | null
}

const proficiencyColors = {
  novice: 'bg-gray-500',
  learning: 'bg-blue-500',
  practicing: 'bg-yellow-500',
  proficient: 'bg-green-500',
  expert: 'bg-purple-500',
}

const proficiencyLabels = {
  novice: 'Novice',
  learning: 'Learning',
  practicing: 'Practicing',
  proficient: 'Proficient',
  expert: 'Expert',
}

const difficultyColors = {
  easy: 'text-green-400 bg-green-500/20 border-green-500/30',
  medium: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
  hard: 'text-red-400 bg-red-500/20 border-red-500/30',
}

export default function MetricsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading, initialized } = useAuth()
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMetrics = async () => {
      if (!initialized || authLoading) return

      if (!firebaseUser) {
        router.push("/login?redirect=metrics")
        return
      }

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/user/metrics?days=30", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error("Failed to load metrics")
        }

        const data = await response.json()
        if (data.success) {
          setMetrics(data.data)
        } else {
          setError(data.error || "Failed to load metrics")
        }
      } catch (err) {
        console.error("Error loading metrics:", err)
        setError("Failed to load your metrics. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [firebaseUser, authLoading, initialized, router])

  if (authLoading || !initialized || loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="text-center py-16">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const hasData = metrics && metrics.overview.totalSessions > 0

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-heading font-bold text-white mb-2 flex items-center gap-3">
              <BarChart3 className="h-10 w-10 text-[#00d9ff]" />
              Your Performance Metrics
            </h1>
            <p className="text-gray-400">
              Track your progress, identify patterns, and level up your interview skills
            </p>
          </div>

          {!hasData ? (
            /* Empty State */
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="py-16 text-center">
                <div className="max-w-md mx-auto">
                  <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">No Sessions Yet</h2>
                  <p className="text-gray-400 mb-6">
                    Complete your first practice session to start tracking your performance
                    and see detailed analytics here.
                  </p>
                  <Link href="/interview">
                    <Button className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
                      Start Your First Session
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Total Sessions</p>
                        <p className="text-3xl font-bold text-white">{metrics.overview.totalSessions}</p>
                      </div>
                      <div className="p-3 bg-[#00d9ff]/20 rounded-lg">
                        <Code className="h-6 w-6 text-[#00d9ff]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Practice Time</p>
                        <p className="text-3xl font-bold text-white">{metrics.overview.totalPracticeHours}h</p>
                      </div>
                      <div className="p-3 bg-purple-500/20 rounded-lg">
                        <Clock className="h-6 w-6 text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Average Score</p>
                        <p className="text-3xl font-bold text-white">{metrics.overview.averageScore}%</p>
                      </div>
                      <div className="p-3 bg-green-500/20 rounded-lg">
                        <Target className="h-6 w-6 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">Weekly Trend</p>
                        <div className="flex items-center gap-2">
                          <p className="text-3xl font-bold text-white">{metrics.trends.weeklyAverage}%</p>
                          {metrics.trends.trend === 'improving' && <TrendingUp className="h-5 w-5 text-green-400" />}
                          {metrics.trends.trend === 'declining' && <TrendingDown className="h-5 w-5 text-red-400" />}
                          {metrics.trends.trend === 'stable' && <Minus className="h-5 w-5 text-gray-400" />}
                        </div>
                      </div>
                      <div className="p-3 bg-yellow-500/20 rounded-lg">
                        <Flame className="h-6 w-6 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trend Message */}
              <Card className={`mb-8 border-l-4 ${
                metrics.trends.trend === 'improving' ? 'border-l-green-500 bg-green-500/5' :
                metrics.trends.trend === 'declining' ? 'border-l-red-500 bg-red-500/5' :
                'border-l-gray-500 bg-gray-500/5'
              } bg-gray-900/50 border-gray-700`}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    {metrics.trends.trend === 'improving' && <TrendingUp className="h-5 w-5 text-green-400" />}
                    {metrics.trends.trend === 'declining' && <TrendingDown className="h-5 w-5 text-red-400" />}
                    {metrics.trends.trend === 'stable' && <Minus className="h-5 w-5 text-gray-400" />}
                    <p className="text-gray-300">{metrics.trends.trendDescription}</p>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="patterns" className="mb-8">
                <TabsList className="bg-gray-800 border-gray-700">
                  <TabsTrigger value="patterns" className="data-[state=active]:bg-gray-700">
                    <Brain className="h-4 w-4 mr-2" />
                    Pattern Mastery
                  </TabsTrigger>
                  <TabsTrigger value="sessions" className="data-[state=active]:bg-gray-700">
                    <Calendar className="h-4 w-4 mr-2" />
                    Recent Sessions
                  </TabsTrigger>
                  <TabsTrigger value="difficulty" className="data-[state=active]:bg-gray-700">
                    <Zap className="h-4 w-4 mr-2" />
                    By Difficulty
                  </TabsTrigger>
                </TabsList>

                {/* Pattern Mastery Tab */}
                <TabsContent value="patterns">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Brain className="h-5 w-5 text-[#00d9ff]" />
                        Pattern Mastery
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Your proficiency across different DSA patterns
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {metrics.patterns.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          Complete sessions to see your pattern mastery
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {metrics.patterns.map((pattern) => (
                            <div key={pattern.pattern} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-white font-medium">{pattern.displayName}</span>
                                  <Badge className={`${proficiencyColors[pattern.proficiency]} text-white text-xs`}>
                                    {proficiencyLabels[pattern.proficiency]}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-gray-400">{pattern.sessions} sessions</span>
                                  <span className="text-gray-400">Best: {pattern.bestScore}%</span>
                                  <span className="text-[#00d9ff] font-mono">{pattern.averageScore}%</span>
                                </div>
                              </div>
                              <Progress value={pattern.averageScore} className="h-2" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Recent Sessions Tab */}
                <TabsContent value="sessions">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-[#00d9ff]" />
                        Recent Sessions
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Your latest practice sessions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {metrics.recentSessions.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          No sessions yet
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {metrics.recentSessions.map((session) => (
                            <Link
                              key={session.id}
                              href={`/sessions/${session.id}`}
                              className="block p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-white font-medium capitalize">
                                      {(session.pattern || 'unknown').replace(/-/g, ' ')}
                                    </span>
                                    <Badge className={difficultyColors[session.difficulty as keyof typeof difficultyColors]}>
                                      {session.difficulty.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {session.durationMinutes} min
                                    </span>
                                    <span>
                                      {new Date(session.completedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-2xl font-bold ${
                                    session.performanceScore >= 80 ? 'text-green-400' :
                                    session.performanceScore >= 60 ? 'text-yellow-400' :
                                    'text-red-400'
                                  }`}>
                                    {session.performanceScore}%
                                  </div>
                                  <Badge variant="outline" className={`text-xs ${
                                    session.feedback === 'excellent' ? 'border-green-500 text-green-400' :
                                    session.feedback === 'good' ? 'border-blue-500 text-blue-400' :
                                    session.feedback === 'average' ? 'border-yellow-500 text-yellow-400' :
                                    'border-red-500 text-red-400'
                                  }`}>
                                    {session.feedback}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Difficulty Tab */}
                <TabsContent value="difficulty">
                  <Card className="bg-gray-900/50 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="h-5 w-5 text-[#00d9ff]" />
                        Performance by Difficulty
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        How you perform across different difficulty levels
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {metrics.difficulty.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          Complete sessions to see difficulty breakdown
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {['easy', 'medium', 'hard'].map((diff) => {
                            const data = metrics.difficulty.find(d => d.difficulty === diff)
                            return (
                              <div
                                key={diff}
                                className={`p-6 rounded-lg border ${
                                  diff === 'easy' ? 'border-green-500/30 bg-green-500/5' :
                                  diff === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5' :
                                  'border-red-500/30 bg-red-500/5'
                                }`}
                              >
                                <div className="text-center">
                                  <Badge className={difficultyColors[diff as keyof typeof difficultyColors]}>
                                    {diff.toUpperCase()}
                                  </Badge>
                                  {data ? (
                                    <>
                                      <div className={`text-4xl font-bold mt-4 ${
                                        diff === 'easy' ? 'text-green-400' :
                                        diff === 'medium' ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>
                                        {data.averageScore}%
                                      </div>
                                      <p className="text-gray-400 text-sm mt-1">
                                        {data.sessions} sessions
                                      </p>
                                    </>
                                  ) : (
                                    <div className="mt-4">
                                      <p className="text-gray-500 text-sm">No sessions yet</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Call to Action */}
              <Card className="bg-gradient-to-r from-[#00d9ff]/10 to-purple-500/10 border-[#00d9ff]/30">
                <CardContent className="py-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Ready for your next challenge?</h3>
                      <p className="text-gray-400">Keep practicing to improve your metrics and ace your interviews.</p>
                    </div>
                    <Link href="/interview">
                      <Button className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
                        <Star className="mr-2 h-4 w-4" />
                        Start Practice Session
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
