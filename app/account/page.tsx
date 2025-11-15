"use client"

import { useEffect, useState } from "react"
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
import { User, Crown, BarChart3, Calendar, ExternalLink, LogOut, AlertCircle, XCircle } from "lucide-react"
import { User as UserType, Profile, ProfileQuota } from "@/lib/types"
import { PRICING_CONFIG } from "@/lib/config"
import { toast } from "sonner"

export default function AccountPage() {
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
          window.location.href = "/login"
          return
        }

        const convertedUser = convertFirebaseUser(firebaseUser)
        setUser(convertedUser)

        // Fetch profile data from Firestore (use helper to ensure consistency)
        try {
          const userProfile = await getUserProfile(firebaseUser.uid)
          if (userProfile) {
            setProfile(userProfile)
            
            // If user has Stripe IDs, sync subscription to get latest details
            // This ensures subscription dates, status, etc. are up to date
            if (userProfile.stripe_customer_id || userProfile.stripe_subscription_id) {
              try {
                const idToken = await firebaseUser.getIdToken()
                const syncResponse = await fetch("/api/sync-subscription", {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                  },
                  body: JSON.stringify({ userId: firebaseUser.uid }),
                })
                
                if (syncResponse.ok) {
                  const syncData = await syncResponse.json()
                  if (syncData.success && syncData.profile) {
                    // Reload profile after sync
                    const updatedProfile = await getUserProfile(firebaseUser.uid)
                    if (updatedProfile) {
                      setProfile(updatedProfile)
                    }
                  }
                }
              } catch (syncError) {
                // Don't show error for sync failures - profile data is still valid
                console.log("Subscription sync failed (non-critical):", syncError)
              }
            }
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
  }, [])

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

  const handleManageSubscription = async () => {
    if (!user) return
    
    try {
      // Get Firebase ID token for authentication
      const firebaseUser = await getCurrentUser()
      if (!firebaseUser) {
        toast.error("Please sign in again")
        return
      }

      const idToken = await firebaseUser.getIdToken()
      
      toast.info("Opening subscription management portal...")
      const response = await fetch("/api/customer-portal", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
      })

      const data = await response.json()

      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to open portal")
      }
    } catch (error) {
      console.error("Customer portal error:", error)
      toast.error("Failed to open subscription portal", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5733]"></div>
      </div>
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

          {/* Account Details - Show for all users */}
          <Card className="bg-gray-900/50 border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <User className="mr-2 h-5 w-5" />
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
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Subscription</span>
                  <span className="text-white capitalize">{profile?.subscription_tier || 'free'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                <Button
                  className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80"
                  onClick={() => (window.location.href = "vscode://nikayel.MockMate")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in VS Code
                </Button>

                {!isPro && (
                  <Button
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                    onClick={() => (window.location.href = "/upgrade")}
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                  onClick={() => (window.location.href = "/docs")}
                >
                  View Documentation
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Details - Show for Pro users */}
          {isPro && profile && (
            <Card className="bg-gray-900/50 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Crown className="mr-2 h-5 w-5" />
                  Pro Subscription Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subscription Type</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      <Crown className="mr-1 h-3 w-3" />
                      Pro
                    </Badge>
                  </div>
                  {profile.subscription_start_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pro Member Since</span>
                      <span className="text-white">
                        {new Date(profile.subscription_start_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {profile.subscription_current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Period Ends</span>
                      <span className="text-white">
                        {new Date(profile.subscription_current_period_end).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {profile.subscription_status && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <Badge
                        className={
                          profile.subscription_status === "active"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }
                      >
                        {profile.subscription_status}
                      </Badge>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-700">
                    <Button
                      onClick={handleManageSubscription}
                      variant="outline"
                      className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Manage Subscription / Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-400">No recent interview sessions</p>
                <p className="text-gray-500 text-sm mt-2">Start practicing in VS Code to see your activity here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  )
}
