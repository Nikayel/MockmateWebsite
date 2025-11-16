"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import SessionFeedbackCard from "@/components/SessionFeedbackCard"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { Clock, Calendar, Target, TrendingUp, Terminal, ArrowRight, Play, ChevronDown, ChevronUp, FileText } from "lucide-react"
import { User as UserType, InterviewSession } from "@/lib/types"
import Link from "next/link"
import { getScenarioById } from "@/lib/scenarios"

export default function SessionsPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)

  // Separate effect to handle auth check with delay to prevent race condition on refresh
  useEffect(() => {
    if (!initialized || authLoading) return

    // Give Firebase a moment to restore session on page refresh before checking auth
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

        // Fetch sessions from Firestore
        try {
          // Query without orderBy first to avoid index requirement
          const sessionsQuery = query(
            collection(db, "interview_sessions"),
            where("user_id", "==", firebaseUser.uid)
          )
          const sessionsSnap = await getDocs(sessionsQuery)

          if (!sessionsSnap.empty) {
            // Sort in memory to avoid composite index requirement
            const sessionsData = sessionsSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as InterviewSession))

            // Sort by started_at descending
            sessionsData.sort((a, b) => {
              const dateA = new Date(a.started_at).getTime()
              const dateB = new Date(b.started_at).getTime()
              return dateB - dateA
            })

            setSessions(sessionsData)
          }
        } catch (error) {
          console.error("Error fetching sessions:", error)
          // Sessions collection might not exist yet
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
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5733]"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-heading font-bold text-white mb-2">Interview Sessions</h1>
              <p className="text-gray-400">View your practice history and performance</p>
            </div>
            <Link href="/interview">
              <Button className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white">
                <Terminal className="mr-2 h-4 w-4" />
                Start New Session
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="py-16 text-center">
                <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Sessions Yet</h3>
                <p className="text-gray-400 mb-6">Start practicing to see your interview sessions here</p>
                <Link href="/interview">
                  <Button className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white">
                    <Terminal className="mr-2 h-4 w-4" />
                    Start Your First Session
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => {
                const isInProgress = !session.completed_at
                const canReopen = isInProgress && session.scenario_id
                const isExpanded = expandedSessionId === session.id
                const hasFeedback = session.feedback && session.completed_at

                return (
                  <Card key={session.id} className="bg-gray-900/50 border-gray-700 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-white">{session.topic}</CardTitle>
                        <Badge className={
                          session.difficulty === "easy" ? "bg-green-600" :
                            session.difficulty === "medium" ? "bg-yellow-600" :
                              "bg-red-600"
                        }>
                          {session.difficulty.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(session.started_at).toLocaleDateString()}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {session.performance_score && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Performance</span>
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="h-4 w-4 text-[#ff5733]" />
                              <span className="text-white font-semibold">{Math.round(session.performance_score)}%</span>
                            </div>
                          </div>
                        )}
                        {session.completed_at && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Status</span>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Completed
                            </Badge>
                          </div>
                        )}
                        {!session.completed_at && (
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-gray-400 text-sm">Status</span>
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              In Progress
                            </Badge>
                          </div>
                        )}

                        {/* Feedback Section */}
                        {hasFeedback && (
                          <>
                            <Button
                              onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                              variant="outline"
                              className="w-full border-white/20 text-gray-300 hover:bg-white/10 hover:text-white"
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              {isExpanded ? "Hide Feedback" : "View Feedback"}
                              {isExpanded ? (
                                <ChevronUp className="ml-auto h-4 w-4" />
                              ) : (
                                <ChevronDown className="ml-auto h-4 w-4" />
                              )}
                            </Button>

                            {isExpanded && (
                              <div className="mt-3">
                                <SessionFeedbackCard
                                  feedback={session.feedback || ""}
                                  performanceScore={session.performance_score}
                                />
                              </div>
                            )}
                          </>
                        )}

                        {canReopen && (
                          <Button
                            onClick={() => {
                              // Navigate to interview page with scenario ID
                              router.push(`/interview?session=${session.id}&scenario=${session.scenario_id}`)
                            }}
                            className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80 text-white"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Continue Practice
                          </Button>
                        )}
                        {session.type === 'dsa' && (
                          <p className="text-xs text-green-400 text-center mt-2">
                            Free to practice
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

