"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { useAuth } from "@/lib/auth-context"
import { getDbLazy } from "@/lib/firebase-lazy"
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
import { getScenarioById } from "@/lib/scenarios/index"
import { clampPracticeMinutes, isTruncatedDuration } from "@/lib/session-duration"

export default function SessionsPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [loading, setLoading] = useState(true)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  // Scenario ids that resolve to a real scenario, so the "Continue" affordance
  // only enables for sessions that can actually be reopened. Resolved lazily
  // (see effect below) instead of eagerly importing the full scenario dataset.
  const [existingScenarioIds, setExistingScenarioIds] = useState<Set<string>>(new Set())

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
          const db = await getDbLazy()
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

  // Resolve which in-progress sessions still point at a real scenario. Only
  // in-progress sessions expose the "Continue" reopen affordance, so we lazily
  // check just those ids via the same on-demand resolver the reopen flow uses,
  // keeping the full scenario dataset out of this page's bundle.
  useEffect(() => {
    const scenarioIds = Array.from(
      new Set(
        sessions
          .filter((session) => !session.completed_at && session.scenario_id)
          .map((session) => session.scenario_id as string)
      )
    )
    if (scenarioIds.length === 0) return

    let cancelled = false
    const resolveExistingScenarios = async () => {
      const resolved = await Promise.all(
        scenarioIds.map(async (id) => ({
          id,
          exists: Boolean(await getScenarioById(id)),
        }))
      )
      if (cancelled) return
      setExistingScenarioIds((previous) => {
        const next = new Set(previous)
        for (const { id, exists } of resolved) {
          if (exists) next.add(id)
        }
        return next
      })
    }

    resolveExistingScenarios()
    return () => {
      cancelled = true
    }
  }, [sessions])

  if (loading || authLoading || !initialized) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="bg-muted h-2 w-2 animate-pulse rounded-full" />
          <div className="bg-muted h-2 w-2 animate-pulse rounded-full delay-75" />
          <div className="bg-muted h-2 w-2 animate-pulse rounded-full delay-150" />
        </div>
      </main>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10"
    if (score >= 60) return "text-amber-400 bg-amber-500/10"
    return "text-red-400 bg-red-500/10"
  }

  return (
    <main className="bg-background min-h-screen">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto max-w-5xl px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-foreground mb-1 text-2xl font-semibold">Sessions</h1>
              <p className="text-muted-foreground text-sm">Your practice history</p>
            </div>
            <Link href="/interview">
              <Button className="bg-card text-foreground hover:bg-muted font-medium">
                <Terminal className="mr-2 h-4 w-4" />
                New Session
              </Button>
            </Link>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="py-20 text-center">
              <div className="border-border bg-card mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border">
                <Clock className="text-muted-foreground h-7 w-7" />
              </div>
              <h3 className="text-foreground mb-2 text-lg font-medium">No sessions yet</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Start practicing to see your history here
              </p>
              <Link href="/interview">
                <Button className="bg-card text-foreground hover:bg-muted font-medium">
                  <Terminal className="mr-2 h-4 w-4" />
                  Start First Session
                </Button>
              </Link>
            </div>
          ) : (
            <div className="border-border/50 bg-card/50 overflow-hidden rounded-2xl border">
              <div className="divide-border divide-y">
                {sessions.map((session) => {
                  const isInProgress = !session.completed_at
                  const scenarioExists = session.scenario_id
                    ? existingScenarioIds.has(session.scenario_id)
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
                      className="group hover:bg-muted/30 flex items-center gap-4 p-4 transition-colors"
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
                          <span className="text-foreground truncate font-medium">
                            {session.topic}
                          </span>
                          <span
                            className={`text-[10px] tracking-wider uppercase ${difficultyColorClass(session.difficulty, "textOnLight")}`}
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
                        <div className="text-muted-foreground flex items-center gap-3 text-xs">
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
                              {clampPracticeMinutes(session.started_at, session.completed_at)}
                              {isTruncatedDuration(session.started_at, session.completed_at)
                                ? "+"
                                : ""}{" "}
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
                            className="bg-accent text-accent-foreground hover:bg-accent/90 h-8 text-xs"
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
                            className="bg-card text-foreground hover:bg-muted h-8 text-xs"
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
                              className="text-muted-foreground hover:text-foreground h-8 text-xs"
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
                            <ChevronRight className="text-muted-foreground hover:text-muted-foreground h-4 w-4" />
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
