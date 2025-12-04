"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Code, Menu, X, User, LayoutDashboard, Clock, Terminal, LogOut } from "lucide-react"
import Link from "next/link"
import { signOut } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, loading: isLoading, initialized } = useAuth()

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
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled ? "glass-minimal border-b border-accent/10" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Code className="h-8 w-8 text-accent group-hover:animate-neural-pulse transition-all" />
              <div className="absolute inset-0 bg-accent rounded-full blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
            </div>
            <span className="text-2xl font-heading font-bold bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent">
              Skillon
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {!initialized ? (
              <div className="h-10 flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white opacity-50"></div>
              </div>
            ) : user ? (
              <>
                <Link href="/dashboard" className="text-white/90 hover:text-accent transition-colors duration-300 flex items-center space-x-1">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link href="/profile" className="text-white/90 hover:text-accent transition-colors duration-300 flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <Link href="/sessions" className="text-white/90 hover:text-accent transition-colors duration-300 flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Sessions</span>
                </Link>
                <Link href="/interview" className="text-white/90 hover:text-accent transition-colors duration-300 flex items-center space-x-1">
                  <Terminal className="h-4 w-4" />
                  <span>Practice</span>
                </Link>
                <div className="flex items-center space-x-3 pl-4 border-l border-white/10">
                  <span className="text-sm text-gray-400">{user.user_metadata?.full_name || user.email}</span>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="border-accent/50 text-accent hover:bg-accent hover:text-black transition-all duration-300 bg-transparent"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                <a href="/#features" className="text-white/90 hover:text-accent transition-colors duration-300 cursor-pointer">
                  Features
                </a>
                <Link href="/pricing" className="text-white/90 hover:text-accent transition-colors duration-300 cursor-pointer">
                  Pricing
                </Link>
                <Link href="/docs" className="text-white/90 hover:text-accent transition-colors duration-300 cursor-pointer">
                  Docs
                </Link>
                <Link href="/careers" className="text-white/50 hover:text-accent transition-colors duration-300 cursor-pointer text-sm">
                  Join us
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-accent/50 text-accent hover:bg-accent hover:text-black transition-all duration-300 bg-transparent"
                  >
                    Login
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-white cursor-pointer" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-white/20">
            <div className="flex flex-col space-y-4 pt-4">
              {!initialized ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white opacity-50"></div>
                </div>
              ) : user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-white/90 hover:text-accent transition-colors duration-300 flex items-center space-x-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="text-white/90 hover:text-accent transition-colors duration-300 flex items-center space-x-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/sessions"
                    className="text-white/90 hover:text-accent transition-colors duration-300 flex items-center space-x-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Clock className="h-4 w-4" />
                    <span>Sessions</span>
                  </Link>
                  <Link
                    href="/interview"
                    className="text-white/90 hover:text-accent transition-colors duration-300 flex items-center space-x-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Terminal className="h-4 w-4" />
                    <span>Practice</span>
                  </Link>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-2">{user.user_metadata?.full_name || user.email}</p>
                    <Button
                      onClick={() => {
                        handleSignOut()
                        setIsMobileMenuOpen(false)
                      }}
                      variant="outline"
                      className="border-accent/50 text-accent hover:bg-accent hover:text-black transition-all duration-300 w-fit bg-transparent"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <a
                    href="/#features"
                    className="text-white/90 hover:text-accent transition-colors duration-300 cursor-pointer"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Features
                  </a>
                  <Link
                    href="/pricing"
                    className="text-white/90 hover:text-accent transition-colors duration-300 cursor-pointer"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/docs"
                    className="text-white/90 hover:text-accent transition-colors duration-300 cursor-pointer"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Docs
                  </Link>
                  <Link
                    href="/careers"
                    className="text-white/50 hover:text-accent transition-colors duration-300 cursor-pointer text-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Join us
                  </Link>
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="border-accent/50 text-accent hover:bg-accent hover:text-black transition-all duration-300 w-fit bg-transparent"
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
