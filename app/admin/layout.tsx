"use client"

import { useEffect, useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"
import { Skeleton } from "@/components/admin/shared"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  section?: string // For grouping
}

// Navigation grouped by purpose for better mental model
const navigation: NavItem[] = [
  // Core metrics
  { name: "Overview", href: "/admin", icon: LayoutDashboard, section: "Core" },
  { name: "Users", href: "/admin/users", icon: Users, section: "Core" },
  { name: "Sessions", href: "/admin/sessions", icon: Activity, section: "Core" },

  // Revenue & Growth
  { name: "Revenue", href: "/admin/revenue", icon: DollarSign, section: "Revenue" },
  { name: "Payments", href: "/admin/payments", icon: CreditCard, section: "Revenue" },
  { name: "Growth", href: "/admin/growth", icon: Rocket, badge: "NPS", section: "Revenue" },
  { name: "Funnel", href: "/admin/funnel", icon: TrendingUp, section: "Revenue" },

  // Technical
  { name: "AI Usage", href: "/admin/ai-usage", icon: Cpu, section: "Technical" },
  { name: "Scoring", href: "/admin/scoring", icon: Scale, badge: "AI", section: "Technical" },
  { name: "Rate Limits", href: "/admin/rate-limits", icon: Activity, section: "Technical" },
  { name: "Infrastructure", href: "/admin/infrastructure", icon: Server, section: "Technical" },
  { name: "RAG", href: "/admin/rag", icon: Search, section: "Technical" },
  { name: "System Health", href: "/admin/health", icon: HeartPulse, section: "Technical" },
  { name: "Errors", href: "/admin/errors", icon: AlertCircle, section: "Technical" },

  // Operations
  {
    name: "Research",
    href: "/admin/research",
    icon: FlaskConical,
    badge: "A/B",
    section: "Operations",
  },
  { name: "Announcements", href: "/admin/announcements", icon: Megaphone, section: "Operations" },
  { name: "Feature Flags", href: "/admin/feature-flags", icon: Flag, section: "Operations" },
  { name: "Feedback", href: "/admin/feedback", icon: MessageSquare, section: "Operations" },
  { name: "Audit Log", href: "/admin/audit", icon: ClipboardList, section: "Operations" },
  { name: "Settings", href: "/admin/settings", icon: Settings, section: "Operations" },
]

// Group navigation items by section
const sections = ["Core", "Revenue", "Technical", "Operations"]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { firebaseUser, loading: authLoading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (authLoading) return

      if (!firebaseUser) {
        router.push("/login?redirect=admin")
        return
      }

      try {
        // Check admin access by calling the analytics API
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/admin/analytics?timeRange=7d", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.status === 403) {
          setIsAdmin(false)
          return
        }

        if (response.ok) {
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        logger.error("Admin check failed", { error, userId: firebaseUser?.uid })
        setIsAdmin(false)
      }
    }

    checkAdminAccess()
  }, [authLoading, firebaseUser, router])

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0f]">
        {/* Sidebar skeleton */}
        <aside className="fixed top-0 left-0 z-40 h-screen w-64 border-r border-gray-800 bg-gray-900/95">
          <div className="flex h-14 items-center justify-between border-b border-gray-800 px-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#00ff88]">
                <Shield className="h-4 w-4 text-black" />
              </div>
              <div>
                <span className="font-heading text-sm font-semibold text-white">Admin</span>
                <span className="-mt-0.5 block text-[10px] text-gray-500">Mockmate</span>
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
            <Loader2 className="h-10 w-10 animate-spin text-[#00d9ff]" />
          </div>
        </main>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="max-w-md rounded-lg border border-red-500/30 bg-gray-900/50 p-8 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h1 className="mb-2 text-xl font-bold text-white">Access Denied</h1>
          <p className="mb-6 text-gray-400">
            You don't have permission to access the admin dashboard.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
          >
            Return to Home
          </Button>
        </div>
      </div>
    )
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

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen border-r border-gray-800/80 bg-gray-900/98 backdrop-blur-sm transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-gray-800/80 px-3">
          {!collapsed && (
            <Link href="/admin" className="group flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#00ff88] shadow-lg shadow-[#00d9ff]/20 transition-shadow group-hover:shadow-[#00d9ff]/30">
                <Shield className="h-4 w-4 text-black" />
              </div>
              <div>
                <span className="font-heading text-sm font-semibold text-white">Admin</span>
                <span className="-mt-0.5 block text-[10px] text-gray-500">Mockmate</span>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" className="mx-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#00ff88] shadow-lg shadow-[#00d9ff]/20">
                <Shield className="h-4 w-4 text-black" />
              </div>
            </Link>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-lg p-1.5 text-gray-400 transition-all hover:scale-105 hover:bg-gray-800 hover:text-white"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="border-b border-gray-800/50 px-2 py-3">
            <button
              onClick={() => setCollapsed(false)}
              className="flex w-full items-center justify-center rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-800 hover:text-white"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex-1 overflow-y-auto px-2 py-4">
          {sections.map((section, sectionIndex) => {
            const sectionItems = navigation.filter((item) => item.section === section)
            return (
              <div key={section} className={sectionIndex > 0 ? "mt-5" : ""}>
                {/* Section label - only show when not collapsed */}
                {!collapsed && (
                  <div className="mb-2 px-3">
                    <span className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                      {section}
                    </span>
                  </div>
                )}
                {collapsed && sectionIndex > 0 && (
                  <div className="mx-2 mb-2 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                )}
                <div className="space-y-0.5">
                  {sectionItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/admin" && pathname.startsWith(item.href))

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "border-l-2 border-[#00d9ff] bg-gradient-to-r from-[#00d9ff]/15 to-[#00d9ff]/5 text-[#00d9ff] shadow-sm"
                            : "text-gray-400 hover:translate-x-0.5 hover:bg-gray-800/60 hover:text-white",
                          collapsed && "justify-center px-2"
                        )}
                        title={collapsed ? item.name : undefined}
                      >
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] flex-shrink-0 transition-transform group-hover:scale-110",
                            isActive && "text-[#00d9ff]"
                          )}
                        />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.name}</span>
                            {item.badge && (
                              <span className="ml-auto rounded-full border border-[#00d9ff]/30 bg-[#00d9ff]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#00d9ff]">
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
        <div className="border-t border-gray-800/80 bg-gray-900/50 p-3">
          {!collapsed && firebaseUser && (
            <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-800/30 p-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ff88] shadow-lg shadow-[#00d9ff]/20">
                <span className="text-sm font-bold text-black">
                  {firebaseUser.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{firebaseUser.email}</p>
                <div className="mt-0.5 flex items-center gap-1">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                  <p className="text-[10px] text-gray-400">Super Admin</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-xs font-medium text-gray-400 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "min-h-screen flex-1 transition-all duration-300 ease-in-out",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="mx-auto max-w-[1800px] p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
