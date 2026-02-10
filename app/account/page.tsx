"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "@/lib/auth"
import { getUserProfile } from "@/lib/firestore-helpers"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore"
import {
  User,
  Crown,
  BarChart3,
  Calendar,
  ExternalLink,
  AlertCircle,
  XCircle,
  Shield,
  Download,
  Trash2,
  Cookie,
  Bell,
  RefreshCw,
  CreditCard,
  Receipt,
  ChevronRight,
  ChevronDown,
  Check,
  Mail,
  Settings,
  Globe,
  Brain,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { SubscriptionStatusBanner } from "@/components/ui/subscription-status-banner"
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["notifications"]))
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email_notifications_enabled: true,
    welcome_email: true,
    inactivity_reminders: true,
    spaced_repetition_reminders: true,
    milestone_celebrations: true,
    roadmap_reminders: true,
    marketing_emails: false,
  })
  const [isSavingPrefs, setIsSavingPrefs] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [userTimezone, setUserTimezone] = useState("America/Los_Angeles")
  // Practice settings
  const [practiceSettings, setPracticeSettings] = useState({
    daily_goal: 5,
    max_daily_reviews: 10,
  })
  const [isSavingPracticeSettings, setIsSavingPracticeSettings] = useState(false)

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  useEffect(() => {
    if (!initialized || authLoading) return
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
        const [userProfile, usageSnap, paymentsSnap, notifPrefsSnap] = await Promise.all([
          getUserProfile(firebaseUser.uid).catch((err) => {
            console.error("Error fetching profile:", err)
            setError("Failed to load profile data")
            toast.error("Failed to load profile data")
            return null
          }),
          (async () => {
            try {
              const usageQuery = query(
                collection(db, "profile_quota"),
                where("user_id", "==", firebaseUser.uid)
              )
              return await getDocs(usageQuery)
            } catch {
              return null
            }
          })(),
          (async () => {
            try {
              const paymentsQuery = query(
                collection(db, "payment_history"),
                where("user_id", "==", firebaseUser.uid)
              )
              return await getDocs(paymentsQuery)
            } catch {
              return null
            }
          })(),
          (async () => {
            try {
              const notifPrefsRef = doc(db, "notification_preferences", firebaseUser.uid)
              return await getDoc(notifPrefsRef)
            } catch {
              return null
            }
          })(),
        ])

        if (userProfile) {
          setProfile(userProfile)
          if (userProfile.notification_preferences) {
            setNotificationPrefs(userProfile.notification_preferences)
          }

          if (userProfile.stripe_customer_id || userProfile.stripe_subscription_id) {
            firebaseUser.getIdToken().then((idToken) => {
              fetch("/api/sync-subscription", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ userId: firebaseUser.uid }),
              })
                .then((syncResponse) => {
                  if (syncResponse.ok) return syncResponse.json()
                })
                .then((syncData) => {
                  if (syncData?.success && syncData.profile) {
                    getUserProfile(firebaseUser.uid).then((updatedProfile) => {
                      if (updatedProfile) setProfile(updatedProfile)
                    })
                  }
                })
                .catch(() => {})
            })
          }
        }

        if (usageSnap && !usageSnap.empty) {
          setUsage(usageSnap.docs[0].data() as ProfileQuota)
        }

        if (paymentsSnap && !paymentsSnap.empty) {
          const paymentsData = paymentsSnap.docs.map(
            (docSnap) =>
              ({
                id: docSnap.id,
                ...docSnap.data(),
              }) as PaymentHistory
          )
          paymentsData.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setPaymentHistory(paymentsData)
        }

        // Load timezone from notification_preferences collection
        if (notifPrefsSnap && notifPrefsSnap.exists()) {
          const notifData = notifPrefsSnap.data()
          if (notifData?.timezone) {
            setUserTimezone(notifData.timezone)
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error)
        setError("Failed to load account data")
      } finally {
        setDataLoading(false)
      }
    }

    loadUserData()
  }, [firebaseUser, authLoading, initialized, authCheckComplete])

  const handleManageSubscription = async () => {
    if (!user || !firebaseUser) return

    try {
      if (!profile?.stripe_customer_id && !profile?.stripe_subscription_id) {
        toast.error("No subscription data found", {
          description: "Try syncing first or contact support.",
        })
        return
      }

      const idToken = await firebaseUser.getIdToken()
      toast.info("Opening subscription portal...")

      const response = await fetch("/api/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()

      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to open portal")
      }
    } catch {
      toast.error("Failed to open subscription portal")
    }
  }

  const handleSyncSubscription = async () => {
    if (!user || !firebaseUser) return

    setIsSyncing(true)
    try {
      const idToken = await firebaseUser.getIdToken()
      const response = await fetch("/api/sync-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Synced: ${data.profile.subscription_tier}`)
        const userProfile = await getUserProfile(firebaseUser.uid)
        if (userProfile) setProfile(userProfile)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast.error("Sync failed")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleExportData = async () => {
    if (!firebaseUser) return

    setIsExporting(true)
    try {
      const exportData: Record<string, any> = {
        exportDate: new Date().toISOString(),
        profile: profile || {},
        usage: usage || {},
        sessions: [],
      }

      const sessionsQuery = query(
        collection(db, "interview_sessions"),
        where("user_id", "==", firebaseUser.uid)
      )
      const sessionsSnap = await getDocs(sessionsQuery)
      exportData.sessions = sessionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `codesparring-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Data exported")
    } catch {
      toast.error("Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!firebaseUser) return

    setIsDeleting(true)
    try {
      const idToken = await firebaseUser.getIdToken()
      const response = await fetch("/api/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Account deleted")
        await signOut()
        window.location.href = "/"
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast.error("Delete failed")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleOpenCookieSettings = () => {
    localStorage.removeItem("codesparring_cookie_consent")
    window.location.reload()
  }

  const handleUpdateNotificationPref = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    if (!firebaseUser) return

    const newPrefs = { ...notificationPrefs, [key]: value }
    setNotificationPrefs(newPrefs)
    setIsSavingPrefs(true)

    try {
      // Write directly to Firestore - no admin API needed
      const profileRef = doc(db, "profiles", firebaseUser.uid)
      await updateDoc(profileRef, {
        notification_preferences: newPrefs,
        updated_at: new Date().toISOString(),
      })
      toast.success("Preferences updated")
    } catch (err) {
      console.error("Failed to update preferences:", err)
      setNotificationPrefs(notificationPrefs)
      toast.error("Update failed")
    } finally {
      setIsSavingPrefs(false)
    }
  }

  const handleUpdateTimezone = async (newTimezone: string) => {
    if (!firebaseUser) return

    const previousTimezone = userTimezone
    setUserTimezone(newTimezone)
    setIsSavingPrefs(true)

    try {
      const notifPrefsRef = doc(db, "notification_preferences", firebaseUser.uid)
      const notifPrefsSnap = await getDoc(notifPrefsRef)

      if (notifPrefsSnap.exists()) {
        await updateDoc(notifPrefsRef, {
          timezone: newTimezone,
          updatedAt: new Date().toISOString(),
        })
      } else {
        // Create the document if it doesn't exist
        await setDoc(notifPrefsRef, {
          userId: firebaseUser.uid,
          enabled: true,
          timezone: newTimezone,
          channels: { push: true, email: true, in_app: true },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      toast.success("Timezone updated")
    } catch (err) {
      console.error("Failed to update timezone:", err)
      setUserTimezone(previousTimezone)
      toast.error("Failed to update timezone")
    } finally {
      setIsSavingPrefs(false)
    }
  }

  // Fetch practice settings on load
  useEffect(() => {
    const fetchPracticeSettings = async () => {
      if (!firebaseUser) return

      try {
        const idToken = await firebaseUser.getIdToken()
        const res = await fetch("/api/spaced-repetition/settings", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          setPracticeSettings({
            daily_goal: data.daily_goal || 5,
            max_daily_reviews: data.max_daily_reviews || 10,
          })
        }
      } catch (err) {
        console.error("Failed to fetch practice settings:", err)
      }
    }

    if (initialized && firebaseUser) {
      fetchPracticeSettings()
    }
  }, [initialized, firebaseUser])

  const handleUpdatePracticeSetting = async (
    key: "daily_goal" | "max_daily_reviews",
    value: number
  ) => {
    if (!firebaseUser) return

    const previousValue = practiceSettings[key]
    setPracticeSettings((prev) => ({ ...prev, [key]: value }))
    setIsSavingPracticeSettings(true)

    try {
      const idToken = await firebaseUser.getIdToken()
      const res = await fetch("/api/spaced-repetition/settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [key]: value }),
      })

      if (res.ok) {
        toast.success("Setting updated")
      } else {
        throw new Error("Failed to update")
      }
    } catch (err) {
      console.error("Failed to update practice setting:", err)
      setPracticeSettings((prev) => ({ ...prev, [key]: previousValue }))
      toast.error("Failed to update setting")
    } finally {
      setIsSavingPracticeSettings(false)
    }
  }

  if (authLoading || dataLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-600" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-500 delay-75" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 delay-150" />
        </div>
      </main>
    )
  }

  const isPro = profile?.subscription_tier === "pro"
  const usedSessions = usage?.sessions_used || 0
  const maxSessions = isPro
    ? PRICING_CONFIG.pro.sessionsPerMonth
    : PRICING_CONFIG.free.sessionsPerMonth
  const usagePercentage = (usedSessions / maxSessions) * 100

  return (
    <main className="min-h-screen bg-zinc-950">
      <Header />

      <div className="pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="container mx-auto max-w-3xl px-4">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Profile Header - Compact */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
              <User className="h-7 w-7 text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-white">
                {user?.user_metadata?.full_name || "Developer"}
              </h1>
              <p className="truncate text-sm text-zinc-500">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  isPro
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400"
                }
              >
                {isPro && <Crown className="mr-1 h-3 w-3" />}
                {isPro ? "Pro" : "Free"}
              </Badge>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
              <div className="mb-1 flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] text-zinc-500">Sessions</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-light text-white">{usedSessions}</span>
                <span className="text-xs text-zinc-500">/ {maxSessions}</span>
              </div>
              <Progress value={usagePercentage} className="mt-2 h-1 bg-zinc-800" />
            </div>

            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] text-zinc-500">Member Since</span>
              </div>
              <span className="text-sm text-white">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>

            <div className="col-span-2 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 sm:col-span-1">
              <div className="mb-1 flex items-center gap-2">
                <Crown className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] text-zinc-500">Subscription</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isPro ? "text-amber-400" : "text-zinc-300"}`}>
                  {isPro ? "Pro Plan" : "Free Plan"}
                </span>
                {!isPro && (
                  <Link href="/upgrade">
                    <Button
                      size="sm"
                      className="h-6 bg-white text-[10px] text-zinc-900 hover:bg-zinc-200"
                    >
                      Upgrade
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 flex flex-wrap gap-2">
            <Link href="/interview">
              <Button size="sm" className="h-8 bg-white text-xs text-zinc-900 hover:bg-zinc-200">
                <ExternalLink className="mr-1.5 h-3 w-3" />
                Start Practice
              </Button>
            </Link>
            <Link href="/metrics">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                <BarChart3 className="mr-1.5 h-3 w-3" />
                View Metrics
              </Button>
            </Link>
            {(profile?.stripe_subscription_id || profile?.stripe_customer_id) && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                onClick={handleSyncSubscription}
                disabled={isSyncing}
              >
                <RefreshCw className={`mr-1.5 h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                Sync Status
              </Button>
            )}
          </div>

          {/* Subscription Status Warning */}
          <SubscriptionStatusBanner profile={profile} />

          {/* Sections */}
          <div className="space-y-3">
            {/* Pro Subscription Details */}
            {isPro && profile && (
              <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/50">
                <button
                  onClick={() => toggleSection("subscription")}
                  className="flex w-full items-center justify-between p-4 transition-colors hover:bg-zinc-800/30"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium text-white">Pro Subscription</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-500 transition-transform ${expandedSections.has("subscription") ? "rotate-180" : ""}`}
                  />
                </button>
                {expandedSections.has("subscription") && (
                  <div className="space-y-3 px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {profile.subscription_start_date && (
                        <div>
                          <span className="text-xs text-zinc-500">Pro Since</span>
                          <p className="text-white">
                            {new Date(profile.subscription_start_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {profile.subscription_current_period_end && (
                        <div>
                          <span className="text-xs text-zinc-500">Period Ends</span>
                          <p className="text-white">
                            {new Date(profile.subscription_current_period_end).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {profile.subscription_status && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Status:</span>
                        <Badge
                          className={
                            profile.subscription_status === "active"
                              ? "border-0 bg-emerald-500/10 text-emerald-400"
                              : "border-0 bg-amber-500/10 text-amber-400"
                          }
                        >
                          {profile.subscription_status}
                        </Badge>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-full border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                      onClick={handleManageSubscription}
                    >
                      <Settings className="mr-1.5 h-3 w-3" />
                      Manage / Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Email Notifications */}
            <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/50">
              <button
                onClick={() => toggleSection("notifications")}
                className="flex w-full items-center justify-between p-4 transition-colors hover:bg-zinc-800/30"
              >
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-white">Notifications</span>
                  {notificationPrefs.email_notifications_enabled ? (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                      On
                    </span>
                  ) : (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                      Off
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-500 transition-transform ${expandedSections.has("notifications") ? "rotate-180" : ""}`}
                />
              </button>
              {expandedSections.has("notifications") && (
                <div className="space-y-4 px-4 pb-4">
                  {/* Master toggle with better copy */}
                  <div className="flex items-center justify-between rounded-lg bg-zinc-800/30 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${notificationPrefs.email_notifications_enabled ? "bg-emerald-500/20" : "bg-zinc-700/50"}`}
                      >
                        <Mail
                          className={`h-4 w-4 ${notificationPrefs.email_notifications_enabled ? "text-emerald-400" : "text-zinc-500"}`}
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white">Email Notifications</span>
                        <p className="text-xs text-zinc-500">
                          Stay on track with practice reminders
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationPrefs.email_notifications_enabled}
                      onCheckedChange={(checked) =>
                        handleUpdateNotificationPref("email_notifications_enabled", checked)
                      }
                      disabled={isSavingPrefs}
                    />
                  </div>

                  <div
                    className={`space-y-1 ${!notificationPrefs.email_notifications_enabled ? "pointer-events-none opacity-40" : ""}`}
                  >
                    {/* Practice Reminders */}
                    <div className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-zinc-800/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white">Practice Reminders</span>
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                            Recommended
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Gentle nudge when you haven&apos;t practiced in a while
                        </p>
                      </div>
                      <Switch
                        checked={notificationPrefs.inactivity_reminders}
                        onCheckedChange={(checked) =>
                          handleUpdateNotificationPref("inactivity_reminders", checked)
                        }
                        disabled={isSavingPrefs}
                      />
                    </div>

                    {/* Spaced Repetition */}
                    <div className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-zinc-800/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white">Review Alerts</span>
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                            High Impact
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Know when it&apos;s time to review for maximum retention
                        </p>
                      </div>
                      <Switch
                        checked={notificationPrefs.spaced_repetition_reminders}
                        onCheckedChange={(checked) =>
                          handleUpdateNotificationPref("spaced_repetition_reminders", checked)
                        }
                        disabled={isSavingPrefs}
                      />
                    </div>

                    {/* Milestones */}
                    <div className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-zinc-800/20">
                      <div className="flex-1">
                        <span className="text-sm text-white">Milestone Celebrations</span>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Celebrate streaks, progress, and achievements
                        </p>
                      </div>
                      <Switch
                        checked={notificationPrefs.milestone_celebrations}
                        onCheckedChange={(checked) =>
                          handleUpdateNotificationPref("milestone_celebrations", checked)
                        }
                        disabled={isSavingPrefs}
                      />
                    </div>

                    {/* Product Updates - Marketing */}
                    <div className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-zinc-800/20">
                      <div className="flex-1">
                        <span className="text-sm text-white">Product Updates</span>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          New features, tips, and interview prep insights
                        </p>
                      </div>
                      <Switch
                        checked={notificationPrefs.marketing_emails}
                        onCheckedChange={(checked) =>
                          handleUpdateNotificationPref("marketing_emails", checked)
                        }
                        disabled={isSavingPrefs}
                      />
                    </div>
                  </div>

                  {/* Quiet Hours & Timezone */}
                  {notificationPrefs.email_notifications_enabled && (
                    <div className="space-y-3 border-t border-zinc-800/50 pt-3">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-sm text-zinc-300">Quiet Hours</span>
                          <p className="text-xs text-zinc-600">
                            No emails between 10 PM - 8 AM your time
                          </p>
                        </div>
                        <Check className="h-4 w-4 text-emerald-500" />
                      </div>

                      {/* Timezone Selector */}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-zinc-500" />
                          <div>
                            <span className="text-sm text-zinc-300">Timezone</span>
                            <p className="text-xs text-zinc-600">For streak and reminder timing</p>
                          </div>
                        </div>
                        <select
                          value={userTimezone}
                          onChange={(e) => handleUpdateTimezone(e.target.value)}
                          disabled={isSavingPrefs}
                          className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
                        >
                          <option value="America/Los_Angeles">Pacific Time (LA)</option>
                          <option value="America/Denver">Mountain Time (Denver)</option>
                          <option value="America/Chicago">Central Time (Chicago)</option>
                          <option value="America/New_York">Eastern Time (NYC)</option>
                          <option value="America/Phoenix">Arizona (Phoenix)</option>
                          <option value="Pacific/Honolulu">Hawaii (Honolulu)</option>
                          <option value="America/Anchorage">Alaska (Anchorage)</option>
                          <option value="Europe/London">UK (London)</option>
                          <option value="Europe/Paris">Europe (Paris)</option>
                          <option value="Europe/Berlin">Europe (Berlin)</option>
                          <option value="Asia/Tokyo">Japan (Tokyo)</option>
                          <option value="Asia/Shanghai">China (Shanghai)</option>
                          <option value="Asia/Kolkata">India (Mumbai)</option>
                          <option value="Asia/Singapore">Singapore</option>
                          <option value="Australia/Sydney">Australia (Sydney)</option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Practice Settings */}
            <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/50">
              <button
                onClick={() => toggleSection("practice")}
                className="flex w-full items-center justify-between p-4 transition-colors hover:bg-zinc-800/30"
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-white">Practice Settings</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-500 transition-transform ${expandedSections.has("practice") ? "rotate-180" : ""}`}
                />
              </button>
              {expandedSections.has("practice") && (
                <div className="space-y-4 px-4 pb-4">
                  {/* Daily Review Limit */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-sm text-zinc-300">Daily Review Limit</span>
                      <p className="text-xs text-zinc-600">
                        Max reviews shown per day. Excess items can be deferred.
                      </p>
                    </div>
                    <select
                      value={practiceSettings.max_daily_reviews}
                      onChange={(e) =>
                        handleUpdatePracticeSetting("max_daily_reviews", Number(e.target.value))
                      }
                      disabled={isSavingPracticeSettings}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
                    >
                      {[5, 10, 15, 20, 25, 30].map((n) => (
                        <option key={n} value={n}>
                          {n} reviews
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Daily Goal */}
                  <div className="flex items-center justify-between border-t border-zinc-800/50 py-2 pt-4">
                    <div>
                      <span className="text-sm text-zinc-300">Daily Goal</span>
                      <p className="text-xs text-zinc-600">
                        Target problems to complete each day for streak progress.
                      </p>
                    </div>
                    <select
                      value={practiceSettings.daily_goal}
                      onChange={(e) =>
                        handleUpdatePracticeSetting("daily_goal", Number(e.target.value))
                      }
                      disabled={isSavingPracticeSettings}
                      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none"
                    >
                      {[1, 3, 5, 10, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} problems
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[10px] text-zinc-600">
                    When reviews exceed your daily limit, you&apos;ll see a &quot;Feeling
                    overwhelmed?&quot; option to defer low-priority items.
                  </p>
                </div>
              )}
            </div>

            {/* Privacy & Data */}
            <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/50">
              <button
                onClick={() => toggleSection("privacy")}
                className="flex w-full items-center justify-between p-4 transition-colors hover:bg-zinc-800/30"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-white">Privacy & Data</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-500 transition-transform ${expandedSections.has("privacy") ? "rotate-180" : ""}`}
                />
              </button>
              {expandedSections.has("privacy") && (
                <div className="space-y-2 px-4 pb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-full justify-start border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                    onClick={handleExportData}
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-3.5 w-3.5" />
                    {isExporting ? "Exporting..." : "Export My Data"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-full justify-start border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                    onClick={handleOpenCookieSettings}
                  >
                    <Cookie className="mr-2 h-3.5 w-3.5" />
                    Cookie Preferences
                  </Button>
                  <Link href="/legal" className="block">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-full justify-start border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      <Shield className="mr-2 h-3.5 w-3.5" />
                      Privacy Policy
                    </Button>
                  </Link>
                  <div className="border-t border-zinc-800/50 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 w-full justify-start border-red-500/30 text-xs text-red-400 hover:bg-red-500/10"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Payment History */}
            {(paymentHistory.length > 0 || profile?.stripe_customer_id) && (
              <div className="overflow-hidden rounded-xl border border-zinc-800/50 bg-zinc-900/50">
                <button
                  onClick={() => toggleSection("payments")}
                  className="flex w-full items-center justify-between p-4 transition-colors hover:bg-zinc-800/30"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-white">Payment History</span>
                    {paymentHistory.length > 0 && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                        {paymentHistory.length}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-500 transition-transform ${expandedSections.has("payments") ? "rotate-180" : ""}`}
                  />
                </button>
                {expandedSections.has("payments") && (
                  <div className="px-4 pb-4">
                    {paymentHistory.length === 0 ? (
                      <div className="py-6 text-center">
                        <CreditCard className="mx-auto mb-2 h-6 w-6 text-zinc-700" />
                        <p className="text-xs text-zinc-500">No payments yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {paymentHistory.slice(0, 5).map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between border-b border-zinc-800/50 py-2 last:border-0"
                          >
                            <div>
                              <p className="text-sm text-white">
                                {payment.description || "Subscription"}
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                {new Date(payment.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-sm text-white">
                                ${(payment.amount / 100).toFixed(2)}
                              </p>
                              <Badge
                                className={
                                  payment.status === "succeeded"
                                    ? "border-0 bg-emerald-500/10 text-[10px] text-emerald-400"
                                    : "border-0 bg-zinc-800 text-[10px] text-zinc-400"
                                }
                              >
                                {payment.status === "succeeded" ? "Paid" : payment.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md border-zinc-800 bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <Trash2 className="h-4 w-4 text-red-400" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-400">
              This is <strong className="text-red-400">permanent</strong>. All data will be deleted:
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                <li>Profile and account info</li>
                <li>Session history and analytics</li>
                <li>Active subscriptions</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 border-zinc-700 bg-transparent text-sm text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="h-9 bg-red-600 text-sm text-white hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
