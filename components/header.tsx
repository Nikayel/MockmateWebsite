"use client"

import { useState, useEffect } from "react"
import {
  Menu,
  X,
  User,
  LayoutDashboard,
  Clock,
  Terminal,
  LogOut,
  Map,
  Brain,
  FlaskConical,
  ChevronDown,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import { NotificationBell } from "@/components/notification-bell"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type MarketingNavItem = {
  label: string
  href: string
  isActive: (pathname: string, hash: string) => boolean
}

type AppNavItem = {
  label: string
  href: string
  icon: LucideIcon
  isActive: (pathname: string) => boolean
}

// Single source of truth for the logged-in product nav. Desktop renders these as
// a label-only segmented control (icons read as template-y noise at six items),
// while mobile keeps the icons to aid vertical scanning — both map from this one
// list so the two menus, and their active states, can never drift apart.
const APP_NAV: AppNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    isActive: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    label: "Interview",
    href: "/interview",
    icon: Terminal,
    // Guard against /interview-prep, which is a separate marketing route.
    isActive: (pathname) =>
      pathname.startsWith("/interview") && !pathname.startsWith("/interview-prep"),
  },
  {
    label: "Labs",
    href: "/labs",
    icon: FlaskConical,
    isActive: (pathname) => pathname.startsWith("/labs"),
  },
  {
    label: "Sessions",
    href: "/sessions",
    icon: Clock,
    isActive: (pathname) => pathname.startsWith("/sessions"),
  },
  {
    label: "Roadmap",
    href: "/roadmap",
    icon: Map,
    isActive: (pathname) => pathname.startsWith("/roadmap"),
  },
  {
    label: "Review",
    href: "/practice",
    icon: Brain,
    isActive: (pathname) => pathname.startsWith("/practice"),
  },
]

