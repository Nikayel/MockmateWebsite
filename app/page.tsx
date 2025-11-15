"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { PricingSection } from "@/components/pricing-section"
import { Footer } from "@/components/footer"
import { getCurrentUser, convertFirebaseUser } from "@/lib/auth"
import { getUserProfile, checkUsageLimit } from "@/lib/firestore-helpers"
import { User as UserType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Terminal, ArrowRight, Crown, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [usage, setUsage] = useState<{ used: number; limit: number; allowed: boolean } | null>(null)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const firebaseUser = await getCurrentUser()
        if (firebaseUser) {
          const convertedUser = convertFirebaseUser(firebaseUser)
          setUser(convertedUser)
          
          // Get profile and usage
          const profile = await getUserProfile(firebaseUser.uid)
          setIsPro(profile?.subscription_tier === "pro")
          
          const usageData = await checkUsageLimit(firebaseUser.uid)
          setUsage(usageData)
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  // If signed in, redirect to practice section
  if (!isLoading && user) {
    return (
      <main className="min-h-screen bg-black">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-7xl">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-heading font-bold text-white mb-2">
                Welcome back, {user.user_metadata?.full_name || "Developer"}!
              </h1>
              <p className="text-gray-400">Ready to practice? Start a new interview session</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Sessions This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">
                    {usage?.used || 0} / {usage?.limit || 2}
                  </div>
                  <Progress value={usage ? (usage.used / usage.limit) * 100 : 0} className="h-2 mb-2" />
                  <p className="text-xs text-gray-400">
                    {usage?.allowed ? `${usage.limit - (usage.used || 0)} sessions remaining` : "Limit reached"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium flex items-center">
                    <Crown className="h-4 w-4 mr-2" />
                    Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={isPro ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
                    {isPro ? "Pro Plan" : "Free Plan"}
                  </Badge>
                  {!isPro && (
                    <Link href="/upgrade" className="block mt-3">
                      <Button size="sm" className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80 text-white">
                        Upgrade
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium flex items-center">
                    <Terminal className="h-4 w-4 mr-2" />
                    Quick Start
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/interview">
                    <Button className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80 text-white">
                      Start Practice
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Practice Section */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Terminal className="h-5 w-5 mr-2 text-[#ff5733]" />
                    Coding Practice
                  </span>
                  {!usage?.allowed && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      Limit Reached
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usage?.allowed ? (
                  <div className="space-y-4">
                    <p className="text-gray-300">
                      Ready to practice? Start a new interview session and work on real coding problems with AI guidance.
                    </p>
                    <Link href="/interview">
                      <Button className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80 text-white py-6 text-lg">
                        <Terminal className="mr-2 h-5 w-5" />
                        Start New Practice Session
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                      <p className="text-yellow-400 font-medium mb-2">Monthly Limit Reached</p>
                      <p className="text-gray-300 text-sm mb-4">
                        You've used all {usage?.limit || 2} free sessions this month. Upgrade to Pro for unlimited practice!
                      </p>
                      <Link href="/upgrade">
                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                          <Crown className="mr-2 h-4 w-4" />
                          Upgrade to Pro
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  // For non-signed-in users, show the marketing page
  return (
    <main className="min-h-screen bg-black">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </main>
  )
}
