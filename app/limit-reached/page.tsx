"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser, convertFirebaseUser } from "@/lib/auth"
import { checkUsageLimit } from "@/lib/firestore-helpers"
import { User as UserType } from "@/lib/types"
import { AlertCircle, Crown, CheckCircle, ArrowRight, Clock } from "lucide-react"

export default function LimitReachedPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [usageLimit, setUsageLimit] = useState<{ used: number; limit: number; allowed: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const firebaseUser = await getCurrentUser()
        if (!firebaseUser) {
          router.push("/login?redirect=limit-reached")
          return
        }

        const convertedUser = convertFirebaseUser(firebaseUser)
        setUser(convertedUser)

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
  }, [router])

  if (loading) {
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
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="bg-gray-900/50 border-gray-700 glass-effect">
            <CardContent className="p-12 text-center">
              <div className="mb-8">
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="h-10 w-10 text-yellow-400" />
                </div>
                <h1 className="text-4xl font-heading font-bold text-white mb-4">
                  Monthly Limit Reached
                </h1>
                <p className="text-xl text-gray-300 mb-2">
                  You've used all {usageLimit?.limit || 2} free sessions this month
                </p>
                <div className="flex items-center justify-center space-x-2 text-gray-400 mt-4">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Your limit resets at the start of next month</span>
                </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Sessions Used</p>
                    <p className="text-3xl font-bold text-white">
                      {usageLimit?.used || 0} / {usageLimit?.limit || 2}
                    </p>
                  </div>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-lg px-4 py-2">
                    Limit Reached
                  </Badge>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-8 mb-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Crown className="h-6 w-6 text-yellow-400" />
                  <h2 className="text-2xl font-bold text-white">Upgrade to Pro</h2>
                </div>
                <p className="text-gray-300 mb-6">
                  Get unlimited interview sessions and unlock advanced features!
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">Unlimited Sessions</p>
                      <p className="text-gray-400 text-sm">Practice as much as you want</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">500+ Problems</p>
                      <p className="text-gray-400 text-sm">Access to extensive problem library</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">Advanced Challenges</p>
                      <p className="text-gray-400 text-sm">Hard problems and system design</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold">Analytics & Insights</p>
                      <p className="text-gray-400 text-sm">Track your progress and performance</p>
                    </div>
                  </div>
                </div>

                <Link href="/upgrade">
                  <Button className="bg-yellow-500 hover:bg-yellow-600 text-black text-lg px-8 py-6 w-full md:w-auto">
                    <Crown className="mr-2 h-5 w-5" />
                    Upgrade to Pro - $25/month
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent">
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

