"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Code, Menu, X } from "lucide-react"
import Link from "next/link"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
          <nav className="hidden md:flex items-center space-x-8">
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
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
