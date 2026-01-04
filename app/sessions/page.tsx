"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { Clock, Calendar, ChevronRight, Terminal, ArrowRight, Play, FileText, CheckCircle } from "lucide-react"
import { InterviewSession } from "@/lib/types"
import Link from "next/link"
import { getScenarioById } from "@/lib/scenarios"

export default function SessionsPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [loading, setLoading] = useState(true)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)

  useEffect(() => {
    if (!initialized || authLoading) return
    const timer = setTimeout(() => {
      setAuthCheckComplete(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [initialized, authLoading])

  useEffect(() => {
    if (authLoading || !initialized || !authCheckComplete) return

    const loadSessions = async () => {
      try {
        if (!firebaseUser) {
          router.push("/login?redirect=sessions")
          return
        }

        try {
          const sessionsQuery = query(
            collection(db, "interview_sessions"),
            where("user_id", "==", firebaseUser.uid)
          )
          const sessionsSnap = await getDocs(sessionsQuery)

          if (!sessionsSnap.empty) {
            const sessionsData = sessionsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as InterviewSession))

            sessionsData.sort((a, b) => {
              const dateA = new Date(a.started_at).getTime()
              const dateB = new Date(b.started_at).getTime()
              return dateB - dateA
            })

            setSessions(sessionsData)
          }
        } catch (error) {
          console.error("Error fetching sessions:", error)
        }
      } catch (error) {
        console.error("Error loading sessions:", error)
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [authLoading, firebaseUser, router, initialized, authCheckComplete])

  if (loading || authLoading || !initialized) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-75" />
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse delay-150" />
        </div>
      </main>
    )
  }

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-400'
      case 'medium': return 'text-amber-400'
      case 'hard': return 'text-red-400'
      default: return 'text-zinc-400'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10'
    if (score >= 60) return 'text-amber-400 bg-amber-500/10'
    return 'text-red-400 bg-red-500/10'
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white mb-1">Sessions</h1>
              <p className="text-zinc-500 text-sm">Your practice history</p>
            </div>
            <Link href="/interview">
              <Button className="bg-white hover:bg-zinc-200 text-zinc-900 font-medium">
                <Terminal className="mr-2 h-4 w-4" />
                New Session
              </Button>
            </Link>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-5">
                <Clock className="w-7 h-7 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No sessions yet</h3>
              <p className="text-zinc-500 text-sm mb-6">Start practicing to see your history here</p>
              <Link href="/interview">
                <Button className="bg-white hover:bg-zinc-200 text-zinc-900 font-medium">
                  <Terminal className="mr-2 h-4 w-4" />
                  Start First Session
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden">
              <div className="divide-y divide-zinc-800/50">
                {sessions.map((session) => {
                  const isInProgress = !session.completed_at
                  const scenarioExists = session.scenario_id ? !!getScenarioById(session.scenario_id) : false
                  const canReopen = isInProgress && session.scenario_id && scenarioExists
                  const hasFeedback = session.feedback && session.completed_at
                  const score = session.performance_score ? Math.round(session.performance_score) : null

                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors group"
                    >
                      {/* Score/Status indicator */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono text-sm shrink-0 ${
                        score ? getScoreColor(score) :
                        isInProgress ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {score ? score : isInProgress ? '...' : '—'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium truncate">{session.topic}</span>
                          <span className={`text-[10px] uppercase tracking-wider ${getDifficultyStyle(session.difficulty)}`}>
                            {session.difficulty}
                          </span>
                          {isInProgress && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                              In Progress
                            </span>
                          )}
                          {hasFeedback && (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {session.completed_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min
                            </span>
                          )}
                          {session.type === 'dsa' && (
                            <span className="text-emerald-500">Free</span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="shrink-0">
                        {canReopen ? (
                          <Button
                            onClick={() => router.push(`/interview?session=${session.id}&scenario=${session.scenario_id}`)}
                            size="sm"
                            className="bg-white hover:bg-zinc-200 text-zinc-900 h-8 text-xs"
                          >
                            <Play className="mr-1.5 h-3 w-3" />
                            Continue
                          </Button>
                        ) : hasFeedback ? (
                          <Link href={`/sessions/${session.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white h-8 text-xs"
                            >
                              <FileText className="mr-1.5 h-3 w-3" />
                              Details
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-600" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
