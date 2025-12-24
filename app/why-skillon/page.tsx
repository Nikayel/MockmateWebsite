"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GridBackground } from "@/components/GridBackground"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { staggerContainer, staggerItem, ScrollReveal } from "@/lib/motion"
import Link from "next/link"
import {
  Brain,
  Target,
  TrendingUp,
  Zap,
  Bell,
  Calendar,
  Flame,
  Trophy,
  Clock,
  Moon,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  Check,
  X,
  Sparkles,
  GitBranch,
  Layers,
  RefreshCw,
  Timer,
  BrainCircuit,
  Route,
  ChevronRight,
  Play
} from "lucide-react"

// Learning science data
const sciencePrinciples = [
  {
    icon: RefreshCw,
    title: "Spacing Effect",
    improvement: "10-30%",
    description: "Distributed practice beats cramming. Our algorithm spaces your reviews for optimal long-term retention.",
    color: "accent"
  },
  {
    icon: BrainCircuit,
    title: "Testing Effect",
    improvement: "50%",
    description: "Active recall strengthens memory more than passive review. Every practice session is a retrieval opportunity.",
    color: "neural"
  },
  {
    icon: Layers,
    title: "Interleaving",
    improvement: "43%",
    description: "Mixing different patterns daily improves transfer to new problems. We intelligently vary your practice.",
    color: "purple"
  },
  {
    icon: TrendingUp,
    title: "Forgetting Curve",
    improvement: "Optimal",
    description: "Review at 70-80% retention for maximum efficiency. Our algorithm knows exactly when you're about to forget.",
    color: "amber"
  }
]

// Notification types
const notificationTypes = [
  {
    icon: RefreshCw,
    title: "Spaced Repetition Review",
    example: "Time to review 'Two Sum' - you solved this 3 days ago",
    color: "accent"
  },
  {
    icon: AlertTriangle,
    title: "Pattern Decay Alert",
    example: "Your Graph proficiency is declining - quick refresher?",
    color: "amber"
  },
  {
    icon: Calendar,
    title: "Daily Practice Reminder",
    example: "15 minutes of practice keeps skills sharp",
    color: "neural"
  },
  {
    icon: Flame,
    title: "Streak Maintenance",
    example: "Don't break your 7-day streak!",
    color: "orange"
  },
  {
    icon: Clock,
    title: "Interview Countdown",
    example: "5 days until your Google interview - focus on DP",
    color: "red"
  },
  {
    icon: Trophy,
    title: "Milestone Celebration",
    example: "You've mastered Binary Search! 🎉",
    color: "yellow"
  },
  {
    icon: Target,
    title: "Weak Pattern Focus",
    example: "Trees need attention - 3 problems recommended",
    color: "purple"
  },
  {
    icon: Route,
    title: "Roadmap Progress",
    example: "You're 2 days behind schedule - let's catch up",
    color: "blue"
  },
  {
    icon: Timer,
    title: "Optimal Review Time",
    example: "Perfect time to review Sliding Window (forgetting soon)",
    color: "cyan"
  },
  {
    icon: Moon,
    title: "Rest Reminder",
    example: "You've practiced 2 hours today - rest helps consolidation",
    color: "indigo"
  }
]

// Comparison data
const comparisonFeatures = [
  { feature: "Personalized practice schedule", skillon: true, leetcode: false },
  { feature: "Knows when you'll forget", skillon: true, leetcode: false },
  { feature: "AI-powered review timing", skillon: true, leetcode: false },
  { feature: "Pattern-specific decay tracking", skillon: true, leetcode: false },
  { feature: "Interview countdown optimization", skillon: true, leetcode: false },
  { feature: "Science-backed spaced repetition", skillon: true, leetcode: false },
  { feature: "Adaptive difficulty adjustment", skillon: true, leetcode: false },
  { feature: "Smart notification system", skillon: true, leetcode: false },
  { feature: "Large problem database", skillon: true, leetcode: true },
  { feature: "Community discussions", skillon: true, leetcode: true },
]

