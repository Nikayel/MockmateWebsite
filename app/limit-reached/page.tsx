"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { checkUsageLimit } from "@/lib/firestore-helpers"
import { User as UserType } from "@/lib/types"
import { AlertCircle, Crown, CheckCircle, ArrowRight, Clock } from "lucide-react"

export default function LimitReachedPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [usageLimit, setUsageLimit] = useState<{
    used: number
    limit: number
    allowed: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !initialized) return

    const checkAuth = async () => {
      try {
        if (!firebaseUser) {
          router.push("/login?redirect=limit-reached")
          return
        }

        // Check usage limit
        const usage = await checkUsageLimit(firebaseUser.uid)
        setUsageLimit(usage)

        // If they have sessions available, redirect to interview
        if (usage.allowed) {
          router.push("/interview")
        }
      } catch (error) {
        console.error("Error loading limit page:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [authLoading, firebaseUser, router, initialized])

  if (loading || authLoading || !initialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#c4703f]"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto max-w-4xl px-4">
          <Card className="glass-effect border-border bg-card/50">
            <CardContent className="p-12 text-center">
              <div className="mb-8">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20">
                  <AlertCircle className="h-10 w-10 text-yellow-400" />
                </div>
                <h1 className="font-heading mb-4 text-4xl font-bold text-foreground">
                  Monthly Limit Reached
                </h1>
                <p className="mb-2 text-xl text-muted-foreground">
                  You've used all {usageLimit?.limit || 8} free sessions this month
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Your limit resets at the start of next month</span>
                </div>
              </div>

              <div className="mb-8 rounded-lg border border-border bg-muted/50 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">Sessions Used</p>
                    <p className="text-3xl font-bold text-foreground">
                      {usageLimit?.used || 0} / {usageLimit?.limit || 8}
                    </p>
                  </div>
                  <Badge className="border-red-500/30 bg-red-500/20 px-4 py-2 text-lg text-red-400">
                    Limit Reached
                  </Badge>
                </div>
              </div>

              <div className="mb-8 rounded-lg border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-8">
                <div className="mb-4 flex items-center justify-center space-x-2">
                  <Crown className="h-6 w-6 text-yellow-400" />
                  <h2 className="text-2xl font-bold text-foreground">Upgrade to Pro</h2>
                </div>
                <p className="mb-6 text-muted-foreground">
                  Get unlimited interview sessions and unlock advanced features!
                </p>

                <div className="mb-6 grid grid-cols-1 gap-4 text-left md:grid-cols-2">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                    <div>
                      <p className="font-semibold text-foreground">Unlimited Sessions</p>
                      <p className="text-sm text-muted-foreground">Practice as much as you want</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                    <div>
                      <p className="font-semibold text-foreground">500+ Problems</p>
                      <p className="text-sm text-muted-foreground">Access to extensive problem library</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                    <div>
                      <p className="font-semibold text-foreground">Advanced Challenges</p>
                      <p className="text-sm text-muted-foreground">Hard problems and system design</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                    <div>
                      <p className="font-semibold text-foreground">Analytics & Insights</p>
                      <p className="text-sm text-muted-foreground">Track your progress and performance</p>
                    </div>
                  </div>
                </div>

                <Link href="/upgrade">
                  <Button className="w-full bg-yellow-500 px-8 py-6 text-lg text-foreground hover:bg-yellow-600 md:w-auto">
                    <Crown className="mr-2 h-5 w-5" />
                    Upgrade to Pro - $25/month
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    className="border-border bg-transparent text-muted-foreground hover:bg-muted"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button
                    variant="outline"
                    className="border-border bg-transparent text-muted-foreground hover:bg-muted"
                  >
                    View Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  )
}
