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
import { User, Crown, BarChart3, Calendar, ExternalLink, AlertCircle, XCircle, Shield, Download, Trash2, Cookie, Bell, RefreshCw, CreditCard, Receipt } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Profile, ProfileQuota, NotificationPreferences, PaymentHistory } from "@/lib/types"
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
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email_notifications_enabled: true,
    welcome_email: true,
    inactivity_reminders: true,
    spaced_repetition_reminders: true,
    milestone_celebrations: true,
    marketing_emails: false,
  })
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

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
        // Parallelize all data fetching for faster page load
        const [userProfile, usageSnap, paymentsSnap] = await Promise.all([
          getUserProfile(firebaseUser.uid).catch(err => {
            console.error("Error fetching profile:", err)
            setError("Failed to load profile data")
            toast.error("Failed to load profile data", {
              description: "Some features may not be available",
            })
            return null
          }),
          // Fetch usage data from Firestore
          (async () => {
            try {
              const usageQuery = query(
                collection(db, "profile_quota"),
                where("user_id", "==", firebaseUser.uid)
              )
              return await getDocs(usageQuery)
            } catch (usageError) {
              console.error("Error fetching usage:", usageError)
              // Usage data might not exist for new users, so don't show error
              return null
            }
          })(),
          // Fetch payment history
          (async () => {
            try {
              const paymentsQuery = query(
                collection(db, "payment_history"),
                where("user_id", "==", firebaseUser.uid)
              )
              return await getDocs(paymentsQuery)
            } catch (paymentError) {
              console.error("Error fetching payment history:", paymentError)
              return null
            }
          })()
        ])

        // Set profile data
        if (userProfile) {
          setProfile(userProfile)
          // Load notification preferences from profile
          if (userProfile.notification_preferences) {
            setNotificationPrefs(userProfile.notification_preferences)
          }

          // If user has Stripe IDs, sync subscription to get latest details (non-blocking)
          // This ensures subscription dates, status, etc. are up to date
          if (userProfile.stripe_customer_id || userProfile.stripe_subscription_id) {
            // Run sync in background, don't block page load
            firebaseUser.getIdToken().then(idToken => {
              fetch("/api/sync-subscription", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId: firebaseUser.uid }),
              }).then(syncResponse => {
                if (syncResponse.ok) {
                  return syncResponse.json()
                }
              }).then(syncData => {
                if (syncData?.success && syncData.profile) {
                  // Reload profile after sync
                  getUserProfile(firebaseUser.uid).then(updatedProfile => {
                    if (updatedProfile) {
                      setProfile(updatedProfile)
                    }
                  })
                }
              }).catch(syncError => {
                // Don't show error for sync failures - profile data is still valid
                console.log("Subscription sync failed (non-critical):", syncError)
              })
            })
          }
        }

        // Set usage data
        if (usageSnap && !usageSnap.empty) {
          setUsage(usageSnap.docs[0].data() as ProfileQuota)
        }

        // Set payment history
        if (paymentsSnap && !paymentsSnap.empty) {
          const paymentsData = paymentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PaymentHistory))

          // Sort by created_at descending
          paymentsData.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime()
            const dateB = new Date(b.created_at).getTime()
            return dateB - dateA
          })

          setPaymentHistory(paymentsData)
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

  const handleSyncSubscription = async () => {
    if (!user || !firebaseUser) return

    setIsSyncing(true)
    try {
      const idToken = await firebaseUser.getIdToken()

      toast.info("Syncing subscription from Stripe...")
      const response = await fetch("/api/sync-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Subscription synced! Status: ${data.profile.subscription_tier}`)
        // Reload profile
        const userProfile = await getUserProfile(firebaseUser.uid)
        if (userProfile) {
          setProfile(userProfile)
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
    } finally {
      setIsSyncing(false)
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
      a.download = `skillon-data-export-${new Date().toISOString().split('T')[0]}.json`
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
    localStorage.removeItem("skillon_cookie_consent")
    window.location.reload()
  }

  const handleUpdateNotificationPref = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!firebaseUser) return

    const newPrefs = { ...notificationPrefs, [key]: value }
    setNotificationPrefs(newPrefs)
    setIsSavingPrefs(true)

    try {
      const idToken = await firebaseUser.getIdToken()
      const response = await fetch("/api/user/notification-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ preferences: newPrefs }),
      })

      if (!response.ok) {
        throw new Error("Failed to update preferences")
      }

      toast.success("Notification preferences updated")
    } catch (error) {
      // Revert on error
      setNotificationPrefs(notificationPrefs)
      toast.error("Failed to update notification preferences")
    } finally {
      setIsSavingPrefs(false)
    }
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

                  <p className="text-xs text-gray-500 mt-2">
                    Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </p>

                  {!isPro && usagePercentage > 80 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-2">
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
                  onClick={() => (window.location.href = "/interview")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Start Practicing
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

                {/* Sync subscription button - show if user has Stripe IDs */}
                {(profile?.stripe_subscription_id || profile?.stripe_customer_id) && (
                  <Button
                    onClick={handleSyncSubscription}
                    variant="outline"
                    className="w-full border-gray-600 text-white hover:bg-gray-800 bg-transparent"
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? "Syncing..." : "Sync Subscription Status"}
                  </Button>
                )}
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

          {/* Email Notification Settings */}
          <Card className="bg-gray-900/50 border-gray-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm mb-4">
                Get science-backed reminders to help you retain what you've learned. Based on the Ebbinghaus forgetting curve and spaced repetition research.
              </p>
              <div className="space-y-4">
                {/* Master toggle */}
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <div>
                    <Label htmlFor="email-enabled" className="text-white font-medium">
                      Enable Email Notifications
                    </Label>
                    <p className="text-gray-500 text-sm">
                      Turn off all email notifications
                    </p>
                  </div>
                  <Switch
                    id="email-enabled"
                    checked={notificationPrefs.email_notifications_enabled}
                    onCheckedChange={(checked) => handleUpdateNotificationPref("email_notifications_enabled", checked)}
                    disabled={isSavingPrefs}
                  />
                </div>

                {/* Individual toggles */}
                <div className={`space-y-4 ${!notificationPrefs.email_notifications_enabled ? "opacity-50 pointer-events-none" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="inactivity" className="text-white">
                        Inactivity Reminders
                      </Label>
                      <p className="text-gray-500 text-sm">
                        Nudge when you haven't practiced in 24+ hours
                      </p>
                    </div>
                    <Switch
                      id="inactivity"
                      checked={notificationPrefs.inactivity_reminders}
                      onCheckedChange={(checked) => handleUpdateNotificationPref("inactivity_reminders", checked)}
                      disabled={isSavingPrefs}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="spaced-rep" className="text-white">
                        Spaced Repetition Reminders
                      </Label>
                      <p className="text-gray-500 text-sm">
                        Review topics at optimal times (based on forgetting curve)
                      </p>
                    </div>
                    <Switch
                      id="spaced-rep"
                      checked={notificationPrefs.spaced_repetition_reminders}
                      onCheckedChange={(checked) => handleUpdateNotificationPref("spaced_repetition_reminders", checked)}
                      disabled={isSavingPrefs}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="milestones" className="text-white">
                        Milestone Celebrations
                      </Label>
                      <p className="text-gray-500 text-sm">
                        Celebrate achievements and progress
                      </p>
                    </div>
                    <Switch
                      id="milestones"
                      checked={notificationPrefs.milestone_celebrations}
                      onCheckedChange={(checked) => handleUpdateNotificationPref("milestone_celebrations", checked)}
                      disabled={isSavingPrefs}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                    <div>
                      <Label htmlFor="marketing" className="text-white">
                        Product Updates & Tips
                      </Label>
                      <p className="text-gray-500 text-sm">
                        New features and interview tips
                      </p>
                    </div>
                    <Switch
                      id="marketing"
                      checked={notificationPrefs.marketing_emails}
                      onCheckedChange={(checked) => handleUpdateNotificationPref("marketing_emails", checked)}
                      disabled={isSavingPrefs}
                    />
                  </div>
                </div>

                <div className="bg-[#00d9ff]/10 border border-[#00d9ff]/20 rounded-lg p-3 mt-4">
                  <p className="text-[#00d9ff] text-sm">
                    <strong>Science tip:</strong> Research shows we forget 33% of new skills within 24 hours. Our smart reminders help you review at the optimal time to maximize retention.
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

          {/* Payment History */}
          {(paymentHistory.length > 0 || profile?.stripe_customer_id) && (
            <Card className="bg-gray-900/50 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Receipt className="mr-2 h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentHistory.length === 0 ? (
                  <div className="text-center py-6">
                    <CreditCard className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No payment history available</p>
                    <p className="text-gray-500 text-xs mt-1">Your payments will appear here after your next billing cycle</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentHistory.slice(0, 5).map((payment) => (
                      <div
                        key={payment.id}
                        className="p-3 bg-gray-800/50 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-medium text-sm mb-1">
                              {payment.description || (payment.type === "subscription" ? "Subscription Payment" : "One-time Payment")}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {new Date(payment.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                              {payment.period_start && payment.period_end && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {new Date(payment.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    {' - '}
                                    {new Date(payment.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium text-sm">
                              ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                            </p>
                            <Badge
                              className={
                                payment.status === "succeeded"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : payment.status === "refunded"
                                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                              }
                            >
                              {payment.status === "succeeded" ? "Paid" : payment.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {paymentHistory.length > 5 && (
                      <p className="text-center text-gray-500 text-xs pt-2">
                        Showing 5 of {paymentHistory.length} payments
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
