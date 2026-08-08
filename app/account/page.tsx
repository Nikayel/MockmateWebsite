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
import { getDbLazy } from "@/lib/firebase-lazy"
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
import { ResearchConsentCard } from "@/components/account/ResearchConsentCard"
import { SendFeedbackCard } from "@/components/feedback/SendFeedbackCard"
import { Profile, ProfileQuota, NotificationPreferences, PaymentHistory } from "@/lib/types"
import {
  DEFAULT_NOTIFICATION_PREFERENCES as DEFAULT_SMART_NOTIFICATION_PREFERENCES,
  type NotificationPreferences as SmartNotificationPreferences,
} from "@/lib/types/notifications"
import { getSessionsLimitForTier, isPaidTier } from "@/lib/pricing"
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

  const buildSmartNotificationPreferences = (
    userId: string,
    profilePrefs: NotificationPreferences,
    existingPrefs?: Partial<SmartNotificationPreferences>
  ): SmartNotificationPreferences => {
    const now = new Date().toISOString()
    const defaultTypePreferences = DEFAULT_SMART_NOTIFICATION_PREFERENCES.typePreferences
    const typePreferences: SmartNotificationPreferences["typePreferences"] = {
      ...DEFAULT_SMART_NOTIFICATION_PREFERENCES.typePreferences,
      ...existingPrefs?.typePreferences,
      welcome: {
        ...defaultTypePreferences.welcome,
        ...existingPrefs?.typePreferences?.welcome,
        enabled: profilePrefs.welcome_email,
        channels: existingPrefs?.typePreferences?.welcome?.channels ||
          defaultTypePreferences.welcome?.channels || ["email", "in_app"],
      },
      spaced_repetition_review: {
        ...defaultTypePreferences.spaced_repetition_review,
        ...existingPrefs?.typePreferences?.spaced_repetition_review,
        enabled: profilePrefs.spaced_repetition_reminders,
        channels: existingPrefs?.typePreferences?.spaced_repetition_review?.channels ||
          defaultTypePreferences.spaced_repetition_review?.channels || ["email", "in_app"],
      },
      interview_countdown: {
        ...defaultTypePreferences.interview_countdown,
        ...existingPrefs?.typePreferences?.interview_countdown,
        enabled: profilePrefs.roadmap_reminders,
        channels: existingPrefs?.typePreferences?.interview_countdown?.channels ||
          defaultTypePreferences.interview_countdown?.channels || ["email", "in_app"],
      },
      daily_practice_reminder: {
        ...defaultTypePreferences.daily_practice_reminder,
        ...existingPrefs?.typePreferences?.daily_practice_reminder,
        enabled: profilePrefs.roadmap_reminders,
        channels: existingPrefs?.typePreferences?.daily_practice_reminder?.channels ||
          defaultTypePreferences.daily_practice_reminder?.channels || ["in_app"],
      },
      roadmap_behind: {
        ...defaultTypePreferences.roadmap_behind,
        ...existingPrefs?.typePreferences?.roadmap_behind,
        enabled: profilePrefs.roadmap_reminders,
        channels: existingPrefs?.typePreferences?.roadmap_behind?.channels ||
          defaultTypePreferences.roadmap_behind?.channels || ["in_app"],
      },
      milestone_celebration: {
        ...defaultTypePreferences.milestone_celebration,
        ...existingPrefs?.typePreferences?.milestone_celebration,
        enabled: profilePrefs.milestone_celebrations,
        channels: existingPrefs?.typePreferences?.milestone_celebration?.channels ||
          defaultTypePreferences.milestone_celebration?.channels || ["in_app"],
      },
    }

    return {
      ...DEFAULT_SMART_NOTIFICATION_PREFERENCES,
      ...existingPrefs,
      userId,
      enabled: existingPrefs?.enabled ?? true,
      timezone:
        profilePrefs.timezone ||
        existingPrefs?.timezone ||
        DEFAULT_SMART_NOTIFICATION_PREFERENCES.timezone,
      channels: {
        ...DEFAULT_SMART_NOTIFICATION_PREFERENCES.channels,
        ...existingPrefs?.channels,
        email: profilePrefs.email_notifications_enabled,
      },
      quietHours: {
        ...DEFAULT_SMART_NOTIFICATION_PREFERENCES.quietHours,
        ...existingPrefs?.quietHours,
      },
      typePreferences,
      createdAt: existingPrefs?.createdAt || now,
      updatedAt: now,
    }
  }

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
              const db = await getDbLazy()
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
              const db = await getDbLazy()
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
              const db = await getDbLazy()
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

      const db = await getDbLazy()
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
      const db = await getDbLazy()
      const profileRef = doc(db, "profiles", firebaseUser.uid)
      const smartPrefsRef = doc(db, "notification_preferences", firebaseUser.uid)
      const smartPrefsSnap = await getDoc(smartPrefsRef)
      const smartPrefs = buildSmartNotificationPreferences(
        firebaseUser.uid,
        newPrefs,
        smartPrefsSnap.exists()
          ? (smartPrefsSnap.data() as Partial<SmartNotificationPreferences>)
          : undefined
      )

      await Promise.all([
        updateDoc(profileRef, {
          notification_preferences: newPrefs,
          updated_at: new Date().toISOString(),
        }),
        setDoc(smartPrefsRef, smartPrefs, { merge: true }),
      ])

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
      const db = await getDbLazy()
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
      <main className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="bg-muted h-2 w-2 animate-pulse rounded-full" />
          <div className="bg-muted h-2 w-2 animate-pulse rounded-full delay-75" />
          <div className="bg-muted h-2 w-2 animate-pulse rounded-full delay-150" />
        </div>
      </main>
    )
  }

  // isPaidTier so enterprise (a paid tier) is not treated as Free (DUP-2)
  const isPro = isPaidTier(profile?.subscription_tier ?? "free")
  const usedSessions = usage?.sessions_used || 0
  const maxSessions = getSessionsLimitForTier(profile?.subscription_tier ?? "free")
  const usagePercentage = (usedSessions / maxSessions) * 100

  return (
    <main className="bg-background min-h-screen">
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
            <div className="bg-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
              <User className="text-muted-foreground h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-foreground truncate text-xl font-semibold">
                {user?.user_metadata?.full_name || "Developer"}
              </h1>
              <p className="text-muted-foreground truncate text-sm">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  isPro
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : "border-border bg-muted text-muted-foreground"
                }
              >
                {isPro && <Crown className="mr-1 h-3 w-3" />}
                {isPro ? "Pro" : "Free"}
              </Badge>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="border-border/50 bg-card/50 rounded-xl border p-4">
              <div className="mb-1 flex items-center gap-2">
                <BarChart3 className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-muted-foreground text-[11px]">Sessions</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-foreground text-xl font-light">{usedSessions}</span>
                <span className="text-muted-foreground text-xs">/ {maxSessions}</span>
              </div>
              <Progress value={usagePercentage} className="bg-muted mt-2 h-1" />
            </div>

            <div className="border-border/50 bg-card/50 rounded-xl border p-4">
              <div className="mb-1 flex items-center gap-2">
                <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-muted-foreground text-[11px]">Member Since</span>
              </div>
              <span className="text-foreground text-sm">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>

            <div className="border-border/50 bg-card/50 col-span-2 rounded-xl border p-4 sm:col-span-1">
              <div className="mb-1 flex items-center gap-2">
                <Crown className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-muted-foreground text-[11px]">Subscription</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isPro ? "text-amber-400" : "text-muted-foreground"}`}>
                  {isPro ? "Pro Plan" : "Free Plan"}
                </span>
                {!isPro && (
                  <Link href="/upgrade">
                    <Button
                      size="sm"
                      className="bg-card text-foreground hover:bg-muted h-6 text-[10px]"
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
              <Button size="sm" className="bg-card text-foreground hover:bg-muted h-8 text-xs">
                <ExternalLink className="mr-1.5 h-3 w-3" />
                Start Practice
              </Button>
            </Link>
            <Link href="/metrics">
              <Button
                size="sm"
                variant="outline"
                className="border-border text-muted-foreground hover:bg-muted h-8 text-xs"
              >
                <BarChart3 className="mr-1.5 h-3 w-3" />
                View Metrics
              </Button>
            </Link>
            {(profile?.stripe_subscription_id || profile?.stripe_customer_id) && (
              <Button
                size="sm"
                variant="outline"
                className="border-border text-muted-foreground hover:bg-muted h-8 text-xs"
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
              <div className="border-border/50 bg-card/50 overflow-hidden rounded-xl border">
                <button
                  onClick={() => toggleSection("subscription")}
                  className="hover:bg-muted/30 flex w-full items-center justify-between p-4 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" />
                    <span className="text-foreground text-sm font-medium">Pro Subscription</span>
                  </div>
                  <ChevronDown
                    className={`text-muted-foreground h-4 w-4 transition-transform ${expandedSections.has("subscription") ? "rotate-180" : ""}`}
                  />
                </button>
                {expandedSections.has("subscription") && (
                  <div className="space-y-3 px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {profile.subscription_start_date && (
                        <div>
                          <span className="text-muted-foreground text-xs">Pro Since</span>
                          <p className="text-foreground">
                            {new Date(profile.subscription_start_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {profile.subscription_current_period_end && (
                        <div>
                          <span className="text-muted-foreground text-xs">Period Ends</span>
                          <p className="text-foreground">
                            {new Date(profile.subscription_current_period_end).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {profile.subscription_status && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">Status:</span>
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
                      className="border-border text-muted-foreground hover:bg-muted h-8 w-full text-xs"
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
            <div className="border-border/50 bg-card/50 overflow-hidden rounded-xl border">
              <button
                onClick={() => toggleSection("notifications")}
                className="hover:bg-muted/30 flex w-full items-center justify-between p-4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bell className="text-muted-foreground h-4 w-4" />
                  <span className="text-foreground text-sm font-medium">Notifications</span>
                  {notificationPrefs.email_notifications_enabled ? (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                      On
                    </span>
                  ) : (
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                      Off
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`text-muted-foreground h-4 w-4 transition-transform ${expandedSections.has("notifications") ? "rotate-180" : ""}`}
                />
              </button>
              {expandedSections.has("notifications") && (
                <div className="space-y-4 px-4 pb-4">
                  {/* Master toggle with better copy */}
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${notificationPrefs.email_notifications_enabled ? "bg-emerald-500/20" : "bg-muted/50"}`}
                      >
                        <Mail
                          className={`h-4 w-4 ${notificationPrefs.email_notifications_enabled ? "text-emerald-400" : "text-muted-foreground"}`}
                        />
                      </div>
                      <div>
                        <span className="text-foreground text-sm font-medium">
                          Email Notifications
                        </span>
                        <p className="text-muted-foreground text-xs">
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
                    <div className="hover:bg-muted/20 flex items-center justify-between rounded-lg px-3 py-3 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm">Practice Reminders</span>
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">
                            Recommended
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
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
                    <div className="hover:bg-muted/20 flex items-center justify-between rounded-lg px-3 py-3 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm">Review Alerts</span>
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                            High Impact
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
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
                    <div className="hover:bg-muted/20 flex items-center justify-between rounded-lg px-3 py-3 transition-colors">
                      <div className="flex-1">
                        <span className="text-foreground text-sm">Milestone Celebrations</span>
                        <p className="text-muted-foreground mt-0.5 text-xs">
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
                    <div className="hover:bg-muted/20 flex items-center justify-between rounded-lg px-3 py-3 transition-colors">
                      <div className="flex-1">
                        <span className="text-foreground text-sm">Product Updates</span>
                        <p className="text-muted-foreground mt-0.5 text-xs">
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
                    <div className="border-border/50 space-y-3 border-t pt-3">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-muted-foreground text-sm">Quiet Hours</span>
                          <p className="text-muted-foreground text-xs">
                            No emails between 10 PM - 8 AM your time
                          </p>
                        </div>
                        <Check className="h-4 w-4 text-emerald-500" />
                      </div>

                      {/* Timezone Selector */}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <Globe className="text-muted-foreground h-4 w-4" />
                          <div>
                            <span className="text-muted-foreground text-sm">Timezone</span>
                            <p className="text-muted-foreground text-xs">
                              For streak and reminder timing
                            </p>
                          </div>
                        </div>
                        <select
                          value={userTimezone}
                          onChange={(e) => handleUpdateTimezone(e.target.value)}
                          disabled={isSavingPrefs}
                          className="border-border bg-muted text-foreground focus:border-border focus:ring-border rounded-md border px-2 py-1 text-xs focus:ring-1 focus:outline-none"
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
            <div className="border-border/50 bg-card/50 overflow-hidden rounded-xl border">
              <button
                onClick={() => toggleSection("practice")}
                className="hover:bg-muted/30 flex w-full items-center justify-between p-4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Brain className="text-muted-foreground h-4 w-4" />
                  <span className="text-foreground text-sm font-medium">Practice Settings</span>
                </div>
                <ChevronDown
                  className={`text-muted-foreground h-4 w-4 transition-transform ${expandedSections.has("practice") ? "rotate-180" : ""}`}
                />
              </button>
              {expandedSections.has("practice") && (
                <div className="space-y-4 px-4 pb-4">
                  {/* Daily Review Limit */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <span className="text-muted-foreground text-sm">Daily Review Limit</span>
                      <p className="text-muted-foreground text-xs">
                        Max reviews shown per day. Excess items can be deferred.
                      </p>
                    </div>
                    <select
                      value={practiceSettings.max_daily_reviews}
                      onChange={(e) =>
                        handleUpdatePracticeSetting("max_daily_reviews", Number(e.target.value))
                      }
                      disabled={isSavingPracticeSettings}
                      className="border-border bg-muted text-foreground focus:border-border focus:ring-border rounded-md border px-2 py-1 text-xs focus:ring-1 focus:outline-none"
                    >
                      {[5, 10, 15, 20, 25, 30].map((n) => (
                        <option key={n} value={n}>
                          {n} reviews
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Daily Goal */}
                  <div className="border-border/50 flex items-center justify-between border-t py-2 pt-4">
                    <div>
                      <span className="text-muted-foreground text-sm">Daily Goal</span>
                      <p className="text-muted-foreground text-xs">
                        Target problems to complete each day for streak progress.
                      </p>
                    </div>
                    <select
                      value={practiceSettings.daily_goal}
                      onChange={(e) =>
                        handleUpdatePracticeSetting("daily_goal", Number(e.target.value))
                      }
                      disabled={isSavingPracticeSettings}
                      className="border-border bg-muted text-foreground focus:border-border focus:ring-border rounded-md border px-2 py-1 text-xs focus:ring-1 focus:outline-none"
                    >
                      {[1, 3, 5, 10, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} problems
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-muted-foreground text-[10px]">
                    When reviews exceed your daily limit, you&apos;ll see a &quot;Feeling
                    overwhelmed?&quot; option to defer low-priority items.
                  </p>
                </div>
              )}
            </div>

            {/* Privacy & Data */}
            <div className="border-border/50 bg-card/50 overflow-hidden rounded-xl border">
              <button
                onClick={() => toggleSection("privacy")}
                className="hover:bg-muted/30 flex w-full items-center justify-between p-4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="text-muted-foreground h-4 w-4" />
                  <span className="text-foreground text-sm font-medium">Privacy & Data</span>
                </div>
                <ChevronDown
                  className={`text-muted-foreground h-4 w-4 transition-transform ${expandedSections.has("privacy") ? "rotate-180" : ""}`}
                />
              </button>
              {expandedSections.has("privacy") && (
                <div className="space-y-2 px-4 pb-4">
                  <ResearchConsentCard />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-muted h-9 w-full justify-start text-xs"
                    onClick={handleExportData}
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-3.5 w-3.5" />
                    {isExporting ? "Exporting..." : "Export My Data"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-muted-foreground hover:bg-muted h-9 w-full justify-start text-xs"
                    onClick={handleOpenCookieSettings}
                  >
                    <Cookie className="mr-2 h-3.5 w-3.5" />
                    Cookie Preferences
                  </Button>
                  <Link href="/legal" className="block">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-muted-foreground hover:bg-muted h-9 w-full justify-start text-xs"
                    >
                      <Shield className="mr-2 h-3.5 w-3.5" />
                      Privacy Policy
                    </Button>
                  </Link>
                  <div className="border-border/50 border-t pt-2">
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
              <div className="border-border/50 bg-card/50 overflow-hidden rounded-xl border">
                <button
                  onClick={() => toggleSection("payments")}
                  className="hover:bg-muted/30 flex w-full items-center justify-between p-4 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="text-muted-foreground h-4 w-4" />
                    <span className="text-foreground text-sm font-medium">Payment History</span>
                    {paymentHistory.length > 0 && (
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
                        {paymentHistory.length}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`text-muted-foreground h-4 w-4 transition-transform ${expandedSections.has("payments") ? "rotate-180" : ""}`}
                  />
                </button>
                {expandedSections.has("payments") && (
                  <div className="px-4 pb-4">
                    {paymentHistory.length === 0 ? (
                      <div className="py-6 text-center">
                        <CreditCard className="text-muted-foreground mx-auto mb-2 h-6 w-6" />
                        <p className="text-muted-foreground text-xs">No payments yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {paymentHistory.slice(0, 5).map((payment) => (
                          <div
                            key={payment.id}
                            className="border-border/50 flex items-center justify-between border-b py-2 last:border-0"
                          >
                            <div>
                              <p className="text-foreground text-sm">
                                {payment.description || "Subscription"}
                              </p>
                              <p className="text-muted-foreground text-[11px]">
                                {new Date(payment.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-foreground font-mono text-sm">
                                ${(payment.amount / 100).toFixed(2)}
                              </p>
                              <Badge
                                className={
                                  payment.status === "succeeded"
                                    ? "border-0 bg-emerald-500/10 text-[10px] text-emerald-400"
                                    : "bg-muted text-muted-foreground border-0 text-[10px]"
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

            {/* Feedback & Support */}
            <div className="border-border/50 bg-card/50 overflow-hidden rounded-xl border">
              <button
                onClick={() => toggleSection("feedback")}
                className="hover:bg-muted/30 flex w-full items-center justify-between p-4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Mail className="text-muted-foreground h-4 w-4" />
                  <span className="text-foreground text-sm font-medium">Feedback & Support</span>
                </div>
                <ChevronDown
                  className={`text-muted-foreground h-4 w-4 transition-transform ${expandedSections.has("feedback") ? "rotate-180" : ""}`}
                />
              </button>
              {expandedSections.has("feedback") && (
                <div className="px-4 pb-4">
                  <SendFeedbackCard />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-border bg-card max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              This is <strong className="text-red-400">permanent</strong>. All data will be deleted:
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                <li>Profile and account info</li>
                <li>Session history and analytics</li>
                <li>Active subscriptions</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-muted h-9 bg-transparent text-sm">
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
