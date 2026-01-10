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
              ...sessionSnap.data(),
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
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-600" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-500 delay-75" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 delay-150" />
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-zinc-950">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="py-20 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                <Clock className="h-7 w-7 text-zinc-600" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Session not found</h3>
              <p className="mb-6 text-sm text-zinc-500">
                The session you're looking for doesn't exist
              </p>
              <Link href="/sessions">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
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
      case "easy":
        return "text-emerald-400 bg-emerald-500/10"
      case "medium":
        return "text-amber-400 bg-amber-500/10"
      case "hard":
        return "text-red-400 bg-red-500/10"
      default:
        return "text-zinc-400 bg-zinc-500/10"
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto max-w-5xl px-4">
          {/* Back Button + Session Header */}
          <div className="mb-6">
            <Link href="/sessions">
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 -ml-2 h-8 text-zinc-500 hover:text-white"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Sessions
              </Button>
            </Link>

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-white">{session.topic}</h1>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] tracking-wider uppercase ${getDifficultyStyle(session.difficulty)}`}
                  >
                    {session.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(session.started_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {session.completed_at && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.round(
                        (new Date(session.completed_at).getTime() -
                          new Date(session.started_at).getTime()) /
                          60000
                      )}{" "}
                      min
                    </span>
                  )}
                </div>
              </div>

              {session.performance_score && (
                <div className="text-right">
                  <div
                    className={`text-3xl font-light ${
                      session.performance_score >= 80
                        ? "text-emerald-400"
                        : session.performance_score >= 60
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {Math.round(session.performance_score)}%
                  </div>
                  <div className="text-[10px] tracking-wider text-zinc-500 uppercase">Score</div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Section */}
          {session.feedback && session.completed_at ? (
            <PracticeFeedback
              feedback={session.feedback}
              performanceScore={session.performance_score || 0}
              technicalScore={session.technical_score ?? session.mastery_score}
              scoreBreakdown={session.score_breakdown}
              testsPassed={
                session.tests_passed ??
                (session.test_results?.filter((t: any) => t.passed).length || 0)
              }
              testsTotal={session.tests_total ?? (session.test_results?.length || 0)}
              timeComplexity={session.time_complexity}
              spaceComplexity={session.space_complexity}
              efficiencyScore={session.efficiency_score}
              elapsedTime={Math.round(
                (new Date(session.completed_at).getTime() -
                  new Date(session.started_at).getTime()) /
                  1000
              )}
              userId={firebaseUser?.uid}
              problemType={session.type}
              difficulty={session.difficulty}
              problemTitle={session.topic}
              code={session.final_code || session.session_state?.code}
              language={session.language || session.session_state?.language || "javascript"}
              chatMessages={session.session_state?.chat_messages}
              interviewerMessages={session.session_state?.interviewer_messages}
              onRetry={() => router.push(`/interview?scenario=${session.scenario_id}`)}
              onNewProblem={() => router.push("/interview")}
            />
          ) : (
            <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-12 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800">
                <Terminal className="h-7 w-7 text-zinc-500" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Session in progress</h3>
              <p className="mb-6 text-sm text-zinc-500">This session hasn't been completed yet</p>
              {session.scenario_id && (
                <Button
                  onClick={() =>
                    router.push(`/interview?session=${session.id}&scenario=${session.scenario_id}`)
                  }
                  className="bg-white text-zinc-900 hover:bg-zinc-200"
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