// Single source of truth for the marketing (logged-out) nav. Desktop and mobile
// both render from this list so the two menus can never drift apart, and every
// destination stays reachable on every viewport. Labels are concrete
// goal-oriented words (research: users scan for their task, not org-chart terms
// like "Platform").
const MARKETING_NAV: MarketingNavItem[] = [
  {
    label: "How it works",
    href: "/why-codesparring",
    isActive: (pathname) => pathname.startsWith("/why-codesparring"),
  },
  {
    label: "Features",
    href: "/#features",
    isActive: (pathname, hash) => pathname === "/" && hash === "#features",
  },
  {
    label: "Interviews",
    href: "/interview-prep",
    isActive: (pathname) => pathname.startsWith("/interview-prep"),
  },
  {
    label: "Pricing",
    href: "/pricing",
    isActive: (pathname) => pathname.startsWith("/pricing"),
  },
  {
    label: "Blog",
    href: "/blog",
    isActive: (pathname) => pathname.startsWith("/blog"),
  },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hash, setHash] = useState("")
  const { user, initialized } = useAuth()
  const pathname = usePathname()
  const userDisplayName = user?.user_metadata?.full_name || user?.email || "Account"

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Track the URL hash so "Features" lights up when viewing /#features,
  // and "Platform" only when on the bare home route.
  useEffect(() => {
    const syncHash = () => setHash(window.location.hash)
    syncHash()
    window.addEventListener("hashchange", syncHash)
    return () => window.removeEventListener("hashchange", syncHash)
  }, [pathname])

  // 12px (up from 11px) and slightly looser tracking for legibility; uppercase
  // is kept to match the brand wordmark/CTA treatment.
  // Apple-calm marketing links: sentence case, light weight, no tracking, no
  // periwinkle. Active reads via weight + brightness, not a heavy underline.
  const marketingTabClass = (active: boolean) =>
    `cursor-pointer rounded-sm text-[13px] tracking-normal transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
      active ? "font-medium text-white" : "font-normal text-white/55 hover:text-white"
    }`

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = "/"
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <header
      style={{ top: "var(--announcement-banner-height, 0px)" }}
      className="fixed inset-x-0 z-50 transition-colors duration-300"
    >
      {/* Edge-to-edge translucent bar — blends into the dark hero, then a
          hairline materializes on scroll. Apple-slim 56px row. */}
      <div
        className={`border-b backdrop-blur-xl transition-colors duration-300 ${
          isScrolled
            ? "border-white/10 bg-[#1a1917]/85 shadow-lg shadow-black/20"
            : "border-transparent bg-[#1a1917]/70"
        }`}
      >
        <div className={`mx-auto px-4 sm:px-6 ${user ? "max-w-7xl" : "max-w-6xl"}`}>
          <div className="flex h-14 items-center justify-between gap-4 font-[var(--font-geist)]">
            <Link
              href={user ? "/dashboard" : "/"}
              className="group flex items-center"
              onClick={() => {
                // For logged-out users already on the home route, scroll back to
                // the hero (Next.js won't re-navigate to the same path, and a
                // lingering #features hash would otherwise keep us scrolled down).
                if (!user && pathname === "/") {
                  if (window.location.hash) {
                    history.replaceState(null, "", "/")
                    setHash("")
                  }
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }
              }}
            >
              <span className="text-lg font-semibold tracking-[-0.02em] text-[#f1f2f7] transition-colors group-hover:text-white">
                CodeSparring
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className={`hidden items-center md:flex ${user ? "space-x-5" : "gap-8"}`}>
              {!initialized ? (
                <div className="flex h-10 items-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white opacity-50"></div>
                </div>
              ) : user ? (
                <>
                  <div className="flex items-center gap-0.5">
                    {APP_NAV.map((item) => {
                      const active = item.isActive(pathname)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                            active
                              ? "bg-white/10 text-white"
                              : "text-white/65 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                  <div className="flex items-center space-x-3 border-l border-white/10 pl-4">
                    <ThemeToggle />
                    <NotificationBell />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:text-accent max-w-[210px] gap-2 rounded-full px-3 text-white/90 hover:bg-white/10"
                        >
                          <User className="h-4 w-4" />
                          <span className="max-w-[140px] truncate">{userDisplayName}</span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 border-white/10 bg-[#1a1917] text-white shadow-xl shadow-black/30"
                      >
                        <DropdownMenuLabel className="font-normal">
                          <span className="block text-xs text-white/50">Signed in as</span>
                          <span className="block truncate text-sm text-white/90">
                            {userDisplayName}
                          </span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10">
                          <Link href="/account" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Account
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={handleSignOut}
                          className="cursor-pointer gap-2 text-[#adc6ff] focus:bg-[#adc6ff] focus:text-[#1a1917]"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              ) : (
                <>
                  {MARKETING_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={marketingTabClass(item.isActive(pathname, hash))}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href="/login"
                    className="border-accent/40 bg-accent/10 text-accent hover:border-accent/60 hover:bg-accent/15 focus-visible:ring-accent/50 ml-2 inline-flex h-8 items-center rounded-full border px-4 text-[13px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="cursor-pointer text-white md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="mt-4 border-t border-white/10 pb-4 md:hidden">
              <div className="flex flex-col space-y-4 pt-4">
                {!initialized ? (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-white opacity-50"></div>
                  </div>
                ) : user ? (
                  <>
                    {APP_NAV.map((item) => {
                      const Icon = item.icon
                      const active = item.isActive(pathname)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center space-x-2 transition-colors duration-300 ${
                            active ? "text-[#adc6ff]" : "hover:text-accent text-white/90"
                          }`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                    <Link
                      href="/account"
                      className="hover:text-accent flex items-center space-x-2 text-white/90 transition-colors duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Account</span>
                    </Link>
                    <div className="border-t border-white/10 pt-4">
                      <p className="mb-2 text-sm text-gray-400">{userDisplayName}</p>
                      <Button
                        onClick={() => {
                          handleSignOut()
                          setIsMobileMenuOpen(false)
                        }}
                        variant="outline"
                        className="border-accent/50 text-accent hover:bg-accent w-fit bg-transparent transition-all duration-300 hover:text-black"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {MARKETING_NAV.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`focus-visible:ring-accent/50 cursor-pointer rounded-sm text-[15px] transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none ${
                          item.isActive(pathname, hash)
                            ? "font-medium text-white"
                            : "font-normal text-white/60 hover:text-white"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <Link
                      href="/careers"
                      className="hover:text-accent cursor-pointer text-sm text-white/60 transition-colors duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Join us
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="border-accent/40 bg-accent/10 text-accent hover:border-accent/60 hover:bg-accent/15 focus-visible:ring-accent/50 inline-flex h-9 w-fit items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
