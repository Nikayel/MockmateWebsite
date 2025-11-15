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
  const { user, loading: isLoading } = useAuth()

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
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "glass-effect" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative">
              <Code className="h-8 w-8 text-white animate-pulse-glow" />
              <div className="absolute inset-0 bg-[#ff5733] rounded-full blur-lg opacity-30 animate-pulse"></div>
            </div>
            <span className="text-2xl font-heading font-bold text-gradient">MockMate</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link href="/dashboard" className="text-white hover:text-[#ff5733] transition-colors duration-300 flex items-center space-x-1">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link href="/profile" className="text-white hover:text-[#ff5733] transition-colors duration-300 flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <Link href="/sessions" className="text-white hover:text-[#ff5733] transition-colors duration-300 flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Sessions</span>
                </Link>
                <Link href="/interview" className="text-white hover:text-[#ff5733] transition-colors duration-300 flex items-center space-x-1">
                  <Terminal className="h-4 w-4" />
                  <span>Practice</span>
                </Link>
                <div className="flex items-center space-x-3 pl-4 border-l border-white/20">
                  <span className="text-sm text-gray-300">{user.user_metadata?.full_name || user.email}</span>
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="border-white/50 text-white hover:bg-white hover:text-black transition-all duration-300 bg-transparent"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <>
                <a href="/#features" className="text-white hover:text-[#ff5733] transition-colors duration-300">
                  Features
                </a>
                <Link href="/pricing" className="text-white hover:text-[#ff5733] transition-colors duration-300">
                  Pricing
                </Link>
                <Link href="/demo" className="text-white hover:text-[#ff5733] transition-colors duration-300">
                  Demo
                </Link>
                <Link href="/docs" className="text-white hover:text-[#ff5733] transition-colors duration-300">
                  Docs
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-black transition-all duration-300 bg-transparent"
                  >
                    Login
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-white/20">
            <div className="flex flex-col space-y-4 pt-4">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-white hover:text-[#ff5733] transition-colors duration-300 flex items-center space-x-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/profile"
                    className="text-white hover:text-[#ff5733] transition-colors duration-300 flex items-center space-x-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/sessions"
                    className="text-white hover:text-[#ff5733] transition-colors duration-300 flex items-center space-x-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Clock className="h-4 w-4" />
                    <span>Sessions</span>
                  </Link>
                  <Link
                    href="/interview"
                    className="text-white hover:text-[#ff5733] transition-colors duration-300 flex items-center space-x-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Terminal className="h-4 w-4" />
                    <span>Practice</span>
                  </Link>
                  <div className="pt-4 border-t border-white/20">
                    <p className="text-sm text-gray-300 mb-2">{user.user_metadata?.full_name || user.email}</p>
                    <Button
                      onClick={() => {
                        handleSignOut()
                        setIsMobileMenuOpen(false)
                      }}
                      variant="outline"
                      className="border-white/50 text-white hover:bg-white hover:text-black transition-all duration-300 w-fit bg-transparent"
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
                    className="text-white hover:text-[#ff5733] transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Features
                  </a>
                  <Link
                    href="/pricing"
                    className="text-white hover:text-[#ff5733] transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/demo"
                    className="text-white hover:text-[#ff5733] transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Demo
                  </Link>
                  <Link
                    href="/docs"
                    className="text-white hover:text-[#ff5733] transition-colors duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Docs
                  </Link>
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="border-white text-white hover:bg-white hover:text-black transition-all duration-300 w-fit bg-transparent"
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
