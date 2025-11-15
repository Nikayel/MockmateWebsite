"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getCurrentUser, signOut, convertFirebaseUser } from "@/lib/auth"
import { getUserProfile } from "@/lib/firestore-helpers"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore"
import { User, Crown, BarChart3, Calendar, ExternalLink, LogOut, AlertCircle, Terminal, RefreshCw } from "lucide-react"
import { User as UserType, Profile, ProfileQuota } from "@/lib/types"
import { PRICING_CONFIG } from "@/lib/config"
import { toast } from "sonner"
import Link from "next/link"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usage, setUsage] = useState<ProfileQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const firebaseUser = await getCurrentUser()
        if (!firebaseUser) {
          router.push("/login?redirect=profile")
          return
        }

        const convertedUser = convertFirebaseUser(firebaseUser)
        setUser(convertedUser)

        // Fetch profile data from Firestore (use helper to ensure consistency)
        try {
          const userProfile = await getUserProfile(firebaseUser.uid)
          if (userProfile) {
            setProfile(userProfile)
          }
        } catch (profileError) {
          console.error("Error fetching profile:", profileError)
          setError("Failed to load profile data")
          toast.error("Failed to load profile data", {
            description: "Some features may not be available",
          })
        }

        // Fetch usage data from Firestore
        try {
          const usageQuery = query(
            collection(db, "profile_quota"),
            where("user_id", "==", firebaseUser.uid)
          )
          const usageSnap = await getDocs(usageQuery)
          
          if (!usageSnap.empty) {
            setUsage(usageSnap.docs[0].data() as ProfileQuota)
          }
        } catch (usageError) {
          console.error("Error fetching usage:", usageError)
          // Usage data might not exist for new users, so don't show error
        }
      } catch (error) {
        console.error("Error loading user data:", error)
        setError("Failed to load account data")
        toast.error("Failed to load account data", {
          description: error instanceof Error ? error.message : "An unknown error occurred",
        })
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = "/"
    } catch (error) {
      console.error("Sign out error:", error)
      toast.error("Failed to sign out", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  const handleSyncSubscription = async () => {
    if (!user) return
    
    try {
      toast.info("Syncing subscription from Stripe...")
      const response = await fetch("/api/sync-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Subscription synced! Status: ${data.profile.subscription_tier}`)
        // Reload profile
        const firebaseUser = await getCurrentUser()
        if (firebaseUser) {
          const userProfile = await getUserProfile(firebaseUser.uid)
          if (userProfile) {
            setProfile(userProfile)
          }
        }
        // Reload page to show updated status
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        throw new Error(data.error || "Sync failed")
      }
    } catch (error) {
      console.error("Sync subscription error:", error)
      toast.error("Failed to sync subscription", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5733]"></div>
      </main>
    )
  }

  const isPro = profile?.subscription_tier === "pro"
  const usedSessions = usage?.sessions_used || 0
  const maxSessions = isPro ? PRICING_CONFIG.pro.sessionsPerMonth : PRICING_CONFIG.free.sessionsPerMonth
  const usagePercentage = (usedSessions / maxSessions) * 100

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Error Banner */}
          {error && (
            <Card className="bg-red-900/20 border-red-500/30 mb-6">
              <CardContent className="p-4 flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">{error}</p>
                  <p className="text-red-300 text-sm">Some features may not be available</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{user?.user_metadata?.full_name || "Developer"}</h1>
                  <p className="text-gray-400">{user?.email}</p>
                </div>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>

            <div className="flex items-center space-x-3">
              <Badge
                className={
                  isPro
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                }
              >
                {isPro ? (
                  <>
                    <Crown className="mr-1 h-3 w-3" />
                    Pro Plan
                  </>
                ) : (
                  "Free Plan"
                )}
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Usage Stats */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Usage This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Interview Sessions</span>
                      <span className="text-white">
                        {usedSessions} / {maxSessions}
                      </span>
                    </div>
                    <Progress value={usagePercentage} className="h-2" />
                  </div>

                  {!isPro && usagePercentage > 80 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-yellow-400 text-sm">
                        You're running low on sessions. Upgrade to Pro for unlimited access!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/dashboard">
                  <Button className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>

                {!isPro && (
                  <Link href="/upgrade">
                    <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade to Pro
                    </Button>
                  </Link>
                )}

                {/* Sync subscription button - show if user has Stripe IDs */}
                {(profile?.stripe_subscription_id || profile?.stripe_customer_id) && (
                  <Button
                    onClick={handleSyncSubscription}
                    variant="outline"
                    className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Subscription Status
                  </Button>
                )}

                <Link href="/interview">
                  <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent">
                    <Terminal className="mr-2 h-4 w-4" />
                    Start Practice
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Account Details */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Email</span>
                  <span className="text-white">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Member Since</span>
                  <span className="text-white">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Subscription</span>
                  <span className="text-white capitalize">{profile?.subscription_tier || "free"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  )
}

