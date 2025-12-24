"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GridBackground } from "@/components/GridBackground"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Badge } from "@/components/ui/badge"
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
  ArrowRight,
  Check,
  X,
  Sparkles,
  Layers,
  RefreshCw,
  Timer,
  BrainCircuit,
  Route,
  ChevronRight,
  Play,
  LineChart,
  Lightbulb,
  GraduationCap,
  Repeat
} from "lucide-react"

// Learning science data with proper research citations
const sciencePrinciples = [
  {
    icon: RefreshCw,
    title: "Spacing Effect",
    improvement: "10-30%",
    description: "Distributed practice beats cramming. Our algorithm spaces your reviews for optimal long-term retention.",
    color: "accent",
    visual: "wave",
    citation: "Cepeda et al., 2006",
    source: "Psychological Bulletin"
  },
  {
    icon: BrainCircuit,
    title: "Testing Effect",
    improvement: "50%",
    description: "Active recall strengthens memory more than passive review. Every practice session is a retrieval opportunity.",
    color: "neural",
    visual: "pulse",
    citation: "Roediger & Karpicke, 2006",
    source: "Psychological Science"
  },
  {
    icon: Layers,
    title: "Interleaving",
    improvement: "43%",
    description: "Mixing different patterns daily improves transfer to new problems. We intelligently vary your practice.",
    color: "purple",
    visual: "layers",
    citation: "Rohrer & Taylor, 2007",
    source: "Instructional Science"
  },
  {
    icon: TrendingUp,
    title: "Forgetting Curve",
    improvement: "Optimal",
    description: "Review at 70-80% retention for maximum efficiency. Our algorithm knows exactly when you're about to forget.",
    color: "amber",
    visual: "curve",
    citation: "Ebbinghaus, 1885",
    source: "Memory: A Contribution to Experimental Psychology"
  }
]

// Notification types
const notificationTypes = [
  { icon: RefreshCw, title: "Spaced Review", example: "Time to review 'Two Sum'" },
  { icon: AlertTriangle, title: "Pattern Decay", example: "Graph skills declining" },
  { icon: Calendar, title: "Daily Reminder", example: "15 min keeps skills sharp" },
  { icon: Flame, title: "Streak Alert", example: "Don't break your 7-day streak!" },
  { icon: Clock, title: "Interview Countdown", example: "5 days left - focus on DP" },
  { icon: Trophy, title: "Milestone", example: "You mastered Binary Search!" },
  { icon: Target, title: "Weak Pattern", example: "Trees need attention" },
  { icon: Route, title: "Roadmap Update", example: "2 days behind schedule" },
  { icon: Timer, title: "Optimal Time", example: "Perfect time to review" },
  { icon: Moon, title: "Rest Reminder", example: "Rest helps consolidation" },
]

// Comparison data
const comparisonFeatures = [
  { feature: "Personalized practice schedule", skillon: true, leetcode: false },
  { feature: "Knows when you'll forget", skillon: true, leetcode: false },
  { feature: "AI-powered review timing", skillon: true, leetcode: false },
  { feature: "Pattern-specific decay tracking", skillon: true, leetcode: false },
  { feature: "Interview countdown optimization", skillon: true, leetcode: false },
  { feature: "Science-backed spaced repetition", skillon: true, leetcode: false },
  { feature: "Smart notification system", skillon: true, leetcode: false },
  { feature: "Large problem database", skillon: true, leetcode: true },
]

