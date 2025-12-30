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
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
  { name: "Research", href: "/admin/research", icon: FlaskConical, badge: "A/B" },
  { name: "Errors", href: "/admin/errors", icon: AlertCircle },
  { name: "Settings", href: "/admin/settings", icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
        console.error("Admin check failed:", error)
        setIsAdmin(false)
      }
    }

    checkAdminAccess()
  }, [authLoading, firebaseUser, router])

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="bg-gray-900/50 border border-red-500/30 rounded-lg p-8 max-w-md text-center">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
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
      console.error("Sign out error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-gray-900/95 border-r border-gray-800 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#00d9ff] to-[#00ff88] rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-black" />
              </div>
              <span className="font-heading font-bold text-white">Admin</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#00d9ff]/10 text-[#00d9ff] border border-[#00d9ff]/20"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-[#00d9ff]")} />
                {!collapsed && (
                  <>
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
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
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d9ff] to-[#00ff88] flex items-center justify-center">
                <span className="text-black font-bold text-sm">
                  {firebaseUser.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {firebaseUser.email}
                </p>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "ml-16" : "ml-64"
        )}
      >
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