export default function WhySkilonPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <GridBackground />

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neural/20 rounded-full blur-[128px] animate-pulse delay-1000" />

        <motion.div
          className="container mx-auto px-4 text-center relative z-10"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <div className="max-w-5xl mx-auto">
            <motion.div variants={staggerItem}>
              <Badge className="bg-neural/20 text-neural border-neural/30 mb-6 px-4 py-2">
                <Brain className="w-4 h-4 mr-2 inline" />
                Powered by Learning Science
              </Badge>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-heading font-black mb-6 leading-[1.1] tracking-tight"
            >
              <span className="text-white">Stop Guessing.</span>
              <br />
              <span className="text-glow bg-gradient-to-r from-accent via-neural to-accent bg-clip-text text-transparent">
                Start Knowing.
              </span>
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-xl md:text-2xl text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              Our algorithm calculates <span className="text-accent font-semibold">exactly when</span> and{" "}
              <span className="text-neural font-semibold">how many times</span> to practice each problem
              based on your performance.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            >
              <Link href="/roadmap">
                <MagneticButton size="lg" variant="primary" glowColor="accent">
                  <Route className="w-5 h-5" />
                  Create Your Roadmap
                  <ArrowRight className="w-5 h-5" />
                </MagneticButton>
              </Link>
              <Link href="/interview">
                <MagneticButton size="lg" variant="outline" glowColor="none">
                  <Play className="w-5 h-5" />
                  Try Free Practice
                </MagneticButton>
              </Link>
            </motion.div>

            {/* Key stats */}
            <motion.div
              variants={staggerItem}
              className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
            >
              {[
                { value: "2.3x", label: "Faster Learning" },
                { value: "89%", label: "Retention Rate" },
                { value: "10+", label: "Smart Notifications" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-accent mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronRight className="w-6 h-6 text-gray-600 rotate-90" />
        </motion.div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-24 bg-black relative overflow-hidden border-t border-gray-900">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 mb-6">The Problem</Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                Most People Practice <span className="text-red-400">Wrong</span>
              </h2>
              <p className="text-xl text-gray-400">
                Random grinding wastes time. Without a system, you forget 80% of what you learn within a week.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                problem: "No idea when to review",
                result: "Forget problems before interviews",
                icon: Clock
              },
              {
                problem: "Random problem selection",
                result: "Weak patterns stay weak",
                icon: Target
              },
              {
                problem: "No performance tracking",
                result: "Can't measure real progress",
                icon: BarChart3
              }
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <Card className="bg-gray-900/50 border-red-500/20 hover:border-red-500/40 transition-colors">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{item.problem}</h3>
                    <p className="text-gray-500 text-sm">{item.result}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Science Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-950 relative overflow-hidden">
        <GridBackground />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge className="bg-neural/20 text-neural border-neural/30 mb-6">
                <Sparkles className="w-4 h-4 mr-2 inline" />
                Learning Science
              </Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                Built on <span className="text-neural">Proven Research</span>
              </h2>
              <p className="text-xl text-gray-400">
                Four decades of cognitive science research, applied to your interview prep.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {sciencePrinciples.map((principle, i) => (
              <ScrollReveal key={principle.title} delay={i * 0.1}>
                <Card className="bg-gray-900/50 border-gray-800 hover:border-accent/30 transition-all h-full group">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-${principle.color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <principle.icon className={`w-6 h-6 text-${principle.color === 'accent' ? 'accent' : principle.color === 'neural' ? 'neural' : principle.color === 'purple' ? 'purple-400' : 'amber-400'}`} />
                    </div>
                    <div className="text-2xl font-bold text-accent mb-1">{principle.improvement}</div>
                    <div className="text-xs text-gray-500 mb-3">Better Retention</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{principle.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{principle.description}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* LeetCode Comparison Section */}
      <section className="py-24 bg-black relative overflow-hidden border-t border-gray-900">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge className="bg-accent/20 text-accent border-accent/30 mb-6">Comparison</Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                Skillon vs <span className="text-gray-500">LeetCode</span>
              </h2>
              <p className="text-xl text-gray-400">
                LeetCode gives you problems. We give you a <span className="text-accent">system</span>.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-800 bg-gray-900/80">
                  <div className="text-gray-400 font-medium">Feature</div>
                  <div className="text-center">
                    <span className="text-accent font-bold">Skillon</span>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-500 font-medium">LeetCode</span>
                  </div>
                </div>

                {/* Rows */}
                {comparisonFeatures.map((row, i) => (
                  <div
                    key={row.feature}
                    className={`grid grid-cols-3 gap-4 p-4 ${i !== comparisonFeatures.length - 1 ? 'border-b border-gray-800/50' : ''} hover:bg-gray-800/30 transition-colors`}
                  >
                    <div className="text-gray-300 text-sm">{row.feature}</div>
                    <div className="text-center">
                      {row.skillon ? (
                        <Check className="w-5 h-5 text-neural mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 mx-auto" />
                      )}
                    </div>
                    <div className="text-center">
                      {row.leetcode ? (
                        <Check className="w-5 h-5 text-gray-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 mx-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="text-center mt-8">
                <p className="text-gray-500 mb-4">Ready to practice smarter, not harder?</p>
                <Link href="/interview">
                  <MagneticButton variant="primary" glowColor="accent">
                    Start Free <ArrowRight className="w-4 h-4" />
                  </MagneticButton>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Personalized Roadmap Section */}
      <section className="py-24 bg-gradient-to-b from-gray-950 to-black relative overflow-hidden">
        <GridBackground />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <ScrollReveal>
              <div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-6">
                  <Route className="w-4 h-4 mr-2 inline" />
                  Personalized Roadmaps
                </Badge>
                <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                  Your Interview, <br />
                  <span className="text-purple-400">Your Timeline</span>
                </h2>
                <p className="text-xl text-gray-400 mb-8">
                  Tell us your interview date, target company, and current level.
                  We'll create a day-by-day plan optimized for your success.
                </p>

                <div className="space-y-4">
                  {[
                    "Customized to your target company's patterns",
                    "Adapts based on your performance",
                    "Prioritizes weak areas automatically",
                    "Accounts for forgetting curve science"
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <Link href="/roadmap">
                    <MagneticButton variant="primary" glowColor="neural">
                      Create Your Roadmap <ArrowRight className="w-4 h-4" />
                    </MagneticButton>
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              {/* Roadmap Preview Card */}
              <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-sm text-gray-500">Your Roadmap</div>
                    <div className="text-xl font-bold text-white">Google L4 Interview</div>
                  </div>
                  <Badge className="bg-neural/20 text-neural border-neural/30">28 days</Badge>
                </div>

                {/* Timeline preview */}
                <div className="space-y-3">
                  {[
                    { week: "Week 1", focus: "Arrays & Hashing", progress: 100, status: "complete" },
                    { week: "Week 2", focus: "Two Pointers & Sliding Window", progress: 75, status: "current" },
                    { week: "Week 3", focus: "Trees & Graphs", progress: 0, status: "upcoming" },
                    { week: "Week 4", focus: "Dynamic Programming", progress: 0, status: "upcoming" },
                  ].map((week) => (
                    <div
                      key={week.week}
                      className={`p-4 rounded-xl border ${
                        week.status === 'current'
                          ? 'border-accent/50 bg-accent/10'
                          : week.status === 'complete'
                          ? 'border-neural/30 bg-neural/5'
                          : 'border-gray-800 bg-gray-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${week.status === 'current' ? 'text-accent' : 'text-gray-400'}`}>
                          {week.week}
                        </span>
                        {week.status === 'complete' && (
                          <Check className="w-4 h-4 text-neural" />
                        )}
                        {week.status === 'current' && (
                          <span className="text-xs text-accent">In Progress</span>
                        )}
                      </div>
                      <div className="text-white font-medium mb-2">{week.focus}</div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            week.status === 'complete' ? 'bg-neural' : 'bg-accent'
                          }`}
                          style={{ width: `${week.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Notification Types Section */}
      <section className="py-24 bg-black relative overflow-hidden border-t border-gray-900">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-6">
                <Bell className="w-4 h-4 mr-2 inline" />
                Smart Notifications
              </Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                10 Types of <span className="text-amber-400">Intelligent Alerts</span>
              </h2>
              <p className="text-xl text-gray-400">
                Never miss the optimal moment to practice. Our system knows when you need to review.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
            {notificationTypes.map((notification, i) => (
              <ScrollReveal key={notification.title} delay={i * 0.05}>
                <Card className="bg-gray-900/50 border-gray-800 hover:border-accent/30 transition-all h-full group">
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <notification.icon className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-2">{notification.title}</h3>
                    <p className="text-xs text-gray-500 italic">"{notification.example}"</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-950 relative overflow-hidden">
        <GridBackground />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge className="bg-accent/20 text-accent border-accent/30 mb-6">How It Works</Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                3 Steps to <span className="text-accent">Interview Success</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Create Your Roadmap",
                description: "Enter your interview date, target company, and current skill level. Our AI generates a personalized study plan.",
                icon: Route
              },
              {
                step: "02",
                title: "Practice Smart",
                description: "Follow your daily recommendations. Our algorithm tracks your performance and optimizes review timing.",
                icon: Brain
              },
              {
                step: "03",
                title: "Ace Your Interview",
                description: "Arrive confident with patterns deeply embedded in long-term memory. No last-minute cramming needed.",
                icon: Trophy
              }
            ].map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 0.15}>
                <div className="relative">
                  {/* Connector line */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-accent/50 to-transparent z-0" />
                  )}

                  <Card className="bg-gray-900/50 border-gray-800 hover:border-accent/30 transition-all relative z-10">
                    <CardContent className="p-8 text-center">
                      <div className="text-5xl font-bold text-accent/20 mb-4">{item.step}</div>
                      <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
                        <item.icon className="w-8 h-8 text-accent" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </CardContent>
                  </Card>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats Section */}
      <section className="py-24 bg-black relative overflow-hidden border-t border-gray-900">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-4 gap-8 text-center">
                {[
                  { value: "10,000+", label: "Problems Practiced", icon: Target },
                  { value: "95%", label: "User Satisfaction", icon: Trophy },
                  { value: "2.3x", label: "Faster Prep Time", icon: Zap },
                  { value: "89%", label: "Retention Rate", icon: Brain },
                ].map((stat) => (
                  <div key={stat.label} className="p-6">
                    <stat.icon className="w-8 h-8 text-accent mx-auto mb-4" />
                    <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
                    <div className="text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 bg-gradient-to-b from-gray-950 to-black relative overflow-hidden">
        <GridBackground />

        {/* Gradient orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[128px]" />

        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
                Ready to Practice <span className="text-accent">Smarter</span>?
              </h2>
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                Join thousands of engineers who've transformed their interview prep with science-backed learning.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Link href="/roadmap">
                  <MagneticButton size="lg" variant="primary" glowColor="accent">
                    <Route className="w-5 h-5" />
                    Create Free Roadmap
                    <ArrowRight className="w-5 h-5" />
                  </MagneticButton>
                </Link>
                <Link href="/pricing">
                  <MagneticButton size="lg" variant="outline" glowColor="none">
                    View Pricing
                  </MagneticButton>
                </Link>
              </div>

              <p className="text-sm text-gray-600">
                No credit card required. Start practicing in 30 seconds.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  )
}
