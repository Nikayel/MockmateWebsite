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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"

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
  { name: "Infrastructure", href: "/admin/infrastructure", icon: Server, section: "Technical" },
  { name: "RAG", href: "/admin/rag", icon: Search, section: "Technical" },
  { name: "System Health", href: "/admin/health", icon: HeartPulse, section: "Technical" },
  { name: "Errors", href: "/admin/errors", icon: AlertCircle, section: "Technical" },

  // Operations
  { name: "Research", href: "/admin/research", icon: FlaskConical, badge: "A/B", section: "Operations" },
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00d9ff]"></div>
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
          "fixed top-0 left-0 z-40 h-screen border-r border-gray-800 bg-gray-900/95 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-gray-800 px-3">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#00ff88]">
                <Shield className="h-4 w-4 text-black" />
              </div>
              <div>
                <span className="font-heading font-semibold text-white text-sm">Admin</span>
                <span className="block text-[10px] text-gray-500 -mt-0.5">Mockmate</span>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white",
              collapsed && "mx-auto"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {sections.map((section, sectionIndex) => {
            const sectionItems = navigation.filter(item => item.section === section)
            return (
              <div key={section} className={sectionIndex > 0 ? "mt-6" : ""}>
                {/* Section label - only show when not collapsed */}
                {!collapsed && (
                  <div className="px-3 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {section}
                    </span>
                  </div>
                )}
                {collapsed && sectionIndex > 0 && (
                  <div className="h-px bg-gray-800 mx-2 mb-2" />
                )}
                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const isActive =
                      pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          isActive
                            ? "bg-[#00d9ff]/10 text-[#00d9ff] border-l-2 border-[#00d9ff]"
                            : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                        )}
                      >
                        <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-[#00d9ff]")} />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.name}</span>
                            {item.badge && (
                              <span className="ml-auto rounded-full bg-[#00d9ff]/20 text-[#00d9ff] px-1.5 py-0.5 text-[10px] font-semibold">
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
        <div className="border-t border-gray-800 p-3">
          {!collapsed && firebaseUser && (
            <div className="mb-2 flex items-center gap-2.5 p-2 rounded-lg bg-gray-800/30">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ff88] flex-shrink-0">
                <span className="text-xs font-bold text-black">
                  {firebaseUser.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{firebaseUser.email}</p>
                <p className="text-[10px] text-gray-500">Super Admin</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={cn("flex-1 transition-all duration-300", collapsed ? "ml-16" : "ml-64")}>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
