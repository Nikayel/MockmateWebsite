"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import PracticeFeedback from "@/components/PracticeFeedback"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { ArrowLeft, Clock, Calendar, Target, Terminal } from "lucide-react"
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

  // Auth check with delay
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

        // Fetch session from Firestore
        try {
          const sessionRef = doc(db, "interview_sessions", sessionId)
          const sessionSnap = await getDoc(sessionRef)

          if (sessionSnap.exists()) {
            const sessionData = {
              id: sessionSnap.id,
              ...sessionSnap.data()
            } as InterviewSession

            // Verify this session belongs to the current user
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
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-black">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-6xl">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="py-16 text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Session Not Found</h3>
                <p className="text-gray-400 mb-6">The session you're looking for doesn't exist</p>
                <Link href="/sessions">
                  <Button className="bg-accent hover:bg-accent/80 text-black">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sessions
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/sessions">
              <Button variant="ghost" className="text-gray-400 hover:text-white cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sessions
              </Button>
            </Link>
          </div>

          {/* Session Header */}
          <Card className="bg-gray-900/50 border-gray-700 mb-6">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-2xl text-white">{session.topic}</CardTitle>
                    <Badge className={
                      session.difficulty === "easy" ? "bg-green-600" :
                        session.difficulty === "medium" ? "bg-yellow-600" :
                          "bg-red-600"
                    }>
                      {session.difficulty.toUpperCase()}
                    </Badge>
                    {session.completed_at && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Completed
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(session.started_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {session.completed_at && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Duration: {Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)} minutes
                      </div>
                    )}
                  </div>
                </div>
                {session.performance_score && (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-accent">{Math.round(session.performance_score)}%</div>
                    <div className="text-sm text-gray-400">Overall Score</div>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Feedback Section */}
          {session.feedback && session.completed_at ? (
            <PracticeFeedback
              feedback={session.feedback}
              performanceScore={session.performance_score || 0}
              testsPassed={0}
              testsTotal={0}
              timeComplexity={session.time_complexity}
              spaceComplexity={session.space_complexity}
              efficiencyScore={session.efficiency_score}
              elapsedTime={Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000)}
              onRetry={() => router.push(`/interview?scenario=${session.scenario_id}`)}
              onNewProblem={() => router.push('/interview')}
            />
          ) : (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="py-16 text-center">
                <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Session In Progress</h3>
                <p className="text-gray-400 mb-6">This session hasn't been completed yet</p>
                {session.scenario_id && (
                  <Button
                    onClick={() => router.push(`/interview?session=${session.id}&scenario=${session.scenario_id}`)}
                    className="bg-accent hover:bg-accent/80 text-black cursor-pointer"
                  >
                    <Terminal className="mr-2 h-4 w-4" />
                    Continue Session
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
