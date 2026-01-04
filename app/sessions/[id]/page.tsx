"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import PracticeFeedback from "@/components/PracticeFeedback"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { ArrowLeft, Clock, Calendar, Terminal } from "lucide-react"
import { InterviewSession } from "@/lib/types"
import Link from "next/link"

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [session, setSession] = useState<InterviewSession | null>(null)
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

    const loadSession = async () => {
      try {
        if (!firebaseUser) {
          router.push("/login?redirect=sessions")
          return
        }

        try {
          const sessionRef = doc(db, "interview_sessions", sessionId)
          const sessionSnap = await getDoc(sessionRef)

          if (sessionSnap.exists()) {
            const sessionData = {
              id: sessionSnap.id,
              ...sessionSnap.data()
            } as InterviewSession

            if (sessionData.user_id !== firebaseUser.uid) {
              router.push("/sessions")
              return
            }

            setSession(sessionData)
          } else {
            router.push("/sessions")
          }
        } catch (error) {
          console.error("Error fetching session:", error)
          router.push("/sessions")
        }
      } catch (error) {
        console.error("Error loading session:", error)
        router.push("/sessions")
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [authLoading, firebaseUser, router, initialized, authCheckComplete, sessionId])

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

  if (!session) {
    return (
      <main className="min-h-screen bg-zinc-950">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-5">
                <Clock className="w-7 h-7 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Session not found</h3>
              <p className="text-zinc-500 text-sm mb-6">The session you're looking for doesn't exist</p>
              <Link href="/sessions">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sessions
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-400 bg-emerald-500/10'
      case 'medium': return 'text-amber-400 bg-amber-500/10'
      case 'hard': return 'text-red-400 bg-red-500/10'
      default: return 'text-zinc-400 bg-zinc-500/10'
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back Button + Session Header */}
          <div className="mb-6">
            <Link href="/sessions">
              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white mb-4 -ml-2 h-8">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Sessions
              </Button>
            </Link>

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-xl font-semibold text-white">{session.topic}</h1>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${getDifficultyStyle(session.difficulty)}`}>
                    {session.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(session.started_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  {session.completed_at && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min
                    </span>
                  )}
                </div>
              </div>

              {session.performance_score && (
                <div className="text-right">
                  <div className={`text-3xl font-light ${
                    session.performance_score >= 80 ? 'text-emerald-400' :
                    session.performance_score >= 60 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {Math.round(session.performance_score)}%
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Score</div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Section */}
          {session.feedback && session.completed_at ? (
            <PracticeFeedback
              feedback={session.feedback}
              performanceScore={session.performance_score || 0}
              testsPassed={session.tests_passed ?? (session.test_results?.filter((t: any) => t.passed).length || 0)}
              testsTotal={session.tests_total ?? (session.test_results?.length || 0)}
              timeComplexity={session.time_complexity}
              spaceComplexity={session.space_complexity}
              efficiencyScore={session.efficiency_score}
              elapsedTime={Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000)}
              userId={firebaseUser?.uid}
              problemType={session.type}
              difficulty={session.difficulty}
              problemTitle={session.topic}
              code={session.final_code || session.session_state?.code}
              language={session.language || session.session_state?.language || "javascript"}
              onRetry={() => router.push(`/interview?scenario=${session.scenario_id}`)}
              onNewProblem={() => router.push('/interview')}
            />
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-5">
                <Terminal className="w-7 h-7 text-zinc-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Session in progress</h3>
              <p className="text-zinc-500 text-sm mb-6">This session hasn't been completed yet</p>
              {session.scenario_id && (
                <Button
                  onClick={() => router.push(`/interview?session=${session.id}&scenario=${session.scenario_id}`)}
                  className="bg-white hover:bg-zinc-200 text-zinc-900"
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  Continue Session
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
