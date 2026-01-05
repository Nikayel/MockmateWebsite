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
import { collection, query, where, getDocs } from "firebase/firestore"
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
  Settings
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['notifications']))
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
        const [userProfile, usageSnap, paymentsSnap] = await Promise.all([
          getUserProfile(firebaseUser.uid).catch(err => {
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
          })()
        ])

        if (userProfile) {
          setProfile(userProfile)
          if (userProfile.notification_preferences) {
            setNotificationPrefs(userProfile.notification_preferences)
          }

          if (userProfile.stripe_customer_id || userProfile.stripe_subscription_id) {
            firebaseUser.getIdToken().then(idToken => {
              fetch("/api/sync-subscription", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({ userId: firebaseUser.uid }),
              }).then(syncResponse => {
                if (syncResponse.ok) return syncResponse.json()
              }).then(syncData => {
                if (syncData?.success && syncData.profile) {
                  getUserProfile(firebaseUser.uid).then(updatedProfile => {
                    if (updatedProfile) setProfile(updatedProfile)
                  })
                }
              }).catch(() => {})
            })
          }
        }

        if (usageSnap && !usageSnap.empty) {
          setUsage(usageSnap.docs[0].data() as ProfileQuota)
        }

        if (paymentsSnap && !paymentsSnap.empty) {
          const paymentsData = paymentsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as PaymentHistory))
          paymentsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          setPaymentHistory(paymentsData)
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
          "Authorization": `Bearer ${idToken}`
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
          "Authorization": `Bearer ${idToken}`
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
      exportData.sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `codesparring-export-${new Date().toISOString().split('T')[0]}.json`
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
          "Authorization": `Bearer ${idToken}`
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

      if (!response.ok) throw new Error()
      toast.success("Preferences updated")
    } catch {
      setNotificationPrefs(notificationPrefs)
      toast.error("Update failed")
    } finally {
      setIsSavingPrefs(false)
    }
  }

  if (authLoading || dataLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-75" />
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse delay-150" />
        </div>
      </main>
    )
  }

  const isPro = profile?.subscription_tier === "pro"
  const usedSessions = usage?.sessions_used || 0
  const maxSessions = isPro ? PRICING_CONFIG.pro.sessionsPerMonth : PRICING_CONFIG.free.sessionsPerMonth
  const usagePercentage = (usedSessions / maxSessions) * 100

  return (
    <main className="min-h-screen bg-zinc-950">
      <Header />

      <div className="pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Profile Header - Compact */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-white truncate">
                {user?.user_metadata?.full_name || "Developer"}
              </h1>
              <p className="text-zinc-500 text-sm truncate">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={isPro
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }>
                {isPro && <Crown className="mr-1 h-3 w-3" />}
                {isPro ? 'Pro' : 'Free'}
              </Badge>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] text-zinc-500">Sessions</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-light text-white">{usedSessions}</span>
                <span className="text-zinc-500 text-xs">/ {maxSessions}</span>
              </div>
              <Progress value={usagePercentage} className="h-1 mt-2 bg-zinc-800" />
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] text-zinc-500">Member Since</span>
              </div>
              <span className="text-sm text-white">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—'}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] text-zinc-500">Subscription</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${isPro ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {isPro ? 'Pro Plan' : 'Free Plan'}
                </span>
                {!isPro && (
                  <Link href="/upgrade">
                    <Button size="sm" className="h-6 text-[10px] bg-white hover:bg-zinc-200 text-zinc-900">
                      Upgrade
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Link href="/interview">
              <Button size="sm" className="h-8 text-xs bg-white hover:bg-zinc-200 text-zinc-900">
                <ExternalLink className="mr-1.5 h-3 w-3" />
                Start Practice
              </Button>
            </Link>
            <Link href="/metrics">
              <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <BarChart3 className="mr-1.5 h-3 w-3" />
                View Metrics
              </Button>
            </Link>
            {(profile?.stripe_subscription_id || profile?.stripe_customer_id) && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={handleSyncSubscription}
                disabled={isSyncing}
              >
                <RefreshCw className={`mr-1.5 h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Status
              </Button>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {/* Pro Subscription Details */}
            {isPro && profile && (
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('subscription')}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium text-white">Pro Subscription</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${expandedSections.has('subscription') ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.has('subscription') && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {profile.subscription_start_date && (
                        <div>
                          <span className="text-zinc-500 text-xs">Pro Since</span>
                          <p className="text-white">{new Date(profile.subscription_start_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {profile.subscription_current_period_end && (
                        <div>
                          <span className="text-zinc-500 text-xs">Period Ends</span>
                          <p className="text-white">{new Date(profile.subscription_current_period_end).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    {profile.subscription_status && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-xs">Status:</span>
                        <Badge className={profile.subscription_status === "active" ? "bg-emerald-500/10 text-emerald-400 border-0" : "bg-amber-500/10 text-amber-400 border-0"}>
                          {profile.subscription_status}
                        </Badge>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
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
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('notifications')}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-white">Email Notifications</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${expandedSections.has('notifications') ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.has('notifications') && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Master toggle */}
                  <div className="flex items-center justify-between py-2 border-b border-zinc-800/50">
                    <div>
                      <span className="text-sm text-white">All Notifications</span>
                      <p className="text-xs text-zinc-500">Master toggle</p>
                    </div>
                    <Switch
                      checked={notificationPrefs.email_notifications_enabled}
                      onCheckedChange={(checked) => handleUpdateNotificationPref("email_notifications_enabled", checked)}
                      disabled={isSavingPrefs}
                    />
                  </div>

                  <div className={`space-y-3 ${!notificationPrefs.email_notifications_enabled ? "opacity-40 pointer-events-none" : ""}`}>
                    {[
                      { key: 'inactivity_reminders', label: 'Inactivity Reminders', desc: '24+ hours without practice' },
                      { key: 'spaced_repetition_reminders', label: 'Spaced Repetition', desc: 'Optimal review times' },
                      { key: 'milestone_celebrations', label: 'Milestones', desc: 'Progress celebrations' },
                      { key: 'marketing_emails', label: 'Product Updates', desc: 'New features & tips' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-zinc-300">{label}</span>
                          <p className="text-[11px] text-zinc-600">{desc}</p>
                        </div>
                        <Switch
                          checked={notificationPrefs[key as keyof NotificationPreferences] as boolean}
                          onCheckedChange={(checked) => handleUpdateNotificationPref(key as keyof NotificationPreferences, checked)}
                          disabled={isSavingPrefs}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Privacy & Data */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('privacy')}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm font-medium text-white">Privacy & Data</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${expandedSections.has('privacy') ? 'rotate-180' : ''}`} />
              </button>
              {expandedSections.has('privacy') && (
                <div className="px-4 pb-4 space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start h-9 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={handleExportData}
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-3.5 w-3.5" />
                    {isExporting ? "Exporting..." : "Export My Data"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start h-9 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={handleOpenCookieSettings}
                  >
                    <Cookie className="mr-2 h-3.5 w-3.5" />
                    Cookie Preferences
                  </Button>
                  <Link href="/legal" className="block">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-9 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      <Shield className="mr-2 h-3.5 w-3.5" />
                      Privacy Policy
                    </Button>
                  </Link>
                  <div className="pt-2 border-t border-zinc-800/50">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-9 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
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
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('payments')}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm font-medium text-white">Payment History</span>
                    {paymentHistory.length > 0 && (
                      <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{paymentHistory.length}</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${expandedSections.has('payments') ? 'rotate-180' : ''}`} />
                </button>
                {expandedSections.has('payments') && (
                  <div className="px-4 pb-4">
                    {paymentHistory.length === 0 ? (
                      <div className="text-center py-6">
                        <CreditCard className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
                        <p className="text-zinc-500 text-xs">No payments yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {paymentHistory.slice(0, 5).map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                            <div>
                              <p className="text-sm text-white">{payment.description || 'Subscription'}</p>
                              <p className="text-[11px] text-zinc-500">
                                {new Date(payment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-white font-mono">${(payment.amount / 100).toFixed(2)}</p>
                              <Badge className={payment.status === "succeeded" ? "bg-emerald-500/10 text-emerald-400 border-0 text-[10px]" : "bg-zinc-800 text-zinc-400 border-0 text-[10px]"}>
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
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-400" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-sm">
              This is <strong className="text-red-400">permanent</strong>. All data will be deleted:
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>Profile and account info</li>
                <li>Session history and analytics</li>
                <li>Active subscriptions</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800 text-sm h-9">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white text-sm h-9"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
