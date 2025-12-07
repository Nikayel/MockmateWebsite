"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Play, ArrowRight, Sparkles, Building2, Zap, Brain } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import { GridBackground } from "@/components/GridBackground"

// Lazy load Three.js particles for performance
const SubtleParticles = dynamic(
  () => import("@/components/SubtleParticles").then(mod => mod.SubtleParticles),
  { ssr: false, loading: () => null }
)

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
      {/* CSS Background - lightweight base */}
      <GridBackground />

      {/* Subtle Three.js particles overlay */}
      <SubtleParticles
        className="absolute inset-0 z-[1] opacity-60"
        particleCount={20}
        primaryColor="#00d9ff"
        secondaryColor="#00ff88"
      />

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
            Practice coding interviews with an{" "}
            <span className="text-accent font-medium">AI interviewer</span> in your browser.
            <br className="hidden sm:block" />
            <span className="text-white/90">Get feedback. Ship faster. Land the job.</span>
          </motion.p>

          {/* Code Terminal */}
          <motion.div
            variants={staggerItem}
            className="mb-12 max-w-2xl mx-auto group"
          >
            <div className="bg-gray-950/80 backdrop-blur-sm rounded-xl p-6 border border-white/[0.06] transition-all duration-500 hover:border-white/[0.12]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500/80 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500/80 rounded-full" />
                <div className="w-3 h-3 bg-green-500/80 rounded-full" />
                <span className="ml-auto text-xs text-gray-600 font-mono">skillon.dev</span>
              </div>
              <div className="text-left font-mono text-sm sm:text-base">
                <span className="text-gray-600">// Your AI interview partner</span>
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

          {/* Features - Simple inline style */}
          <motion.div
            variants={staggerItem}
            className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-500 mb-8"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              AI interviewer
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neural" />
              Real-time feedback
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              No install needed
            </span>
          </motion.div>

          {/* VS Code Coming Soon - More subtle */}
          <motion.div
            variants={staggerItem}
            className="max-w-md mx-auto"
          >
            <Link href="/install" className="block">
              <div className="text-sm text-gray-600 hover:text-gray-400 transition-colors">
                <span className="text-neural">VS Code extension</span> coming soon
                <ArrowRight className="w-3 h-3 inline-block ml-1" />
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
