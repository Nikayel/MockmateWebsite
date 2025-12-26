"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { Brain, Code2, BarChart3, Zap, Play, Mic, Target, Clock } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import Image from "next/image"

/**
 * Features Section - Inspired by Clerk & Voyage AI patterns
 *
 * Design principles:
 * - Lighter gradient background for contrast
 * - Staggered fade-in animations
 * - Cards with subtle hover states
 * - Real value propositions, not generic descriptions
 */

const features = [
  {
    icon: Mic,
    title: "Voice-Enabled AI Interviewer",
    description: "Talk through your approach like a real interview. The AI listens, responds naturally, and asks follow-up questions based on your explanation.",
    highlight: "Just like talking to a real interviewer",
  },
  {
    icon: Code2,
    title: "Real-Time Code Feedback",
    description: "Get instant suggestions as you write. Catch bugs, optimize time complexity, and learn better patterns before you submit.",
    highlight: "Feedback in seconds, not days",
  },
  {
    icon: BarChart3,
    title: "Spaced Repetition System",
    description: "Our algorithm tracks what you've learned and schedules reviews at the optimal time. Retain 90% instead of forgetting 80% within a week.",
    highlight: "Based on proven memory science",
  },
  {
    icon: Target,
    title: "15 DSA Pattern Tracking",
    description: "Stop random grinding. We track your proficiency across sliding window, two pointers, BFS/DFS, dynamic programming, and 11 more patterns.",
    highlight: "Know exactly where to focus",
  },
  {
    icon: Clock,
    title: "Available 24/7",
    description: "Practice at 2am before your interview or during lunch break. No scheduling, no waiting for a human partner, no awkward timezone coordination.",
    highlight: "Practice on your schedule",
  },
  {
    icon: Brain,
    title: "Personalized Difficulty",
    description: "Start where you are. The AI adapts to your level, gradually increasing difficulty as you improve. No more being stuck on problems way above your level.",
    highlight: "Meets you where you are",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
      {/* Gradient background - lighter than rest of site */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-slate-900/50 to-slate-800/30" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          className="max-w-2xl mx-auto text-center mb-16 md:mb-20"
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
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Practice with an AI that understands code, gives real feedback, and helps you improve faster than grinding alone.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative"
            >
              <div className="relative h-full p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm transition-all duration-300 hover:bg-slate-800/60 hover:border-slate-600/50 hover:-translate-y-1">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-neural/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-3">
                  {feature.description}
                </p>

                {/* Highlight badge */}
                <span className="inline-block text-xs text-neural/80 font-medium">
                  {feature.highlight}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Demo Section */}
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-accent/10 to-neural/10 rounded-3xl blur-2xl" />

            <div className="relative bg-slate-900/80 rounded-2xl border border-slate-700/50 overflow-hidden backdrop-blur-sm">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-slate-500 font-mono">skillon.dev/interview</span>
                </div>
              </div>

              {/* Screenshot */}
              <div className="relative aspect-video">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/FeedbackSummeryMockup-GFSpAQsPcwjnrAW21qXk63EEXS2Nv4.png"
                  alt="Skillon Feedback Interface"
                  fill
                  className="object-contain p-4"
                />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <p className="text-slate-400 mb-6 text-sm">
              See how our AI provides detailed, actionable feedback after every session
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/interview">
                <MagneticButton
                  size="lg"
                  variant="primary"
                  glowColor="accent"
                  className="group"
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
          </div>
        </motion.div>
      </div>
    </section>
  )
}
