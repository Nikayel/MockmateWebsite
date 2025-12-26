"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { Brain, Code2, BarChart3, Play, Mic, Target, Clock, Sparkles } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"

/**
 * Features Section - Bento Grid Layout
 * Inspired by Apple, Linear, and modern SaaS designs
 *
 * Key principles:
 * - Varied card sizes create visual hierarchy
 * - Large cards for hero features, small for supporting
 * - Subtle animations on scroll
 * - Light glassmorphic aesthetic
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900" />

      {/* Soft glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-neural/8 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          className="max-w-2xl mx-auto text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-4 leading-tight">
            Everything you need to
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-accent to-neural">
              ace your interview
            </span>
          </h2>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Practice with an AI that understands code and helps you improve faster than grinding alone.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Hero Feature - AI Interviewer (spans 2 cols) */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 group"
          >
            <div className="relative h-full p-8 rounded-3xl bg-gradient-to-br from-accent/10 to-transparent border border-white/10 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-accent/30">
              {/* Background pattern */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-xs text-accent font-medium uppercase tracking-wider">Voice-Enabled</span>
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  AI Interviewer
                </h3>
                <p className="text-white/60 text-base max-w-md mb-6">
                  Talk through your approach like a real interview. The AI listens, responds naturally, and asks follow-up questions based on your explanation.
                </p>

                {/* Mini demo */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 max-w-sm">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center animate-pulse">
                    <Mic className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm text-white/70">"I'm thinking a hashmap here for O(1) lookup..."</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Real-Time Feedback */}
          <motion.div variants={itemVariants} className="group">
            <div className="relative h-full p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-500 hover:bg-white/8 hover:border-white/20">
              <div className="w-10 h-10 rounded-xl bg-neural/20 flex items-center justify-center mb-4">
                <Code2 className="w-5 h-5 text-neural" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-Time Feedback</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Get instant suggestions as you write. Catch bugs and optimize complexity before you submit.
              </p>
            </div>
          </motion.div>

          {/* Spaced Repetition */}
          <motion.div variants={itemVariants} className="group">
            <div className="relative h-full p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-500 hover:bg-white/8 hover:border-white/20">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Spaced Repetition</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Our algorithm schedules reviews at optimal times. Retain 90% instead of forgetting 80%.
              </p>
            </div>
          </motion.div>

          {/* Pattern Mastery (spans 2 cols on lg) */}
          <motion.div variants={itemVariants} className="lg:col-span-2 group">
            <div className="relative h-full p-6 rounded-3xl bg-gradient-to-br from-neural/10 to-transparent border border-white/10 backdrop-blur-sm transition-all duration-500 hover:border-neural/30">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="w-10 h-10 rounded-xl bg-neural/20 flex items-center justify-center mb-4">
                    <Target className="w-5 h-5 text-neural" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">15 DSA Pattern Tracking</h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    Stop random grinding. Track proficiency across sliding window, two pointers, BFS/DFS, dynamic programming, and more.
                  </p>
                </div>

                {/* Pattern pills */}
                <div className="flex flex-wrap gap-2 md:max-w-[200px]">
                  {["Two Pointers", "Sliding Window", "BFS/DFS", "DP", "Backtracking", "Graphs"].map((pattern) => (
                    <span key={pattern} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* 24/7 Available */}
          <motion.div variants={itemVariants} className="group">
            <div className="relative h-full p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-500 hover:bg-white/8 hover:border-white/20">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Available 24/7</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Practice anytime. No scheduling, no waiting for a partner, no timezone hassles.
              </p>
            </div>
          </motion.div>

          {/* AI-Enabled Interview Prep - NEW */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-3 group">
            <div className="relative p-6 rounded-3xl bg-gradient-to-r from-purple-500/10 via-accent/5 to-neural/10 border border-white/10 backdrop-blur-sm transition-all duration-500 hover:border-purple-500/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white">Ready for AI-Enabled Interviews</h3>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-medium uppercase">New</span>
                    </div>
                    <p className="text-white/50 text-sm">
                      Companies like Meta are testing AI-assisted interview formats. Practice with tools, just like the real thing.
                    </p>
                  </div>
                </div>
                <Link href="/why-skillon" className="text-sm text-purple-300 hover:text-purple-200 transition-colors whitespace-nowrap">
                  Learn more →
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/interview">
              <MagneticButton
                size="lg"
                variant="primary"
                glowColor="accent"
              >
                <Play className="w-5 h-5" />
                Try It Free
              </MagneticButton>
            </Link>
            <Link href="/samples">
              <MagneticButton
                size="lg"
                variant="outline"
                glowColor="none"
              >
                View Sample Reports
              </MagneticButton>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
