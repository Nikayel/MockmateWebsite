"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Play, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import { GridBackground } from "@/components/GridBackground"

// Lazy load Three.js particles for performance
const SubtleParticles = dynamic(
  () => import("@/components/SubtleParticles").then(mod => mod.SubtleParticles),
  { ssr: false, loading: () => null }
)

/**
 * Hero Section - Redesigned with Cognitive Science Principles
 *
 * Applied research:
 * - Hick's Law: Reduced choices (one primary CTA, one secondary)
 * - Visual Hierarchy: Clear H1 > subtitle > CTA progression
 * - F-Pattern: Content flows left-to-right, top-to-bottom
 * - Gestalt Proximity: Related elements grouped with consistent spacing
 * - Von Restorff Effect: Primary CTA stands out with color/size
 * - Cognitive Load: Removed animated typing (distracting), simplified message
 */
export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-black">
      {/* CSS Background - lightweight base */}
      <GridBackground />

      {/* Subtle Three.js particles overlay */}
      <SubtleParticles
        className="absolute inset-0 z-[1] opacity-40"
        particleCount={15}
        primaryColor="#00d9ff"
        secondaryColor="#00ff88"
      />

      {/* Content - with proper header offset and vertical rhythm */}
      <motion.div
        className="container mx-auto px-4 relative z-10 pt-32 pb-20 lg:pt-40 lg:pb-28"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Two-column layout for better space utilization on larger screens */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left Column - Message (Following F-pattern reading) */}
            <div className="text-center lg:text-left">
              {/* Social Proof Badge - Von Restorff: distinctive but not distracting */}
              <motion.div variants={staggerItem} className="mb-8">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-neural animate-pulse" />
                  Now used by engineers at Meta, Google & Amazon
                </span>
              </motion.div>

              {/* Main Headline - Visual Hierarchy: largest, boldest */}
              <motion.h1
                variants={staggerItem}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-black mb-6 leading-[1.1] tracking-tight"
              >
                <span className="text-white">Ace Your Next</span>
                <br />
                <span className="bg-gradient-to-r from-accent via-neural to-accent bg-clip-text text-transparent">
                  Technical Interview
                </span>
              </motion.h1>

              {/* Value Proposition - Clear, scannable */}
              <motion.p
                variants={staggerItem}
                className="text-lg md:text-xl text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Practice with an AI interviewer that adapts to your level.
                Get instant feedback. Build lasting skills with spaced repetition.
              </motion.p>

              {/* CTAs - Hick's Law: One primary action, one secondary */}
              <motion.div
                variants={staggerItem}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10"
              >
                <Link href="/interview">
                  <MagneticButton
                    size="lg"
                    variant="primary"
                    glowColor="accent"
                    strength={0.4}
                    className="w-full sm:w-auto"
                  >
                    <Play className="w-5 h-5" />
                    Start Free Practice
                    <ArrowRight className="w-5 h-5" />
                  </MagneticButton>
                </Link>

                <Link href="/why-skillon">
                  <MagneticButton
                    size="lg"
                    variant="outline"
                    glowColor="none"
                    className="w-full sm:w-auto"
                  >
                    How It Works
                  </MagneticButton>
                </Link>
              </motion.div>

              {/* Trust Signals - Proximity: grouped benefits */}
              <motion.div
                variants={staggerItem}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center lg:justify-start text-sm text-gray-500"
              >
                <span className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-neural" />
                  No credit card required
                </span>
                <span className="flex items-center gap-2 justify-center lg:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-neural" />
                  2 free sessions/month
                </span>
              </motion.div>
            </div>

            {/* Right Column - Visual Demo */}
            <motion.div
              variants={staggerItem}
              className="relative hidden lg:block"
            >
              {/* Demo Terminal - Shows the product in action */}
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-accent/20 to-neural/20 rounded-3xl blur-2xl opacity-50" />

                <div className="relative bg-gray-950/90 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-gray-900/50">
                    <div className="w-3 h-3 bg-red-500/60 rounded-full" />
                    <div className="w-3 h-3 bg-yellow-500/60 rounded-full" />
                    <div className="w-3 h-3 bg-green-500/60 rounded-full" />
                    <span className="ml-4 text-xs text-gray-600 font-mono">skillon.dev/interview</span>
                  </div>

                  {/* Interview simulation */}
                  <div className="p-6 space-y-4">
                    {/* AI Message */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent text-xs font-bold">AI</span>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg rounded-tl-none p-3 max-w-[280px]">
                        <p className="text-sm text-gray-300">
                          Great approach! Can you optimize the time complexity from O(n²) to O(n)?
                        </p>
                      </div>
                    </div>

                    {/* Code snippet */}
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                      <div className="text-gray-500 mb-2">// Your solution</div>
                      <div>
                        <span className="text-purple-400">function</span>{" "}
                        <span className="text-accent">twoSum</span>
                        <span className="text-gray-400">(nums, target) {"{"}</span>
                      </div>
                      <div className="pl-4">
                        <span className="text-purple-400">const</span>{" "}
                        <span className="text-white">map</span>{" "}
                        <span className="text-gray-400">= new</span>{" "}
                        <span className="text-neural">Map</span>
                        <span className="text-gray-400">();</span>
                      </div>
                      <div className="pl-4 text-gray-600">// ...</div>
                      <div className="text-gray-400">{"}"}</div>
                    </div>

                    {/* Feedback badge */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded bg-neural/20 text-neural">
                        Optimal: O(n)
                      </span>
                      <span className="px-2 py-1 rounded bg-accent/20 text-accent">
                        HashMap pattern
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Stats - Social Proof (Desktop only) */}
          <motion.div
            variants={staggerItem}
            className="hidden md:flex justify-center lg:justify-start gap-12 mt-16 pt-8 border-t border-white/5"
          >
            <div className="text-center lg:text-left">
              <div className="text-3xl font-bold text-white">15+</div>
              <div className="text-sm text-gray-500">DSA Patterns</div>
            </div>
            <div className="text-center lg:text-left">
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-sm text-gray-500">Practice Problems</div>
            </div>
            <div className="text-center lg:text-left">
              <div className="text-3xl font-bold text-white">SM-2</div>
              <div className="text-sm text-gray-500">Algorithm</div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
          <motion.div
            className="w-1 h-2 bg-white/40 rounded-full"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  )
}
