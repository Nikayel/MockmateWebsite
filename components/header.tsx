"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X, User, LayoutDashboard, Clock, Terminal, LogOut, Map, Brain } from "lucide-react"
import { Logo } from "@/components/Logo"
import Link from "next/link"
import { signOut } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import { NotificationBell } from "@/components/notification-bell"

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
      style={{ top: "var(--announcement-banner-height, 0px)" }}
      className={`fixed right-0 left-0 z-50 w-full transition-all duration-500 ${
        isScrolled ? "glass-minimal border-accent/10 border-b" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="group flex items-center space-x-2">
            <Logo size={32} className="text-accent transition-transform group-hover:scale-105" />
            <span className="font-heading text-2xl font-bold tracking-tight">
              <span className="text-white">Code</span>
              <span className="text-accent">Sparring</span>
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
                  href="/interview-prep"
                  className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                >
                  Company Prep
                </Link>
                <Link
                  href="/why-codesparring"
                  className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                >
                  How it works
                </Link>
                <Link
                  href="/#features"
                  className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                >
                  Features
                </Link>
                <Link
                  href="/blog"
                  className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                >
                  Blog
                </Link>
                <Link
                  href="/pricing"
                  className="hover:text-accent cursor-pointer text-white/90 transition-colors duration-300"
                >
                  Pricing
                </Link>
                <Link href="/login">
                  <Button
                    size="sm"
                    className="bg-accent/10 hover:bg-accent/20 text-accent border-0 transition-all duration-300"
                  >
                    Login
                  </Button>
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
