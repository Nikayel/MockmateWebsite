"use client"

import { motion } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Brain,
  Target,
  Sparkles,
  Clock,
  Award,
  Zap,
  LineChart,
} from "lucide-react"
import Link from "next/link"
import { MagneticButton } from "@/components/ui/magnetic-button"

/**
 * Metrics Marketing Section
 *
 * Highlights the comprehensive performance tracking and analytics features.
 */

const metrics = [
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track your scores across 15+ DSA patterns with detailed breakdowns.",
  },
  {
    icon: Brain,
    title: "Cognitive Profiling",
    description: "Understand your learning style, problem-solving approach, and strengths.",
  },
  {
    icon: TrendingUp,
    title: "Progress Trends",
    description: "Visualize your improvement over time with weekly and monthly trends.",
  },
  {
    icon: Target,
    title: "Interview Readiness",
    description: "Get a real-time score of how ready you are for FAANG interviews.",
  },
]

const trackingFeatures = [
  { label: "Session Duration", value: "Time spent" },
  { label: "Test Pass Rate", value: "Code quality" },
  { label: "Hint Usage", value: "Self-reliance" },
  { label: "AI Collaboration", value: "Tool mastery" },
  { label: "Communication", value: "Explanation skill" },
  { label: "Problem Solving", value: "Approach" },
]

export function MetricsMarketingSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-black to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00d9ff]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00d9ff]/10 border border-[#00d9ff]/20 mb-6">
            <Sparkles className="w-4 h-4 text-[#00d9ff]" />
            <span className="text-sm text-[#00d9ff] font-medium">Performance Analytics</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
            Track Every Detail of Your{" "}
            <span className="bg-gradient-to-r from-[#00d9ff] to-purple-500 bg-clip-text text-transparent">
              Progress
            </span>
          </h2>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Our AI doesn't just interview you—it analyzes your performance across
            40+ metrics to give you actionable insights for improvement.
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#00d9ff]/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#00d9ff]/10 flex items-center justify-center mb-4 group-hover:bg-[#00d9ff]/20 transition-colors">
                <metric.icon className="w-6 h-6 text-[#00d9ff]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{metric.title}</h3>
              <p className="text-sm text-gray-400">{metric.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Feature Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-8 items-center"
        >
          {/* Left: Dashboard Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00d9ff]/20 to-purple-500/20 rounded-3xl blur-xl" />
            <div className="relative p-1 rounded-3xl bg-gradient-to-r from-[#00d9ff]/50 to-purple-500/50">
              <div className="rounded-[22px] bg-gray-900 p-6">
                {/* Mock Dashboard */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00d9ff]/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-[#00d9ff]" />
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">Your Metrics</div>
                      <div className="text-xs text-gray-400">Last 30 days</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-green-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>+12%</span>
                  </div>
                </div>

                {/* Score Circle */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-700"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="url(#gradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 56 * 0.78} ${2 * Math.PI * 56}`}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00d9ff" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-white">78%</span>
                      <span className="text-xs text-gray-400">Ready</span>
                    </div>
                  </div>
                </div>

                {/* Pattern Bars */}
                <div className="space-y-3">
                  {[
                    { name: "Arrays", score: 92 },
                    { name: "Trees", score: 75 },
                    { name: "Graphs", score: 58 },
                  ].map((pattern) => (
                    <div key={pattern.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{pattern.name}</span>
                        <span className="text-white">{pattern.score}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00d9ff] to-purple-500"
                          style={{ width: `${pattern.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Feature List */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">
              40+ Metrics Tracked Per Session
            </h3>
            <p className="text-gray-400 mb-6">
              Every session captures detailed interaction data that feeds into your
              personalized learning profile and AI recommendations.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {trackingFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="w-2 h-2 rounded-full bg-[#00d9ff]" />
                  <div>
                    <div className="text-sm text-white">{feature.label}</div>
                    <div className="text-xs text-gray-400">{feature.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/signup">
              <MagneticButton className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white px-6 py-3 rounded-lg font-medium">
                Start Tracking Your Progress
                <Zap className="w-4 h-4 ml-2 inline-block" />
              </MagneticButton>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default MetricsMarketingSection
