"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BriefcaseBusiness,
  Bug,
  Lock,
  Network,
  Puzzle,
  Workflow,
  ChevronRight,
  CheckCircle2,
  Brain,
  Code2,
  Target,
  TrendingUp,
  MessageSquare,
  Trophy,
} from "lucide-react"
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline"

const interviewTypes = [
  {
    title: "DSA Patterns",
    description:
      "Master 15 core algorithmic patterns. From Sliding Windows to Advanced Graphs, learn to recognize patterns rather than memorizing problems.",
    icon: Workflow,
    glowColor: "rgba(56, 189, 248, 0.4)", // Sky
    textColor: "text-sky-400",
    features: [
      "Pattern recognition practice",
      "Time & space complexity analysis",
      "Progressive optimal approach hints",
    ],
  },
  {
    title: "System Design",
    description:
      "Architect scalable backend systems. Discuss tradeoffs, bottlenecks, and data modeling just like you would with a Senior Engineer.",
    icon: Network,
    glowColor: "rgba(167, 139, 250, 0.4)", // Violet
    textColor: "text-violet-400",
    features: [
      "High-level architecture design",
      "Database schema & sharding tradeoffs",
      "API design and rate limiting",
    ],
  },
  {
    title: "Bug Fix",
    description:
      "Debug real, complex codebases. Navigate files, find the performance bottlenecks, and ship a production-ready fix.",
    icon: Bug,
    glowColor: "rgba(244, 63, 94, 0.4)", // Rose
    textColor: "text-rose-400",
    features: [
      "Multi-file codebase environments",
      "Failing unit test resolution",
      "Root cause analysis discussion",
    ],
  },
  {
    title: "Add Functionality",
    description:
      "Test your ability to read and extend an existing system. Build new features on top of a pre-existing architecture without breaking it.",
    icon: Puzzle,
    glowColor: "rgba(251, 146, 60, 0.4)", // Orange
    textColor: "text-orange-400",
    features: [
      "Legacy code comprehension",
      "Refactoring and code organization",
      "Extensibility best practices",
    ],
  },
  {
    title: "Real-World Rounds",
    description:
      "End-to-end 60-minute sessions that exactly mirror the intense interview loops at FAANG companies.",
    icon: BriefcaseBusiness,
    glowColor: "rgba(163, 230, 53, 0.4)", // Lime
    textColor: "text-lime-400",
    features: [
      "Strict time constraints",
      "Ambiguous requirements",
      "Comprehensive scoring rubrics",
    ],
  },
  {
    title: "Security",
    description:
      "Assess code quality and safety. Identify critical vulnerabilities, prevent injections, and harden the system against attacks.",
    icon: Lock,
    glowColor: "rgba(250, 204, 21, 0.4)", // Yellow
    textColor: "text-yellow-400",
    features: ["OWASP top 10 vulnerabilities", "Authentication flaws", "Secure data handling"],
  },
]

const practiceJourneyData = [
  {
    id: 1,
    title: "Learn Patterns",
    date: "Week 1",
    content: "Build intuition for the 15 core algorithmic patterns used in every FAANG interview.",
    category: "Foundation",
    icon: Brain,
    relatedIds: [2, 3],
    status: "completed" as const,
    energy: 95,
  },
  {
    id: 2,
    title: "Code Live",
    date: "Week 2",
    content:
      "Write real solutions under time pressure with an AI interviewer watching your approach.",
    category: "Practice",
    icon: Code2,
    relatedIds: [1, 3],
    status: "completed" as const,
    energy: 80,
  },
  {
    id: 3,
    title: "Get Feedback",
    date: "Week 2",
    content: "Receive detailed rubric-based scoring on communication, correctness, and efficiency.",
    category: "Feedback",
    icon: MessageSquare,
    relatedIds: [2, 4],
    status: "in-progress" as const,
    energy: 70,
  },
  {
    id: 4,
    title: "Track Gaps",
    date: "Week 3",
    content:
      "Spaced repetition surfaces your weakest patterns so you review exactly what you need.",
    category: "Analytics",
    icon: TrendingUp,
    relatedIds: [3, 5],
    status: "in-progress" as const,
    energy: 55,
  },
  {
    id: 5,
    title: "Mock Rounds",
    date: "Week 4",
    content: "Run full 60-minute FAANG-style loops across DSA, System Design, and Bug Fix rounds.",
    category: "Simulation",
    icon: Target,
    relatedIds: [4, 6],
    status: "pending" as const,
    energy: 40,
  },
  {
    id: 6,
    title: "Ship the Offer",
    date: "Week 5+",
    content: "Walk into your real interview having already lived it. Confidence compounds.",
    category: "Goal",
    icon: Trophy,
    relatedIds: [5, 1],
    status: "pending" as const,
    energy: 20,
  },
]

