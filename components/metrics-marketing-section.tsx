"use client"

import { motion } from "framer-motion"
import {
  BarChart3,
  TrendingUp,
  Brain,
  Target,
  Sparkles,
  Zap,
  Star,
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
    description:
      "Scores across 15+ DSA patterns show where you slow down, not just what passed.",
    outcome: "Avg +18 pts after 5 sessions",
  },
  {
    icon: Brain,
    title: "Cognitive Profiling",
    description:
      "Detects whether you struggle with problem setup, edge cases, or explanation, then adapts.",
    outcome: "3 learning modes identified",
  },
  {
    icon: TrendingUp,
    title: "Progress Trends",
    description:
      "Week-over-week curves separate real gains from a one-session spike.",
    outcome: "Weekly + monthly view",
  },
  {
    icon: Target,
    title: "Interview Readiness",
    description:
      "A single FAANG-calibrated score updates after every session so you know when you are ready.",
    outcome: "Benchmarked against 10k+ interview outcomes",
    featured: true,
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#c4703f]/5 rounded-full blur-3xl" />
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c4703f]/10 border border-[#c4703f]/20 mb-6">
            <Sparkles className="w-4 h-4 text-[#c4703f]" />
            <span className="text-sm text-[#c4703f] font-medium">Performance Analytics</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
            See exactly where you stand —{" "}
            <span className="bg-gradient-to-r from-[#c4703f] to-purple-500 bg-clip-text text-transparent">
              and why
            </span>
          </h2>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            40+ signals per session become one readiness score, clear benchmarks,
            and the next move for your practice.
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:[grid-template-columns:1fr_1fr_1fr_1.6fr] gap-4 mb-16">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`group rounded-2xl p-6 transition-colors ${
                metric.featured
                  ? "bg-[#1a1428] border-[1.5px] border-[#7c3aed] hover:border-[#8b5cf6]"
                  : "bg-white/5 border-[0.5px] border-white/10 hover:border-[#c4703f]/30"
              }`}
            >
              {metric.featured && (
                <div className="mb-3 inline-flex items-center gap-1 rounded-md bg-[#2d1f52] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#a78bfa]">
                  <Star className="h-3 w-3 fill-[#a78bfa]" />
                  Key differentiator
                </div>
              )}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                  metric.featured
                    ? "bg-[#2d1f52] group-hover:bg-[#35245f]"
                    : "bg-[#c4703f]/10 group-hover:bg-[#c4703f]/20"
                }`}
              >
                <metric.icon
                  className={`w-6 h-6 ${
                    metric.featured ? "text-[#a78bfa]" : "text-[#c4703f]"
                  }`}
                />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{metric.title}</h3>
              <p className="text-sm text-gray-400">{metric.description}</p>
              <div className="mt-4 text-sm font-semibold text-[#a78bfa]">
                {metric.outcome}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Feature Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="grid gap-6 lg:[grid-template-columns:1.2fr_1fr] items-stretch"
        >
          {/* Left: Dashboard Preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#c4703f]/20 to-purple-500/20 rounded-3xl blur-xl" />
            <div className="relative p-1 rounded-3xl bg-gradient-to-r from-[#c4703f]/50 to-purple-500/50">
              <div className="rounded-[22px] bg-gray-900 p-5 sm:p-6">
                {/* Mock Dashboard */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#c4703f]/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-[#c4703f]" />
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
                          <stop offset="0%" stopColor="#c4703f" />
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
                    { name: "Arrays", score: 92, benchmark: 76 },
                    { name: "Trees", score: 75, benchmark: 74 },
                    { name: "Graphs", score: 58, benchmark: 71 },
                  ].map((pattern) => (
                    <div key={pattern.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{pattern.name}</span>
                        <span className="text-white">{pattern.score}%</span>
                      </div>
                      <div className="relative pt-3">
                        <div
                          className="absolute -top-0.5 -translate-x-1/2 text-[8px] font-semibold uppercase text-[#f59e0b]"
                          style={{ left: `${pattern.benchmark}%` }}
                        >
                          FAANG avg
                        </div>
                        <div
                          className="absolute top-2 h-[11px] w-[1.5px] -translate-x-1/2 rounded-full bg-[#f59e0b]"
                          style={{ left: `${pattern.benchmark}%` }}
                        />
                        <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#c4703f] to-purple-500"
                            style={{ width: `${pattern.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Feature List */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="text-2xl font-bold text-white mb-4">
              What gets tracked
            </h3>
            <p className="text-gray-400 mb-6">
              Every session feeds your profile, so recommendations come from
              observed behavior instead of guesses.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {trackingFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="w-2 h-2 rounded-full bg-[#c4703f]" />
                  <div>
                    <div className="text-sm text-white">{feature.label}</div>
                    <div className="text-xs text-gray-400">{feature.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/signup">
              <MagneticButton className="bg-[#c4703f] hover:bg-[#c4703f]/80 text-white px-6 py-3 rounded-lg font-medium">
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
