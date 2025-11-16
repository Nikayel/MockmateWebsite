"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, ArrowRight, Terminal, Zap } from "lucide-react"
import Link from "next/link"

export function HeroSection() {
  const [typedText, setTypedText] = useState("")
  const fullText = 'function solveProblem() { return "success"; }'

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
        setTimeout(() => {
          setTypedText("")
          i = 0
        }, 2000)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [])

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 bg-[url('/abstract-geometric-pattern.png')] opacity-5"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <Terminal className="h-12 w-12 text-white/20" />
      </div>
      <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: "2s" }}>
        <Zap className="h-8 w-8 text-[#ff5733]/30" />
      </div>
      <div className="absolute bottom-40 left-20 animate-float" style={{ animationDelay: "4s" }}>
        <div className="w-4 h-4 bg-white/20 rounded-full"></div>
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-heading font-bold mb-6 leading-tight">
            <span className="text-white">Unleash Your</span>
            <br />
            <span className="text-gradient animate-gradient">Coding Potential</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Practice realistic interviews in VS Code with an AI interviewer and coding partner. Transform your
            development experience with seamless coding, enhanced productivity, and innovative features.
          </p>

          {/* Code Animation */}
          <div className="bg-gray-900/50 rounded-lg p-6 mb-8 max-w-2xl mx-auto glass-effect">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-left">
              <span className="text-gray-500">// MockMate AI Interview</span>
              <br />
              <span className="text-[#ff5733]">const</span>{" "}
              <span className="text-white font-mono">
                {typedText}
                <span className="animate-pulse">|</span>
              </span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/install">
              <Button
                size="lg"
                className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-4 text-lg font-semibold animate-pulse-glow group"
              >
                Start in VS Code
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg group bg-transparent"
              >
                <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Features Highlight */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#ff5733] mb-2">AI-Powered</div>
              <div className="text-gray-400">Smart Interviewer</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#ff5733] mb-2">Real-Time</div>
              <div className="text-gray-400">Code Feedback</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#ff5733] mb-2">In VS Code</div>
              <div className="text-gray-400">Native Integration</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
