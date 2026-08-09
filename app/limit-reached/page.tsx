"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { checkUsageLimit } from "@/lib/firestore-helpers"
import { PRICING_CONFIG } from "@/lib/config"
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
  const [checkFailed, setCheckFailed] = useState(false)

  const runUsageCheck = useCallback(async () => {
    setLoading(true)
    setCheckFailed(false)

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
      setUsageLimit(null)
      setCheckFailed(true)
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, router])

  useEffect(() => {
    if (authLoading || !initialized) return
    runUsageCheck()
  }, [authLoading, initialized, runUsageCheck])

  if (loading || authLoading || !initialized) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-accent h-12 w-12 animate-spin rounded-full border-b-2"></div>
      </main>
    )
  }

  // Never render the limit wall from a failed or missing usage check: a null
  // usageLimit here means the lookup errored, so show a retry instead of a
  // false "0 sessions left" wall.
  if (checkFailed || !usageLimit) {
    return (
      <main className="bg-background min-h-screen">
        <Header />

        <div className="pt-24 pb-16">
          <div className="container mx-auto max-w-4xl px-4">
            <Card className="glass-effect border-border bg-card/50">
              <CardContent className="p-12 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20">
                  <AlertCircle className="h-10 w-10 text-yellow-400" />
                </div>
                <h1 className="font-heading text-foreground mb-4 text-3xl font-bold">
                  Couldn't check your usage
                </h1>
                <p className="text-muted-foreground mb-8 text-lg">
                  We couldn't load your session usage right now. Please try again in a moment.
                </p>
                <Button
                  onClick={runUsageCheck}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
      </main>
    )
  }

  return (
    <main className="bg-background min-h-screen">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto max-w-4xl px-4">
          <Card className="glass-effect border-border bg-card/50">
            <CardContent className="p-12 text-center">
              <div className="mb-8">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20">
                  <AlertCircle className="h-10 w-10 text-yellow-400" />
                </div>
                <h1 className="font-heading text-foreground mb-4 text-4xl font-bold">
                  Monthly Limit Reached
                </h1>
                <p className="text-muted-foreground mb-2 text-xl">
                  You've used all {usageLimit?.limit ?? PRICING_CONFIG.free.sessionsPerMonth} free
                  sessions this month
                </p>
                <div className="text-muted-foreground mt-4 flex items-center justify-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Your limit resets at the start of next month</span>
                </div>
              </div>

              <div className="border-border bg-muted/50 mb-8 rounded-lg border p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground mb-1 text-sm">Sessions Used</p>
                    <p className="text-foreground text-3xl font-bold">
                      {usageLimit?.used ?? 0} /{" "}
                      {usageLimit?.limit ?? PRICING_CONFIG.free.sessionsPerMonth}
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
                  <h2 className="text-foreground text-2xl font-bold">Upgrade to Pro</h2>
                </div>
                <p className="text-muted-foreground mb-6">
                  Get {PRICING_CONFIG.pro.sessionsDisplay} and unlock advanced features to land your
                  dream job.
                </p>

                <div className="mb-6 grid grid-cols-1 gap-4 text-left md:grid-cols-2">
                  {PRICING_CONFIG.pro.valueProps.map((valueProp) => (
                    <div key={valueProp.title} className="flex items-start space-x-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                      <div>
                        <p className="text-foreground font-semibold">{valueProp.title}</p>
                        <p className="text-muted-foreground text-sm">{valueProp.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/upgrade">
                  <Button className="text-foreground w-full bg-yellow-500 px-8 py-6 text-lg hover:bg-yellow-600 md:w-auto">
                    <Crown className="mr-2 h-5 w-5" />
                    Upgrade to Pro - from {PRICING_CONFIG.pro.website.yearly.priceDisplay}/mo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-muted bg-transparent"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-muted bg-transparent"
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
