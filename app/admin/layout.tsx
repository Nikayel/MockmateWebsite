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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const navigation: NavItem[] = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Revenue", href: "/admin/revenue", icon: DollarSign },
  { name: "Sessions", href: "/admin/sessions", icon: Activity },
  { name: "Funnel", href: "/admin/funnel", icon: TrendingUp },
  { name: "AI Usage", href: "/admin/ai-usage", icon: Cpu },
  { name: "RAG", href: "/admin/rag", icon: Search },
  { name: "Research", href: "/admin/research", icon: FlaskConical, badge: "A/B" },
  { name: "Errors", href: "/admin/errors", icon: AlertCircle },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

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
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00d9ff] to-[#00ff88]">
                <Shield className="h-5 w-5 text-black" />
              </div>
              <span className="font-heading font-bold text-white">Admin</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "border border-[#00d9ff]/20 bg-[#00d9ff]/10 text-[#00d9ff]"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-[#00d9ff]")} />
                {!collapsed && (
                  <>
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-800 p-4">
          {!collapsed && firebaseUser && (
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ff88]">
                <span className="text-sm font-bold text-black">
                  {firebaseUser.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{firebaseUser.email}</p>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
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
