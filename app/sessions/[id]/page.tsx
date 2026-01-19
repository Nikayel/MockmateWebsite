"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import PracticeFeedback from "@/components/PracticeFeedback"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { ArrowLeft, Clock, Calendar, Terminal, Loader2 } from "lucide-react"
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

  // Load session data
  const loadSession = useCallback(async () => {
    try {
      if (!firebaseUser) {
        router.push("/login?redirect=sessions")
        return null
      }

      const sessionRef = doc(db, "interview_sessions", sessionId)
      const sessionSnap = await getDoc(sessionRef)

      if (sessionSnap.exists()) {
        const sessionData = {
          id: sessionSnap.id,
          ...sessionSnap.data(),
        } as InterviewSession

        if (sessionData.user_id !== firebaseUser.uid) {
          router.push("/sessions")
          return null
        }

        // If score_breakdown is missing, try to fetch from session_summaries subcollection
        if (!sessionData.score_breakdown && sessionData.user_id) {
          try {
            const summaryRef = doc(db, "users", sessionData.user_id, "session_summaries", sessionId)
            const summarySnap = await getDoc(summaryRef)
            if (summarySnap.exists()) {
              const summaryData = summarySnap.data()
              // Merge scoreBreakdown from session_summaries
              if (summaryData.scoreBreakdown) {
                sessionData.score_breakdown = summaryData.scoreBreakdown
              }
            }
          } catch {
            // Ignore errors - score_breakdown is optional
          }
        }

        return sessionData
      } else {
        router.push("/sessions")
        return null
      }
    } catch (error) {
      console.error("Error fetching session:", error)
      router.push("/sessions")
      return null
    }
  }, [firebaseUser, router, sessionId])

  useEffect(() => {
    if (authLoading || !initialized || !authCheckComplete) return

    const init = async () => {
      const sessionData = await loadSession()
      if (sessionData) {
        setSession(sessionData)
      }
      setLoading(false)
    }

    init()
  }, [authLoading, initialized, authCheckComplete, loadSession])

  // Poll for feedback completion when session is in "pending" state
  useEffect(() => {
    // Only poll if session is evaluating
    if (!session || session.feedback_status !== "pending") return

    const pollInterval = setInterval(async () => {
      const updatedSession = await loadSession()
      if (updatedSession) {
        setSession(updatedSession)
        // Stop polling once feedback is complete or failed
        if (updatedSession.feedback_status !== "pending") {
          clearInterval(pollInterval)
        }
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [session?.feedback_status, loadSession])

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
          {/* Handle completed sessions - show feedback if available */}
          {/* Note: Legacy sessions may not have feedback_status, treat completed_at + feedback as complete */}
          {session.feedback &&
          session.completed_at &&
          (session.feedback_status === "complete" || !session.feedback_status) ? (
            <PracticeFeedback
              feedback={session.feedback}
              performanceScore={session.performance_score || 0}
              technicalScore={session.technical_score ?? session.mastery_score}
              scoreBreakdown={session.score_breakdown}
              constitutionalAICritique={session.constitutional_ai_critique}
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
              onNewProblem={() => router.push("/interview")}
            />
          ) : session.feedback_status === "pending" ? (
            // Session is being evaluated - show evaluating state
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-12 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
                <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Evaluating your submission</h3>
              <p className="mb-4 text-sm text-zinc-400">
                Your solution is being reviewed by our AI. This usually takes 30-60 seconds.
              </p>
              <p className="text-xs text-zinc-500">
                You can leave this page - we'll have your feedback ready when you return.
              </p>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="mt-6 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Go to Dashboard
              </Button>
            </div>
          ) : session.feedback_status === "failed" ? (
            // Feedback generation failed - allow retry
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-12 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
                <Terminal className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Evaluation failed</h3>
              <p className="mb-6 text-sm text-zinc-400">
                We encountered an issue while evaluating your submission. Please try again.
              </p>
              {session.scenario_id && (
                <Button
                  onClick={() =>
                    router.push(`/interview?session=${session.id}&scenario=${session.scenario_id}`)
                  }
                  className="bg-white text-zinc-900 hover:bg-zinc-200"
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  Retry Submission
                </Button>
              )}
            </div>
          ) : (
            // Session truly in progress - allow continuing
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
