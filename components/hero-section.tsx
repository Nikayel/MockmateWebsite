"use client"

import { useState, useEffect, Suspense, lazy } from "react"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Play, ArrowRight, Sparkles, Cpu, Globe, Bell } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"

// Lazy load Three.js component for performance
const NeuralNetwork = lazy(() => import("@/components/NeuralNetwork"))

export function HeroSection() {
  const [typedText, setTypedText] = useState("")
  const codeSnippets = [
    'const solve = (problem) => optimal(solution);',
    'function ace() { return "interview"; }',
    'const skill = practice + AI_feedback;'
  ]
  const [snippetIndex, setSnippetIndex] = useState(0)
  const currentSnippet = codeSnippets[snippetIndex]

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i < currentSnippet.length) {
        setTypedText(currentSnippet.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
        setTimeout(() => {
          setTypedText("")
          i = 0
          setSnippetIndex((prev) => (prev + 1) % codeSnippets.length)
        }, 2000)
      }
    }, 80)

    return () => clearInterval(timer)
  }, [snippetIndex, currentSnippet])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Neural Network Background - Three.js */}
      <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
        <div className="absolute inset-0 z-0">
          <NeuralNetwork className="w-full h-full" nodeCount={60} enableMouse={true} />
        </div>
      </Suspense>

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/30 to-black/80 z-[1]" />

      {/* Scan line effect (subtle CRT) */}
      <div className="absolute inset-0 z-[2] pointer-events-none opacity-20">
        <div className="absolute inset-0 animate-scan bg-gradient-to-b from-transparent via-accent/5 to-transparent h-[2px]" />
      </div>

      {/* Content */}
      <motion.div
        className="container mx-auto px-4 text-center relative z-10"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="max-w-5xl mx-auto">
          {/* Eyebrow */}
          <motion.div variants={staggerItem} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4" />
              AI-Powered Interview Training
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={staggerItem}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-heading font-black mb-6 leading-[1.1] tracking-tight"
          >
            <span className="text-white">Master Technical</span>
            <br />
            <span className="text-glow bg-gradient-to-r from-accent via-neural to-accent bg-clip-text text-transparent">
              Interviews
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={staggerItem}
            className="text-lg sm:text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light"
          >
            Practice realistic coding interviews with an{" "}
            <span className="text-accent font-medium">AI interviewer</span> in your browser.
            <br className="hidden sm:block" />
            <span className="text-white/90">Get real-time feedback. Land your dream job.</span>
          </motion.p>

          {/* Code Terminal */}
          <motion.div
            variants={staggerItem}
            className="mb-12 max-w-2xl mx-auto group"
          >
            <div className="glass-minimal rounded-xl p-6 border border-accent/20 transition-all duration-500 hover:border-accent/40 hover:shadow-[0_0_40px_rgba(0,217,255,0.15)]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-destructive rounded-full" />
                <div className="w-3 h-3 bg-[#ffbf00] rounded-full" />
                <div className="w-3 h-3 bg-neural rounded-full" />
                <span className="ml-auto text-xs text-muted-foreground font-mono">skillon.dev</span>
              </div>
              <div className="text-left font-mono text-sm sm:text-base">
                <span className="text-muted-foreground">// Your AI interview partner</span>
                <br />
                <span className="text-accent">const</span>{" "}
                <span className="text-white">
                  {typedText}
                  <span className="inline-block w-2 h-5 bg-accent/80 ml-1 animate-pulse" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Link href="/interview">
              <MagneticButton
                size="lg"
                variant="primary"
                glowColor="accent"
                strength={0.5}
                className="group"
              >
                <Play className="w-5 h-5" />
                Start Practicing Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
            </Link>

            <Link href="/samples">
              <MagneticButton
                size="lg"
                variant="outline"
                glowColor="none"
                className="group"
              >
                <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                View Sample Reports
              </MagneticButton>
            </Link>
          </motion.div>

          {/* Stats - Modern Bento Style */}
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          >
            <motion.div
              variants={staggerItem}
              className="glass-minimal rounded-xl p-6 border border-white/[0.08] hover:border-accent/30 transition-all duration-500 group"
            >
              <div className="flex items-center justify-center mb-2">
                <Cpu className="w-6 h-6 text-accent group-hover:animate-neural-pulse" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">AI-Powered</div>
              <div className="text-sm text-muted-foreground">Smart Interviewer</div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="glass-minimal rounded-xl p-6 border border-white/[0.08] hover:border-neural/30 transition-all duration-500 group"
            >
              <div className="flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-neural group-hover:animate-neural-glow" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">Real-Time</div>
              <div className="text-sm text-muted-foreground">Code Feedback</div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="glass-minimal rounded-xl p-6 border border-white/[0.08] hover:border-accent/30 transition-all duration-500 group"
            >
              <div className="flex items-center justify-center mb-2">
                <Globe className="w-6 h-6 text-accent group-hover:animate-neural-pulse" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">Web-Based</div>
              <div className="text-sm text-muted-foreground">No Install Needed</div>
            </motion.div>
          </motion.div>

          {/* VS Code Coming Soon Banner */}
          <motion.div
            variants={staggerItem}
            className="mt-8 max-w-xl mx-auto"
          >
            <Link href="/install" className="block">
              <div className="glass-minimal rounded-lg px-6 py-4 border border-neural/30 hover:border-neural/50 transition-all duration-300 cursor-pointer group">
                <div className="flex items-center justify-center gap-3">
                  <Bell className="w-5 h-5 text-neural animate-pulse" />
                  <span className="text-gray-300 text-sm">
                    <span className="text-neural font-medium">VS Code Extension</span> coming soon —
                    <span className="text-white/80 group-hover:text-white transition-colors"> get notified</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-neural group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