export default function WhySkilonPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section - Organic, less boxy */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
        <GridBackground />

        {/* Organic gradient blobs instead of rectangles */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-accent/30 via-accent/10 to-transparent rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-neural/25 via-neural/10 to-transparent rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

        <motion.div
          className="container mx-auto px-4 text-center relative z-10"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div variants={staggerItem}>
              <Badge className="bg-neural/20 text-neural border-neural/30 mb-8 px-4 py-2">
                <Brain className="w-4 h-4 mr-2 inline" />
                Powered by Cognitive Science
              </Badge>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-5xl sm:text-6xl md:text-7xl font-heading font-black mb-8 leading-[1.1] tracking-tight"
            >
              <span className="text-white">Stop Guessing</span>
              <br />
              <span className="text-white">How Much to Practice</span>
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-xl md:text-2xl text-gray-400 mb-6 max-w-2xl mx-auto leading-relaxed"
            >
              Our algorithm calculates <span className="text-accent font-medium">exactly when</span> and{" "}
              <span className="text-neural font-medium">how many times</span> to review each problem—based on your actual performance.
            </motion.p>

            <motion.p
              variants={staggerItem}
              className="text-lg text-gray-500 mb-12 max-w-xl mx-auto"
            >
              No more random grinding. No more forgetting before interviews.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
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

      {/* Problem Statement - Cleaner, less boxy */}
      <section className="py-24 bg-black relative overflow-hidden">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-6">
                The Problem with Traditional Practice
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                Without a system, you <span className="text-red-400 font-medium">forget 80%</span> of what you learn within a week.
                Random problem selection leaves weak patterns untouched.
              </p>
              <p className="text-sm text-gray-600 mt-4 italic">
                Based on Ebbinghaus's forgetting curve research (1885)
              </p>
            </div>
          </ScrollReveal>

          {/* Visual representation - Forgetting curve illustration */}
          <ScrollReveal>
            <div className="max-w-2xl mx-auto">
              <div className="relative p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-gray-800/50">
                {/* Forgetting curve SVG illustration */}
                <svg viewBox="0 0 400 200" className="w-full h-48 mb-4">
                  {/* Grid lines */}
                  <defs>
                    <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00d9ff" />
                      <stop offset="100%" stopColor="#ff3366" />
                    </linearGradient>
                    <linearGradient id="optimalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00ff88" />
                      <stop offset="100%" stopColor="#00ff88" />
                    </linearGradient>
                  </defs>

                  {/* Axis */}
                  <line x1="40" y1="160" x2="380" y2="160" stroke="#333" strokeWidth="1" />
                  <line x1="40" y1="20" x2="40" y2="160" stroke="#333" strokeWidth="1" />

                  {/* Labels */}
                  <text x="210" y="190" fill="#666" fontSize="12" textAnchor="middle">Time</text>
                  <text x="15" y="90" fill="#666" fontSize="12" textAnchor="middle" transform="rotate(-90, 15, 90)">Memory</text>

                  {/* Forgetting curve (without review) */}
                  <path
                    d="M 40 30 Q 100 50, 150 100 T 250 140 T 380 155"
                    stroke="url(#curveGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.7"
                  />

                  {/* Optimal review points */}
                  <circle cx="100" cy="60" r="6" fill="#00ff88" />
                  <circle cx="180" cy="75" r="6" fill="#00ff88" />
                  <circle cx="280" cy="85" r="6" fill="#00ff88" />

                  {/* With spaced repetition curve */}
                  <path
                    d="M 40 30 Q 70 35, 100 50 L 100 35 Q 140 45, 180 60 L 180 45 Q 230 55, 280 65 L 280 50 Q 330 55, 380 60"
                    stroke="url(#optimalGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="8 4"
                  />
                </svg>

                <div className="flex justify-center gap-8 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-accent to-red-400" />
                    <span className="text-gray-400">Without review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-neural" />
                    <span className="text-gray-400">With Skillon</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Science Section - Organic cards with flowing shapes */}
      <section className="py-24 bg-gradient-to-b from-black via-gray-950 to-black relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #00d9ff 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, #00ff88 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-16">
              <Badge className="bg-neural/20 text-neural border-neural/30 mb-6">
                <GraduationCap className="w-4 h-4 mr-2 inline" />
                Research-Backed
              </Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                Built on 40 Years of <span className="text-neural">Cognitive Science</span>
              </h2>
              <p className="text-xl text-gray-400">
                Four proven learning principles, applied to your interview prep.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {sciencePrinciples.map((principle, i) => (
              <ScrollReveal key={principle.title} delay={i * 0.1}>
                <div className="group relative">
                  {/* Organic shape background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 to-gray-900/50 rounded-3xl transform group-hover:scale-[1.02] transition-transform duration-300" />
                  <div className={`absolute -inset-px rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    principle.color === 'accent' ? 'from-accent/20 to-transparent' :
                    principle.color === 'neural' ? 'from-neural/20 to-transparent' :
                    principle.color === 'purple' ? 'from-purple-400/20 to-transparent' :
                    'from-amber-400/20 to-transparent'
                  }`} />

                  <div className="relative p-8 rounded-3xl border border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        principle.color === 'accent' ? 'bg-accent/10' :
                        principle.color === 'neural' ? 'bg-neural/10' :
                        principle.color === 'purple' ? 'bg-purple-400/10' :
                        'bg-amber-400/10'
                      }`}>
                        <principle.icon className={`w-7 h-7 ${
                          principle.color === 'accent' ? 'text-accent' :
                          principle.color === 'neural' ? 'text-neural' :
                          principle.color === 'purple' ? 'text-purple-400' :
                          'text-amber-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className={`text-2xl font-bold mb-1 ${
                          principle.color === 'accent' ? 'text-accent' :
                          principle.color === 'neural' ? 'text-neural' :
                          principle.color === 'purple' ? 'text-purple-400' :
                          'text-amber-400'
                        }`}>{principle.improvement}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Better Retention</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-4 mb-2">{principle.title}</h3>
                    <p className="text-gray-400 leading-relaxed mb-3">{principle.description}</p>
                    <p className="text-xs text-gray-600 italic">
                      {principle.citation} — <span className="text-gray-700">{principle.source}</span>
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* LeetCode Comparison - Clean table, no heavy borders */}
      <section className="py-24 bg-black relative overflow-hidden">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                LeetCode Gives You Problems
                <br />
                <span className="text-accent">We Give You a System</span>
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="max-w-2xl mx-auto">
              {/* Header */}
              <div className="grid grid-cols-[1fr_100px_100px] gap-4 pb-4 border-b border-gray-800 mb-2">
                <div className="text-gray-500 text-sm font-medium">Feature</div>
                <div className="text-center text-accent font-bold">Skillon</div>
                <div className="text-center text-gray-500 font-medium">LeetCode</div>
              </div>

              {/* Rows */}
              {comparisonFeatures.map((row, i) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-[1fr_100px_100px] gap-4 py-4 border-b border-gray-800/30 hover:bg-gray-900/30 transition-colors rounded-lg px-2 -mx-2"
                >
                  <div className="text-gray-300">{row.feature}</div>
                  <div className="text-center">
                    {row.skillon ? (
                      <Check className="w-5 h-5 text-neural mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-700 mx-auto" />
                    )}
                  </div>
                  <div className="text-center">
                    {row.leetcode ? (
                      <Check className="w-5 h-5 text-gray-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-gray-700 mx-auto" />
                    )}
                  </div>
                </div>
              ))}

              <div className="text-center mt-8">
                <Link href="/interview">
                  <MagneticButton variant="primary" glowColor="accent">
                    Start Practicing Smarter <ArrowRight className="w-4 h-4" />
                  </MagneticButton>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Personalized Roadmap Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-950 relative overflow-hidden">
        {/* Organic background elements */}
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] -translate-y-1/2" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <ScrollReveal>
              <div>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-6">
                  <Route className="w-4 h-4 mr-2 inline" />
                  Personalized Roadmaps
                </Badge>
                <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">
                  Your Interview
                  <br />
                  <span className="text-purple-400">Your Timeline</span>
                </h2>
                <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                  Tell us your interview date, target company, and current level.
                  Get a day-by-day plan optimized for your success.
                </p>

                <div className="space-y-4">
                  {[
                    "Customized to your target company's patterns",
                    "Adapts based on your performance",
                    "Prioritizes weak areas automatically",
                    "Accounts for forgetting curve science"
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-purple-400" />
                      </div>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-10">
                  <Link href="/roadmap">
                    <MagneticButton variant="primary" glowColor="neural">
                      Create Your Roadmap <ArrowRight className="w-4 h-4" />
                    </MagneticButton>
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              {/* Roadmap Preview - Organic design */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/10 via-transparent to-accent/10 rounded-[2rem] blur-xl" />
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-900/80 rounded-2xl border border-gray-800/50 p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Your Roadmap</div>
                      <div className="text-lg font-bold text-white">Google L4 Interview</div>
                    </div>
                    <Badge className="bg-neural/20 text-neural border-neural/30">28 days</Badge>
                  </div>

                  <div className="space-y-3">
                    {[
                      { week: "Week 1", focus: "Arrays & Hashing", progress: 100, status: "complete" },
                      { week: "Week 2", focus: "Two Pointers & Sliding Window", progress: 75, status: "current" },
                      { week: "Week 3", focus: "Trees & Graphs", progress: 0, status: "upcoming" },
                      { week: "Week 4", focus: "Dynamic Programming", progress: 0, status: "upcoming" },
                    ].map((week) => (
                      <div
                        key={week.week}
                        className={`p-4 rounded-xl transition-all ${
                          week.status === 'current'
                            ? 'bg-accent/10 border border-accent/30'
                            : week.status === 'complete'
                            ? 'bg-neural/5 border border-neural/20'
                            : 'bg-gray-800/30 border border-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${week.status === 'current' ? 'text-accent' : 'text-gray-400'}`}>
                            {week.week}
                          </span>
                          {week.status === 'complete' && <Check className="w-4 h-4 text-neural" />}
                          {week.status === 'current' && <span className="text-xs text-accent">In Progress</span>}
                        </div>
                        <div className="text-white font-medium mb-2">{week.focus}</div>
                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${week.status === 'complete' ? 'bg-neural' : 'bg-accent'}`}
                            style={{ width: `${week.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Notification Types - Compact, flowing layout */}
      <section className="py-24 bg-black relative overflow-hidden">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-12">
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-6">
                <Bell className="w-4 h-4 mr-2 inline" />
                Smart Notifications
              </Badge>
              <h2 className="text-4xl font-heading font-bold text-white mb-4">
                10 Types of <span className="text-amber-400">Intelligent Alerts</span>
              </h2>
              <p className="text-gray-400">
                Never miss the optimal moment to practice.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {notificationTypes.map((notification, i) => (
                <div
                  key={notification.title}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900/60 border border-gray-800/50 hover:border-amber-500/30 hover:bg-gray-900/80 transition-all cursor-default"
                >
                  <notification.icon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm text-gray-300">{notification.title}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* How It Works - Clean 3-step */}
      <section className="py-24 bg-gradient-to-b from-gray-950 to-black relative overflow-hidden">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-heading font-bold text-white mb-4">
                3 Steps to <span className="text-accent">Interview Success</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute top-24 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent hidden md:block" />

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    step: "01",
                    title: "Create Your Roadmap",
                    description: "Enter your interview date and target company. Our AI generates your personalized study plan.",
                    icon: Route
                  },
                  {
                    step: "02",
                    title: "Practice Smart",
                    description: "Follow daily recommendations. We track your performance and optimize review timing.",
                    icon: Brain
                  },
                  {
                    step: "03",
                    title: "Ace Your Interview",
                    description: "Arrive confident with patterns deeply embedded in long-term memory.",
                    icon: Trophy
                  }
                ].map((item, i) => (
                  <ScrollReveal key={item.step} delay={i * 0.15}>
                    <div className="relative text-center">
                      <div className="relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 border border-accent/20">
                          <item.icon className="w-8 h-8 text-accent" />
                        </div>
                        <div className="text-4xl font-bold text-accent/20 mb-2">{item.step}</div>
                        <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                        <p className="text-gray-400 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research References Section */}
      <section className="py-16 bg-gray-950/50 border-t border-gray-800/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6 text-center">
              Scientific References
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-600">
              <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
                <p className="font-medium text-gray-500 mb-1">Spacing Effect</p>
                <p>Cepeda, N.J., et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. <span className="italic">Psychological Bulletin, 132</span>(3), 354-380.</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
                <p className="font-medium text-gray-500 mb-1">Testing Effect</p>
                <p>Roediger, H.L., & Karpicke, J.D. (2006). Test-enhanced learning. <span className="italic">Psychological Science, 17</span>(3), 249-255.</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
                <p className="font-medium text-gray-500 mb-1">Interleaving</p>
                <p>Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. <span className="italic">Instructional Science, 35</span>(6), 481-498.</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
                <p className="font-medium text-gray-500 mb-1">Forgetting Curve</p>
                <p>Ebbinghaus, H. (1885). <span className="italic">Memory: A Contribution to Experimental Psychology.</span> Teachers College, Columbia University.</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
                <p className="font-medium text-gray-500 mb-1">Sleep Consolidation</p>
                <p>Walker, M.P. (2017). <span className="italic">Why We Sleep: Unlocking the Power of Sleep and Dreams.</span> Scribner.</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800/30">
                <p className="font-medium text-gray-500 mb-1">SM-2 Algorithm</p>
                <p>Wozniak, P.A., & Gorzelanczyk, E.J. (1994). Optimization of repetition spacing in the practice of learning. <span className="italic">Acta Neurobiologiae Experimentalis, 54</span>, 59-62.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 bg-black relative overflow-hidden">
        {/* Organic gradient background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-accent/10 via-neural/10 to-accent/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
                Ready to Practice <span className="text-accent">Smarter</span>?
              </h2>
              <p className="text-xl text-gray-400 mb-12 max-w-xl mx-auto">
                Join the future of interview prep with science-backed learning.
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