export function FeaturesSection() {
  const [activeIndex, setActiveIndex] = useState(0)

  const activeType = interviewTypes[activeIndex]
  const ActiveIcon = activeType.icon

  return (
    <section
      id="features"
      className="bg-background relative flex items-center overflow-hidden px-4 py-12 font-[var(--font-geist)] sm:px-6 sm:py-16 lg:px-12 lg:py-20 xl:px-16"
    >
      {/* Dynamic Background Noise / Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(196,112,63,0.05),transparent_60%)]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        {/* Header */}
        <motion.div
          className="mb-10 text-center sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="border-border bg-muted mb-4 inline-flex items-center rounded-full border px-3 py-1 shadow-sm backdrop-blur-md">
            <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              The practice system
            </span>
          </div>
          <h2 className="font-heading text-foreground text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-bold tracking-[-0.04em]">
            Every format. One feedback loop.
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-[clamp(0.9rem,1.4vw,1.05rem)] leading-relaxed font-medium">
            From raw algorithm optimization to full FAANG loops — click any node to explore the
            journey, then drill into each format below.
          </p>
        </motion.div>

        {/* Orbital Journey */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <RadialOrbitalTimeline timelineData={practiceJourneyData} />
        </motion.div>

        {/* Interactive Showcase Split Layout */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
          {/* Left Column: Selector */}
          <div className="flex flex-col gap-2 lg:w-[45%]">
            {interviewTypes.map((type, index) => {
              const Icon = type.icon
              const isActive = index === activeIndex

              return (
                <button
                  key={type.title}
                  onClick={() => setActiveIndex(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`group relative flex items-center justify-between rounded-2xl px-5 py-4 text-left transition-all duration-300 ${
                    isActive ? "bg-muted shadow-sm" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-inner transition-colors duration-300 ${isActive ? type.textColor + " border-border bg-muted border" : "bg-muted/40 text-muted-foreground group-hover:text-muted-foreground border border-transparent"}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3
                        className={`text-lg font-semibold tracking-tight transition-colors duration-300 ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                      >
                        {type.title}
                      </h3>
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="text-foreground/50 flex items-center justify-center"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </motion.div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Right Column: Stage */}
          <div className="border-border bg-card relative flex min-h-[360px] w-full items-center overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-2xl lg:w-[55%]">
            {/* Dynamic Background Glow mapped to active item */}
            <div
              className="absolute inset-0 opacity-20 transition-all duration-700 ease-in-out"
              style={{
                background: `radial-gradient(circle at 70% 30%, ${activeType.glowColor}, transparent 60%)`,
              }}
            />
            <div
              className="absolute inset-0 opacity-10 mix-blend-screen transition-all duration-700 ease-in-out"
              style={{
                background: `radial-gradient(circle at 30% 70%, ${activeType.glowColor}, transparent 60%)`,
              }}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -15, filter: "blur(8px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative flex h-full w-full flex-col justify-center p-6 sm:p-10 lg:p-12"
              >
                <div
                  className={`border-border bg-muted mb-8 inline-flex h-16 w-16 items-center justify-center rounded-[18px] border shadow-inner ${activeType.textColor}`}
                >
                  <ActiveIcon
                    className="h-8 w-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    strokeWidth={2}
                  />
                </div>

                <h3 className="font-heading text-foreground mb-3 text-2xl font-bold tracking-tight drop-shadow-sm sm:text-3xl">
                  {activeType.title}
                </h3>

                <p className="text-muted-foreground text-base leading-relaxed font-medium sm:text-lg">
                  {activeType.description}
                </p>

                <ul className="mt-8 space-y-4">
                  {activeType.features.map((feature, i) => (
                    <li key={i} className="text-muted-foreground flex items-center gap-3">
                      <CheckCircle2
                        className={`h-5 w-5 flex-shrink-0 ${activeType.textColor} opacity-80`}
                      />
                      <span className="text-sm font-medium sm:text-base">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
