"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "@/lib/auth"
import { getUserProfile } from "@/lib/firestore-helpers"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore"
import { User, Crown, BarChart3, Calendar, ExternalLink, LogOut, AlertCircle, XCircle, Shield, Download, Trash2, Cookie } from "lucide-react"
import { Profile, ProfileQuota, InterviewSession } from "@/lib/types"
import { PRICING_CONFIG } from "@/lib/config"
import { toast } from "sonner"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AccountPage() {
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usage, setUsage] = useState<ProfileQuota | null>(null)
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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
    const loadUserData = async () => {
      if (authLoading || !initialized || !authCheckComplete) return

      if (!firebaseUser) {
        window.location.href = "/login"
        return
      }

      try {

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

        // Fetch recent sessions (limit to 5 most recent)
        try {
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

            // Sort by started_at descending and take first 5
            sessionsData.sort((a, b) => {
              const dateA = new Date(a.started_at).getTime()
              const dateB = new Date(b.started_at).getTime()
              return dateB - dateA
            })

            setSessions(sessionsData.slice(0, 5))
          }
        } catch (sessionError) {
          console.error("Error fetching sessions:", sessionError)
          // Don't show error to user, just log it
        }
      } catch (error) {
        console.error("Error loading user data:", error)
        setError("Failed to load account data")
        toast.error("Failed to load account data", {
          description: error instanceof Error ? error.message : "An unknown error occurred",
        })
      } finally {
        setDataLoading(false)
      }
    }

    loadUserData()
  }, [firebaseUser, authLoading, initialized, authCheckComplete])

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
    if (!user || !firebaseUser) return

    try {
      // Get Firebase ID token for authentication
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

  const handleExportData = async () => {
    if (!firebaseUser) return

    setIsExporting(true)
    try {
      // Collect all user data
      const exportData: Record<string, any> = {
        exportDate: new Date().toISOString(),
        profile: profile || {},
        usage: usage || {},
        sessions: [],
      }

      // Fetch all sessions (not just recent 5)
      const sessionsQuery = query(
        collection(db, "interview_sessions"),
        where("user_id", "==", firebaseUser.uid)
      )
      const sessionsSnap = await getDocs(sessionsQuery)
      exportData.sessions = sessionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mockmate-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Data exported successfully", {
        description: "Your data has been downloaded as a JSON file",
      })
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export data", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!firebaseUser) return

    setIsDeleting(true)
    try {
      const idToken = await firebaseUser.getIdToken()

      // Call delete account API
      const response = await fetch("/api/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Account deleted successfully")
        // Sign out and redirect
        await signOut()
        window.location.href = "/"
      } else {
        throw new Error(data.error || "Failed to delete account")
      }
    } catch (error) {
      console.error("Delete account error:", error)
      toast.error("Failed to delete account", {
        description: error instanceof Error ? error.message : "Please try again or contact support",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleOpenCookieSettings = () => {
    // Clear consent to re-show cookie banner
    localStorage.removeItem("mockmate_cookie_consent")
    window.location.reload()
  }

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
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
                  className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80"
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

          {/* Privacy & Data Section */}
          <Card className="bg-gray-900/50 border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Privacy & Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm mb-4">
                Manage your data and privacy settings. You have the right to export or delete your personal data at any time.
              </p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent justify-start"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export My Data"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent justify-start"
                  onClick={handleOpenCookieSettings}
                >
                  <Cookie className="mr-2 h-4 w-4" />
                  Cookie Preferences
                </Button>
                <Link href="/legal" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent justify-start"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Privacy Policy
                  </Button>
                </Link>
                <div className="pt-3 border-t border-gray-700">
                  <Button
                    variant="outline"
                    className="w-full border-red-600/50 text-red-400 hover:bg-red-900/20 bg-transparent justify-start"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete My Account
                  </Button>
                  <p className="text-gray-500 text-xs mt-2">
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Recent Activity
                </span>
                <Link href="/sessions">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No recent interview sessions</p>
                  <p className="text-gray-500 text-sm mt-2">Start practicing to see your activity here</p>
                  <Link href="/interview" className="block mt-4">
                    <Button className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
                      Start Practice Session
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Link
                      key={session.id}
                      href={session.completed_at ? `/sessions/${session.id}` : `/interview?session=${session.id}&scenario=${session.scenario_id}`}
                      className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm mb-1">{session.topic}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.started_at).toLocaleDateString()}
                            {session.completed_at && session.performance_score !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-[#00d9ff]">{Math.round(session.performance_score)}% score</span>
                              </>
                            )}
                            {!session.completed_at && (
                              <>
                                <span>•</span>
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                  In Progress
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge className={
                          session.difficulty === "easy" ? "bg-green-600/20 text-green-400 border-green-600/30" :
                          session.difficulty === "medium" ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30" :
                          "bg-red-600/20 text-red-400 border-red-600/30"
                        }>
                          {session.difficulty.toUpperCase()}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center">
              <Trash2 className="mr-2 h-5 w-5 text-red-400" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete your account? This action is <strong className="text-red-400">permanent</strong> and cannot be undone.
              <br /><br />
              This will delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your profile and account information</li>
                <li>All interview sessions and history</li>
                <li>Performance data and analytics</li>
                <li>Any active subscriptions will be cancelled</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-600 text-white hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
