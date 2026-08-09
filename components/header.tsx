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
  GraduationCap,
  FlaskConical,
  ChevronDown,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import { InterviewTrackDialog } from "@/components/interview/InterviewTrackPicker"
import { isLearnPath } from "@/components/learn/learn-tracks"
import { LearnTrackDialog } from "@/components/learn/LearnTrackPicker"
import { LEARN_HUB_PATH } from "@/lib/tutorials/lesson-routes"
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
  isActive: (pathname: string) => boolean
}

// Which picker window a "picker" nav entry opens.
type AppNavPickerId = "interview" | "learn"

// Two kinds of nav entry, told apart by `kind` so the render has one branch instead
// of a hand-written exception per hub. Interview and Learn are multi-track hubs
// rather than single destinations, so their entries open a picker window; every
// other entry is a plain link.
type AppNavItem =
  | {
      kind: "link"
      label: string
      href: string
      icon: LucideIcon
      isActive: (pathname: string) => boolean
    }
  | {
      kind: "picker"
      label: string
      picker: AppNavPickerId
      icon: LucideIcon
      isActive: (pathname: string) => boolean
    }

// Single source of truth for the logged-in product nav, links and pickers in one
// ordered list. Desktop renders these as a label-only segmented control (icons read
// as template-y noise at seven items), while mobile keeps the icons to aid vertical
// scanning — both map from this one list so the two menus, and their active states,
// can never drift apart.
const APP_NAV: AppNavItem[] = [
  {
    kind: "link",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    isActive: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    // Each interview track is a different round with a different bar, so the entry
    // offers the choice instead of picking one for the user the way the old default
    // tab did. The tracks live in the interview registry, which is JSX-free and
    // registry-free precisely so the header can import it on every page.
    kind: "picker",
    label: "Interview",
    picker: "interview",
    icon: Terminal,
    // Guard against /interview-prep, which is a separate marketing route.
    isActive: (pathname) =>
      pathname.startsWith("/interview") && !pathname.startsWith("/interview-prep"),
  },
  {
    kind: "link",
    label: "Labs",
    href: "/labs",
    icon: FlaskConical,
    isActive: (pathname) => pathname.startsWith("/labs"),
  },
  {
    kind: "link",
    label: "Sessions",
    href: "/sessions",
    icon: Clock,
    isActive: (pathname) => pathname.startsWith("/sessions"),
  },
  {
    kind: "link",
    label: "Roadmap",
    href: "/roadmap",
    icon: Map,
    isActive: (pathname) => pathname.startsWith("/roadmap"),
  },
  {
    kind: "link",
    label: "Knowledge",
    href: "/knowledge",
    icon: Brain,
    isActive: (pathname) => pathname.startsWith("/knowledge"),
  },
  {
    // Python + SQL + System Design, each with its own logo in the picker window. The
    // tracks live in the Learn registry so the header, the window, and /learn can
    // never drift apart. All tracks live under /learn/*, so one prefix covers the
    // active state.
    kind: "picker",
    label: "Learn",
    picker: "learn",
    icon: GraduationCap,
    isActive: isLearnPath,
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
    label: "Learn",
    // A real anchor, deliberately NOT the picker button the signed-in nav uses. The Learn hub is the
    // entry point to the whole public lesson corpus, and a crawler (or anyone middle-clicking) can
    // only follow an <a href>. `LEARN_HUB_PATH` comes from the pure route module, so importing it
    // here does not drag the multi-megabyte curriculum registries into the client bundle.
    href: LEARN_HUB_PATH,
    isActive: isLearnPath,
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
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // One picker window per hub drives both the desktop nav button and the mobile menu row.
  const [isInterviewPickerOpen, setIsInterviewPickerOpen] = useState(false)
  const [isLearnPickerOpen, setIsLearnPickerOpen] = useState(false)
  const { user, initialized } = useAuth()
  const pathname = usePathname()
  const userDisplayName = user?.user_metadata?.full_name || user?.email || "Account"

  // Lets a picker nav entry reach its own window by id, so both menus stay a plain
  // map over APP_NAV instead of growing a branch per hub.
  const navPickers: Record<AppNavPickerId, { open: boolean; setOpen: (open: boolean) => void }> = {
    interview: { open: isInterviewPickerOpen, setOpen: setIsInterviewPickerOpen },
    learn: { open: isLearnPickerOpen, setOpen: setIsLearnPickerOpen },
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Apple-calm marketing links: sentence case, light weight, no tracking.
  // Active reads via weight + brightness (theme tokens, so it tracks light/dark).
  const marketingTabClass = (active: boolean) =>
    `focus-visible:ring-accent/50 cursor-pointer rounded-sm text-[13px] tracking-normal transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none ${
      active
        ? "text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground font-normal"
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
      {/* Edge-to-edge translucent bar — blends into the hero in both themes,
          then a hairline materializes on scroll. Apple-slim 56px row. */}
      <div
        className={`border-b backdrop-blur-xl transition-colors duration-300 ${
          isScrolled
            ? "border-border bg-background/85 shadow-lg shadow-black/10"
            : "bg-background/70 border-transparent"
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
                // lingering in-page hash would otherwise keep us scrolled down).
                if (!user && pathname === "/") {
                  if (window.location.hash) {
                    history.replaceState(null, "", "/")
                  }
                  window.scrollTo({ top: 0, behavior: "smooth" })
                }
              }}
            >
              <span className="text-foreground text-lg font-semibold tracking-[-0.02em] transition-colors">
                CodeSparring
              </span>
            </Link>

            {/* Desktop Navigation */}
            {/* The logged-out row gained a "Learn" link, so it tightens to gap-5 at the md
                breakpoint (where the bar is narrowest) and only opens back up to gap-8 at lg. */}
            <nav className={`hidden items-center md:flex ${user ? "space-x-5" : "gap-5 lg:gap-8"}`}>
              {!initialized ? (
                <div className="flex h-10 items-center">
                  <div className="border-foreground h-5 w-5 animate-spin rounded-full border-b-2 opacity-50"></div>
                </div>
              ) : user ? (
                <>
                  <div className="flex items-center gap-0.5">
                    {APP_NAV.map((item) => {
                      const active = item.isActive(pathname)
                      const activeClass = active
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"

                      if (item.kind === "picker") {
                        const picker = navPickers[item.picker]
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => picker.setOpen(true)}
                            aria-haspopup="dialog"
                            aria-expanded={picker.open}
                            aria-current={active ? "page" : undefined}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${activeClass}`}
                          >
                            {item.label}
                            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                          </button>
                        )
                      }

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${activeClass}`}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                  <div className="border-border flex items-center space-x-3 border-l pl-4">
                    <ThemeToggle />
                    <NotificationBell />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:text-accent text-foreground/90 hover:bg-foreground/10 max-w-[210px] gap-2 rounded-full px-3"
                        >
                          <User className="h-4 w-4" />
                          <span className="max-w-[140px] truncate">{userDisplayName}</span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="border-border bg-popover text-popover-foreground w-56 shadow-xl shadow-black/20"
                      >
                        <DropdownMenuLabel className="font-normal">
                          <span className="text-muted-foreground block text-xs">Signed in as</span>
                          <span className="text-foreground/90 block truncate text-sm">
                            {userDisplayName}
                          </span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem asChild className="focus:bg-foreground/10 cursor-pointer">
                          <Link href="/account" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Account
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={handleSignOut}
                          className="text-muted-foreground focus:bg-foreground/10 focus:text-foreground cursor-pointer gap-2"
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
                      className={marketingTabClass(item.isActive(pathname))}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <ThemeToggle />
                  {/* Join us — quiet text link, de-emphasized vs the accent Sign-in CTA. */}
                  <Link href="/careers" className={marketingTabClass(false)}>
                    Join us
                  </Link>
                  <Link
                    href="/login"
                    className="border-accent/40 bg-accent/10 text-accent hover:border-accent/60 hover:bg-accent/15 focus-visible:ring-accent/50 inline-flex h-8 items-center rounded-full border px-4 text-[13px] font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="text-foreground cursor-pointer md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="border-border mt-4 border-t pb-4 md:hidden">
              <div className="flex flex-col space-y-4 pt-4">
                {!initialized ? (
                  <div className="flex justify-center py-4">
                    <div className="border-foreground h-6 w-6 animate-spin rounded-full border-b-2 opacity-50"></div>
                  </div>
                ) : user ? (
                  <>
                    {APP_NAV.map((item) => {
                      const Icon = item.icon
                      const active = item.isActive(pathname)
                      const activeClass = active
                        ? "text-accent"
                        : "hover:text-accent text-foreground/90"

                      if (item.kind === "picker") {
                        const picker = navPickers[item.picker]
                        return (
                          <button
                            key={item.label}
                            type="button"
                            aria-haspopup="dialog"
                            aria-expanded={picker.open}
                            aria-current={active ? "page" : undefined}
                            className={`flex cursor-pointer items-center space-x-2 transition-colors duration-300 ${activeClass}`}
                            onClick={() => {
                              // Close the sheet first: the picker is a modal dialog, and
                              // leaving the menu open behind it traps focus in two layers.
                              setIsMobileMenuOpen(false)
                              picker.setOpen(true)
                            }}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                          </button>
                        )
                      }

                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center space-x-2 transition-colors duration-300 ${activeClass}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                    <Link
                      href="/account"
                      className="hover:text-accent text-foreground/90 flex items-center space-x-2 transition-colors duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Account</span>
                    </Link>
                    <div className="border-border border-t pt-4">
                      <p className="text-muted-foreground mb-2 text-sm">{userDisplayName}</p>
                      <Button
                        onClick={() => {
                          handleSignOut()
                          setIsMobileMenuOpen(false)
                        }}
                        variant="outline"
                        className="border-accent/50 text-accent hover:bg-accent hover:text-accent-foreground w-fit bg-transparent transition-all duration-300"
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
                          item.isActive(pathname)
                            ? "text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground font-normal"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-muted-foreground text-sm">Theme</span>
                      <ThemeToggle />
                    </div>
                    <Link
                      href="/careers"
                      className="hover:text-accent text-muted-foreground cursor-pointer text-sm transition-colors duration-300"
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

      <InterviewTrackDialog open={isInterviewPickerOpen} onOpenChange={setIsInterviewPickerOpen} />
      <LearnTrackDialog open={isLearnPickerOpen} onOpenChange={setIsLearnPickerOpen} />
    </header>
  )
}
