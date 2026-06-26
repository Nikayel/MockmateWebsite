"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import {
  Clock,
  Calendar,
  ChevronRight,
  Terminal,
  ArrowRight,
  Play,
  FileText,
  CheckCircle,
} from "lucide-react"
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
            const sessionsData = sessionsSnap.docs.map(
              (doc) =>
                ({
                  id: doc.id,
                  ...doc.data(),
                }) as InterviewSession
            )

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
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-600" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-500 delay-75" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 delay-150" />
        </div>
      </main>
    )
  }

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-emerald-400"
      case "medium":
        return "text-amber-400"
      case "hard":
        return "text-red-400"
      default:
        return "text-muted-foreground"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10"
    if (score >= 60) return "text-amber-400 bg-amber-500/10"
    return "text-red-400 bg-red-500/10"
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto max-w-5xl px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="mb-1 text-2xl font-semibold text-foreground">Sessions</h1>
              <p className="text-sm text-muted-foreground">Your practice history</p>
            </div>
            <Link href="/interview">
              <Button className="bg-card font-medium text-zinc-900 hover:bg-zinc-200">
                <Terminal className="mr-2 h-4 w-4" />
                New Session
              </Button>
            </Link>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
                <Clock className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground">No sessions yet</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Start practicing to see your history here
              </p>
              <Link href="/interview">
                <Button className="bg-card font-medium text-zinc-900 hover:bg-zinc-200">
                  <Terminal className="mr-2 h-4 w-4" />
                  Start First Session
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50">
              <div className="divide-y divide-zinc-800/50">
                {sessions.map((session) => {
                  const isInProgress = !session.completed_at
                  const scenarioExists = session.scenario_id
                    ? !!getScenarioById(session.scenario_id)
                    : false
                  // Check if session is in post-interview discussion phase
                  // (submitted code but user hasn't clicked "View Detailed Feedback" yet)
                  const isPostInterviewDiscussion =
                    isInProgress &&
                    session.session_state?.is_post_interview_discussion &&
                    session.feedback_status !== "pending"
                  const canReopen =
                    isInProgress &&
                    !isPostInterviewDiscussion &&
                    session.scenario_id &&
                    scenarioExists
                  const isFeedbackPending =
                    session.feedback_status === "pending" ||
                    session.feedback_status === "processing" ||
                    (session.completed_at &&
                      !session.feedback &&
                      session.feedback_status !== "failed" &&
                      session.feedback_status !== "complete")
                  const isFeedbackFailed = session.feedback_status === "failed"
                  const hasFeedback =
                    session.feedback &&
                    session.completed_at &&
                    session.feedback_status === "complete"
                  // Only show score if feedback generation is complete
                  const score =
                    session.feedback_status === "complete" && session.performance_score
                      ? Math.round(session.performance_score)
                      : null

                  return (
                    <div
                      key={session.id}
                      className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/30"
                    >
                      {/* Score/Status indicator */}
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-sm ${
                          score
                            ? getScoreColor(score)
                            : isFeedbackPending
                              ? "animate-pulse bg-blue-500/10 text-blue-400"
                              : isPostInterviewDiscussion
                                ? "bg-purple-500/10 text-purple-400"
                                : isInProgress
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {score ? score : isFeedbackPending ? "..." : isInProgress ? "..." : "—"}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="truncate font-medium text-foreground">{session.topic}</span>
                          <span
                            className={`text-[10px] tracking-wider uppercase ${getDifficultyStyle(session.difficulty)}`}
                          >
                            {session.difficulty}
                          </span>
                          {isPostInterviewDiscussion && (
                            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-400">
                              Post-Interview
                            </span>
                          )}
                          {isInProgress && !isPostInterviewDiscussion && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                              In Progress
                            </span>
                          )}
                          {isFeedbackPending && !isInProgress && (
                            <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                              Generating Feedback...
                            </span>
                          )}
                          {isFeedbackFailed && !isInProgress && (
                            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">
                              Feedback Failed
                            </span>
                          )}
                          {hasFeedback && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.started_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {session.completed_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round(
                                (new Date(session.completed_at).getTime() -
                                  new Date(session.started_at).getTime()) /
                                  60000
                              )}{" "}
                              min
                            </span>
                          )}
                          {session.type === "dsa" && <span className="text-emerald-500">Free</span>}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="shrink-0">
                        {isPostInterviewDiscussion ? (
                          <Button
                            onClick={() =>
                              router.push(
                                `/interview?session=${session.id}&scenario=${session.scenario_id}&postInterview=true`
                              )
                            }
                            size="sm"
                            className="h-8 bg-purple-600 text-xs text-white hover:bg-purple-500"
                          >
                            <Play className="mr-1.5 h-3 w-3" />
                            Continue Wrap-up
                          </Button>
                        ) : canReopen ? (
                          <Button
                            onClick={() =>
                              router.push(
                                `/interview?session=${session.id}&scenario=${session.scenario_id}`
                              )
                            }
                            size="sm"
                            className="h-8 bg-card text-xs text-zinc-900 hover:bg-zinc-200"
                          >
                            <Play className="mr-1.5 h-3 w-3" />
                            Continue
                          </Button>
                        ) : isFeedbackPending ? (
                          <Link href={`/sessions/${session.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-blue-400 hover:text-blue-300"
                            >
                              <Clock className="mr-1.5 h-3 w-3" />
                              View Status
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        ) : hasFeedback ? (
                          <Link href={`/sessions/${session.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <FileText className="mr-1.5 h-3 w-3" />
                              Details
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        ) : isFeedbackFailed ? (
                          <Link href={`/sessions/${session.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            >
                              View Results
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/sessions/${session.id}`}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-muted-foreground" />
                          </Link>
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
