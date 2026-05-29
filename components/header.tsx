"use client"

import { useState, useEffect } from "react"
import { Menu, X, User, LayoutDashboard, Clock, Terminal, LogOut, Map, Brain } from "lucide-react"
import Link from "next/link"
import { signOut } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import { NotificationBell } from "@/components/notification-bell"
import { Button } from "@/components/ui/button"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, initialized } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
      style={{ top: "calc(var(--announcement-banner-height, 0px) + 24px)" }}
      className="fixed right-0 left-0 z-50 w-full px-4 transition-all duration-500"
    >
      <div
        className={`mx-auto max-w-5xl rounded-full border px-6 py-3 shadow-lg transition-all duration-500 md:px-7 ${
          isScrolled
            ? "border-white/12 bg-[#15151a]/90 shadow-black/30 backdrop-blur-xl"
            : "border-white/10 bg-[#17171c]/80 shadow-black/20 backdrop-blur-xl"
        }`}
      >
        <div className="flex items-center justify-between gap-4 font-[var(--font-geist)]">
          <Link href={user ? "/dashboard" : "/"} className="group flex items-center">
            <span className="text-2xl font-extrabold tracking-[-0.04em] text-[#f1f2f7] transition-colors group-hover:text-white">
              CodeSparring
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center space-x-6 md:flex">
            {!initialized ? (
              <div className="flex h-10 items-center">
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white opacity-50"></div>
              </div>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hover:text-accent flex items-center space-x-1 text-white/90 transition-colors duration-300"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/interview"
                  className="hover:text-accent flex items-center space-x-1 text-white/90 transition-colors duration-300"
                >
                  <Terminal className="h-4 w-4" />
                  <span>Interview</span>
                </Link>
                <Link
                  href="/sessions"
                  className="hover:text-accent flex items-center space-x-1 text-white/90 transition-colors duration-300"
                >
                  <Clock className="h-4 w-4" />
                  <span>Sessions</span>
                </Link>
                <Link
                  href="/roadmap"
                  className="hover:text-accent flex items-center space-x-1 text-white/90 transition-colors duration-300"
                >
                  <Map className="h-4 w-4" />
                  <span>Roadmap</span>
                </Link>
                <Link
                  href="/practice"
                  className="hover:text-accent flex items-center space-x-1 text-white/90 transition-colors duration-300"
                >
                  <Brain className="h-4 w-4" />
                  <span>Review</span>
                </Link>
                <Link
                  href="/account"
                  className="hover:text-accent flex items-center space-x-1 text-white/90 transition-colors duration-300"
                >
                  <User className="h-4 w-4" />
                  <span>Account</span>
                </Link>
                <div className="flex items-center space-x-3 border-l border-white/10 pl-4">
                  <NotificationBell />
                  <span className="text-sm text-gray-400">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="border-accent/50 text-accent hover:bg-accent bg-transparent transition-all duration-300 hover:text-black"
                  >
                    <LogOut className="mr-1 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className="cursor-pointer border-b-2 border-[#adc6ff] pb-1 text-[11px] font-bold tracking-[0.1em] text-[#adc6ff] uppercase transition-colors duration-300"
                >
                  Platform
                </Link>
                <Link
                  href="/#features"
                  className="cursor-pointer text-[11px] font-bold tracking-[0.1em] text-[#c2c6d6] uppercase transition-colors duration-300 hover:text-white"
                >
                  Features
                </Link>
                <Link
                  href="/interview-prep"
                  className="cursor-pointer text-[11px] font-bold tracking-[0.1em] text-[#c2c6d6] uppercase transition-colors duration-300 hover:text-white"
                >
                  Interviews
                </Link>
                <Link
                  href="/pricing"
                  className="cursor-pointer text-[11px] font-bold tracking-[0.1em] text-[#c2c6d6] uppercase transition-colors duration-300 hover:text-white"
                >
                  Pricing
                </Link>
                <Link
                  href="/login"
                  className="ml-8 cursor-pointer text-[11px] font-bold tracking-[0.1em] text-[#c2c6d6] uppercase transition-colors duration-300 hover:text-white lg:ml-16 xl:ml-28"
                >
                  Login
                </Link>
                <Link href="/interview">
                  <span className="inline-flex rounded-full bg-[#adc6ff] px-5 py-2 text-[11px] font-extrabold tracking-[0.12em] text-[#001a42] uppercase shadow-[0_0_26px_rgba(173,198,255,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c1d3ff]">
                    Get Started
                  </span>
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
          <nav className="mt-4 border-t border-white/20 pb-4 md:hidden">
            <div className="flex flex-col space-y-4 pt-4">
              {!initialized ? (
                <div className="flex justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-white opacity-50"></div>
                </div>
              ) : user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="hover:text-accent flex items-center space-x-2 text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/interview"
                    className="hover:text-accent flex items-center space-x-2 text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Terminal className="h-4 w-4" />
                    <span>Interview</span>
                  </Link>
                  <Link
                    href="/sessions"
                    className="hover:text-accent flex items-center space-x-2 text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Clock className="h-4 w-4" />
                    <span>Sessions</span>
                  </Link>
                  <Link
                    href="/roadmap"
                    className="hover:text-accent flex items-center space-x-2 text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Map className="h-4 w-4" />
                    <span>Roadmap</span>
                  </Link>
                  <Link
                    href="/practice"
                    className="hover:text-accent flex items-center space-x-2 text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Brain className="h-4 w-4" />
                    <span>Review</span>
                  </Link>
                  <Link
                    href="/account"
                    className="hover:text-accent flex items-center space-x-2 text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>Account</span>
                  </Link>
                  <div className="border-t border-white/10 pt-4">
                    <p className="mb-2 text-sm text-gray-400">
                      {user.user_metadata?.full_name || user.email}
                    </p>
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
                  <Link
                    href="/interview-prep"
                    className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Company Prep
                  </Link>
                  <Link
                    href="/why-codesparring"
                    className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    How it works
                  </Link>
                  <Link
                    href="/#features"
                    className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link
                    href="/blog"
                    className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Blog
                  </Link>
                  <Link
                    href="/pricing"
                    className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/careers"
                    className="hover:text-accent cursor-pointer text-sm text-white/60 transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Join us
                  </Link>
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      size="sm"
                      className="bg-accent/10 hover:bg-accent/20 text-accent w-fit border-0 transition-all duration-300"
                    >
                      Login
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
