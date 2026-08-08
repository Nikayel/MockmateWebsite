"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { signOut as firebaseSignOut } from "firebase/auth"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  AlertCircle,
  Settings,
  Cpu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  FlaskConical,
  Search,
  ClipboardList,
  Megaphone,
  Flag,
  MessageSquare,
  HeartPulse,
  Rocket,
  Server,
  CreditCard,
  Loader2,
  Scale,
  Lightbulb,
  Menu,
  X,
  GraduationCap,
  Bug,
} from "lucide-react"
import { logger } from "@/lib/logger"
import {
  AdminAccessDenied,
  AdminGateError,
  AdminSignInRequired,
  Skeleton,
} from "@/components/admin/shared"
import { parseAdminIdentity, type AdminIdentity } from "@/lib/admin/identity"
import type { AdminRole } from "@/lib/admin/rbac"
import {
  ADMIN_NAV,
  activeNavHref,
  visibleNavEntries,
  visibleNavSections,
} from "@/lib/admin/navigation"

/**
 * Icon per destination. The navigation model itself lives in lib/admin/navigation.ts
 * so its permission rules stay testable without React; only the presentation is here.
 */
const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/admin": LayoutDashboard,
  "/admin/users": Users,
  "/admin/sessions": Activity,
  "/admin/revenue": DollarSign,
  "/admin/payments": CreditCard,
  "/admin/growth": Rocket,
  "/admin/funnel": TrendingUp,
  "/admin/ai-usage": Cpu,
  "/admin/scoring": Scale,
  "/admin/rate-limits": Activity,
  "/admin/infrastructure": Server,
  "/admin/rag": Search,
  "/admin/health": HeartPulse,
  "/admin/errors": AlertCircle,
  "/admin/research": FlaskConical,
  "/admin/learn-research": GraduationCap,
  "/admin/bugfix-quality": Bug,
  "/admin/announcements": Megaphone,
  "/admin/feature-flags": Flag,
  "/admin/feedback": MessageSquare,
  "/admin/insights": Lightbulb,
  "/admin/audit": ClipboardList,
  "/admin/settings": Settings,
}

/** Human wording for the role the API reported, instead of a hardcoded "Super Admin". */
const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  analyst: "Analyst, read only",
  support: "Support",
}

const SIDEBAR_COLLAPSED_KEY = "admin:sidebar-collapsed"

/**
 * What the gate knows about the current visitor. "forbidden" is the only state that
 * means "you are not an admin"; a failed check is its own state so a backend hiccup
 * cannot lock a real admin out of the dashboard.
 */
type AdminGateState =
  | { status: "checking" }
  | { status: "signed-out" }
  | { status: "forbidden" }
  | { status: "error"; message: string }
  | { status: "authorized"; identity: AdminIdentity }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { firebaseUser, loading: authLoading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [gate, setGate] = useState<AdminGateState>({ status: "checking" })
  const [retryCount, setRetryCount] = useState(0)

  // Read the stored preference after mount rather than in the initial state, so the
  // server and first client render agree and React does not report a hydration
  // mismatch over a value localStorage cannot supply during SSR.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true")
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  // Route changes close the drawer. Without this a mobile tap navigates and leaves the
  // overlay covering the page it just opened.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  // Escape closes the drawer, which is the expected exit from any overlay.
  useEffect(() => {
    if (!mobileNavOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mobileNavOpen])

  useEffect(() => {
    if (authLoading) return

    if (!firebaseUser) {
      setGate({ status: "signed-out" })
      router.push("/login?redirect=admin")
      return
    }

    let cancelled = false

    const checkAdminAccess = async () => {
      setGate({ status: "checking" })

      try {
        // Identity only. /api/admin/me reads one admin_roles document and returns,
        // which is all this gate ever needed.
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled) return

        if (response.status === 401) {
          setGate({ status: "signed-out" })
          return
        }

        if (response.status === 403) {
          setGate({ status: "forbidden" })
          return
        }

        if (!response.ok) {
          logger.error("Admin identity check failed", {
            status: response.status,
            userId: firebaseUser.uid,
          })
          setGate({
            status: "error",
            message: `The admin service returned ${response.status}. This is a problem with the check, not with your account.`,
          })
          return
        }

        const identity = parseAdminIdentity(await response.json())
        if (cancelled) return

        if (!identity) {
          setGate({
            status: "error",
            message: "The admin service returned a response this page could not read.",
          })
          return
        }

        setGate({ status: "authorized", identity })
      } catch (error) {
        logger.error("Admin check failed", { error, userId: firebaseUser?.uid })
        if (!cancelled) {
          setGate({
            status: "error",
            message: "Could not reach the admin service. Check your connection and try again.",
          })
        }
      }
    }

    checkAdminAccess()

    return () => {
      cancelled = true
    }
  }, [authLoading, firebaseUser, router, retryCount])

  if (authLoading || gate.status === "checking") {
    return (
      <div className="flex min-h-screen bg-[#1a1917]">
        {/* Sidebar skeleton */}
        <aside className="fixed top-0 left-0 z-40 h-screen w-64 border-r border-gray-800 bg-gray-900/95">
          <div className="flex h-14 items-center justify-between border-b border-gray-800 px-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#c4703f] to-[#3fb883]">
                <Shield className="h-4 w-4 text-black" />
              </div>
              <div>
                <span className="font-heading text-sm font-semibold text-white">Admin</span>
                <span className="-mt-0.5 block text-[10px] text-gray-500">CodeSparring</span>
              </div>
            </div>
          </div>
          <nav className="space-y-2 px-2 py-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </nav>
        </aside>
        {/* Main content skeleton */}
        <main className="ml-64 flex-1 p-6 lg:p-8">
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-[#c4703f]" />
          </div>
        </main>
      </div>
    )
  }

  if (gate.status === "signed-out") {
    return <AdminSignInRequired onSignIn={() => router.push("/login?redirect=admin")} />
  }

  if (gate.status === "forbidden") {
    return (
      <AdminAccessDenied
        email={firebaseUser?.email ?? undefined}
        onGoHome={() => router.push("/")}
      />
    )
  }

  if (gate.status === "error") {
    return <AdminGateError message={gate.message} onRetry={() => setRetryCount((n) => n + 1)} />
  }

  const handleSignOut = async () => {
    try {
      const { getAuthLazy } = await import("@/lib/firebase-lazy")
      const auth = await getAuthLazy()
      await firebaseSignOut(auth)
      router.push("/")
    } catch (error) {
      logger.error("Admin sign out error", { error })
    }
  }

  const navEntries = visibleNavEntries(ADMIN_NAV, gate.identity.permissions)
  const navSections = visibleNavSections(navEntries)
  const activeHref = activeNavHref(navEntries, pathname)

  /**
   * Icon-only rail. Collapsing is a desktop affordance, and the drawer can only be
   * opened below lg, so an open drawer always shows full labels no matter what the
   * desktop preference happens to be.
   */
  const railMode = collapsed && !mobileNavOpen

  return (
    <div className="flex min-h-screen bg-[#1a1917]">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#c4703f] focus:px-4 focus:py-2 focus:font-medium focus:text-black"
      >
        Skip to content
      </a>

      {/* Mobile bar. The sidebar is off-canvas below lg, so this is the only way to
          reach navigation on a phone or a narrow window. */}
      <div className="fixed top-0 right-0 left-0 z-30 flex h-14 items-center gap-3 border-b border-gray-800/80 bg-gray-900/98 px-3 backdrop-blur-sm lg:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:outline-none"
          aria-label="Open navigation"
          aria-expanded={mobileNavOpen}
          aria-controls="admin-sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#c4703f] to-[#3fb883]">
            <Shield className="h-3.5 w-3.5 text-black" />
          </div>
          <span className="font-heading text-sm font-semibold text-white">Admin</span>
        </Link>
      </div>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-800/80 bg-gray-900/98 backdrop-blur-sm transition-all duration-300 ease-in-out",
          collapsed ? "lg:w-16" : "lg:w-64",
          // Off-canvas below lg. Previously this was an unprefixed w-64 beside an
          // ml-64 main, so every admin page was unusable on a narrow screen.
          "w-64",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-800/80 px-3">
          {!railMode && (
            <Link href="/admin" className="group flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#c4703f] to-[#3fb883] shadow-lg shadow-[#c4703f]/20 transition-shadow group-hover:shadow-[#c4703f]/30">
                <Shield className="h-4 w-4 text-black" />
              </div>
              <div>
                <span className="font-heading text-sm font-semibold text-white">Admin</span>
                <span className="-mt-0.5 block text-[10px] text-gray-400">CodeSparring</span>
              </div>
            </Link>
          )}
          {railMode && (
            <Link href="/admin" className="mx-auto" aria-label="Admin overview">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#c4703f] to-[#3fb883] shadow-lg shadow-[#c4703f]/20">
                <Shield className="h-4 w-4 text-black" />
              </div>
            </Link>
          )}
          {!railMode && (
            <>
              <button
                onClick={toggleCollapsed}
                className="hidden rounded-lg p-1.5 text-gray-400 transition-all hover:scale-105 hover:bg-gray-800 hover:text-white focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:outline-none lg:block"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:outline-none lg:hidden"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Expand button when collapsed */}
        {railMode && (
          <div className="flex-shrink-0 border-b border-gray-800/50 px-2 py-3">
            <button
              onClick={toggleCollapsed}
              className="flex w-full items-center justify-center rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-800 hover:text-white focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:outline-none"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation. The aside is a flex column, so the nav takes the remaining
            height on its own. It used to carry a calc(100vh - 14rem) magic number
            alongside a flex-1 that did nothing, because the parent was not a flex
            container. */}
        <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
          {navSections.map((section, sectionIndex) => {
            const sectionItems = navEntries.filter((item) => item.section === section)
            return (
              <div key={section} className={sectionIndex > 0 ? "mt-5" : ""}>
                {/* Section label - only show when not collapsed */}
                {!railMode && (
                  <div className="mb-2 px-3">
                    <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                      {section}
                    </span>
                  </div>
                )}
                {railMode && sectionIndex > 0 && (
                  <div className="mx-2 mb-2 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                )}
                <div className="space-y-0.5">
                  {sectionItems.map((item) => {
                    const isActive = activeHref === item.href
                    const Icon = NAV_ICONS[item.href] ?? LayoutDashboard

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:outline-none",
                          isActive
                            ? "border-l-2 border-[#c4703f] bg-gradient-to-r from-[#c4703f]/15 to-[#c4703f]/5 text-[#c4703f] shadow-sm"
                            : "text-gray-400 hover:translate-x-0.5 hover:bg-gray-800/60 hover:text-white",
                          railMode && "justify-center px-2"
                        )}
                        title={railMode ? item.name : undefined}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] flex-shrink-0 transition-transform group-hover:scale-110",
                            isActive && "text-[#c4703f]"
                          )}
                        />
                        {railMode ? (
                          // A title attribute is not an accessible name, so the rail
                          // used to present 21 unlabelled links to a screen reader.
                          <span className="sr-only">{item.name}</span>
                        ) : (
                          <>
                            <span className="truncate">{item.name}</span>
                            {item.badge && (
                              <span className="ml-auto rounded-full border border-[#c4703f]/30 bg-[#c4703f]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#c4703f]">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 border-t border-gray-800/80 bg-gray-900/50 p-3">
          {!railMode && firebaseUser && (
            <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-800/30 p-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#c4703f] to-[#3fb883] shadow-lg shadow-[#c4703f]/20">
                <span className="text-sm font-bold text-black">
                  {firebaseUser.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{firebaseUser.email}</p>
                <div className="mt-0.5 flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  {/* The real role, not a hardcoded "Super Admin". An analyst who saw
                      that label had no way to know why half the dashboard 403s. */}
                  <p className="text-[10px] text-gray-400">
                    {ROLE_LABELS[gate.identity.role]}
                  </p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:outline-none",
              railMode && "justify-center px-2"
            )}
          >
            <LogOut className="h-4 w-4" />
            {railMode ? <span className="sr-only">Sign Out</span> : <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content. No left margin below lg, where the sidebar is off-canvas, and a
          top offset for the mobile bar instead. */}
      <main
        id="admin-content"
        className={cn(
          "min-h-screen flex-1 pt-14 transition-all duration-300 ease-in-out lg:pt-0",
          collapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        <div className="mx-auto max-w-[1800px] p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
