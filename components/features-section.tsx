"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import {
  Play,
  Mic,
  Code2,
  Wrench,
  Layers,
  Shield,
  Zap,
  Bot,
  Clock,
  Building2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

/**
 * Features Section - Clean two-column layout
 * Left: Sticky intro, Right: Scrolling features
 * Based on actual platform capabilities from codebase research
 */

const interviewTypes = [
  { name: "DSA", description: "15 patterns from arrays to graphs", icon: Code2 },
  { name: "System Design", description: "Architecture & scalability", icon: Layers },
  { name: "Bug Fix", description: "Debug real codebases", icon: Wrench },
  { name: "Add Functionality", description: "Build on existing code", icon: Zap },
  { name: "Real-World", description: "60-min company rounds", icon: Building2 },
  { name: "Security", description: "Code quality & safety", icon: Shield },
]

const features = [
  {
    id: "ai-collaboration",
    label: "AI Collaboration",
    title: "Use AI during interviews. Never penalized.",
    description:
      "Like Meta's new interview format—ask your AI partner for debugging help, architecture feedback, or implementation suggestions. We grade you on understanding, not whether you used AI.",
    highlight: "Available in System Design, Bug Fix & Add Functionality",
    visual: (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="bg-accent/20 flex h-10 w-10 items-center justify-center rounded-full">
          <Bot className="text-accent h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-white/70">
            "Can you help me think through the edge cases here?"
          </p>
          <p className="mt-1 text-xs text-white/40">AI Partner is typing...</p>
        </div>
      </div>
    ),
  },
  {
    id: "voice-interviewer",
    label: "Voice-Enabled",
    title: "Talk through your approach. The AI listens.",
    description:
      "Real interviews are conversations, not typing tests. Speak your thought process, and our AI interviewer responds naturally with follow-up questions—just like a real interviewer would.",
    highlight: "Two channels: Interviewer + AI Partner",
    visual: (
      <div className="flex flex-col gap-2">
        <div className="bg-accent/10 border-accent/20 flex items-center gap-2 rounded-lg border p-3">
          <Mic className="text-accent h-4 w-4 animate-pulse" />
          <span className="text-sm text-white/70">
            "I'm thinking a two-pointer approach here..."
          </span>
        </div>
        <div className="ml-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <span className="text-accent text-xs font-medium">AI:</span>
          <span className="text-sm text-white/60">
            "Good intuition. What's your time complexity?"
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "real-codebases",
    label: "Real-World Code",
    title: "Multi-file codebases. Not just LeetCode.",
    description:
      "Practice with real production contexts—payment processing bugs, feature implementations, e-commerce systems. Understand existing code before you write new code.",
    highlight: "60-minute rounds: explore → fix → implement → extend",
    visual: (
      <div className="font-mono text-xs">
        <div className="mb-2 flex items-center gap-2 text-white/40">
          <span className="rounded bg-white/10 px-2 py-0.5">src/</span>
          <span className="rounded bg-white/10 px-2 py-0.5">tests/</span>
          <span className="bg-accent/20 text-accent rounded px-2 py-0.5">payment.ts</span>
        </div>
        <div className="text-white/50">
          <span className="text-purple-400">export</span>{" "}
          <span className="text-accent">function</span> processPayment(...)
        </div>
      </div>
    ),
  },
  {
    id: "smart-hints",
    label: "Adaptive Hints",
    title: "Progressive hints when you're stuck.",
    description:
      "Our AI detects when you're struggling—stagnant code, failed tests, long pauses. It offers increasingly specific hints without giving away the answer. You stay in control.",
    highlight: "4 levels: Nudge → Guide → Explain → Reveal",
    visual: (
      <div className="flex gap-2">
        {["Nudge", "Guide", "Explain", "Reveal"].map((level, i) => (
          <div
            key={level}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              i === 0
                ? "bg-accent/20 text-accent border-accent/30 border"
                : "border border-white/10 bg-white/5 text-white/40"
            }`}
          >
            {level}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "company-prep",
    label: "70+ Scenarios",
    title: "FAANG-specific interview simulations.",
    description:
      "Practice with scenarios tailored to Google, Meta, Amazon, Apple, Netflix—plus Stripe, Airbnb, Shopify, and more. Each company has different patterns and expectations.",
    highlight: "Company-specific knowledge base via RAG",
    visual: (
      <div className="flex flex-wrap gap-2">
        {["Google", "Meta", "Amazon", "Apple", "Stripe", "Airbnb"].map((company) => (
          <span
            key={company}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
          >
            {company}
          </span>
        ))}
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/40">
          +64 more
        </span>
      </div>
    ),
  },
  {
    id: "accessibility",
    label: "Built for Everyone",
    title: "Calm mode. Focus mode. Your pace.",
    description:
      "Interview anxiety is real. Hide the timer, mute distracting colors, collapse panels you don't need. Practice in an environment that works for you.",
    highlight: "WCAG 2.1 compliant design",
    visual: (
      <div className="flex gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
          <Clock className="mb-1 h-4 w-4 opacity-50" />
          Hide Timer
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
          <Sparkles className="mb-1 h-4 w-4 opacity-50" />
          Calm Mode
        </div>
      </div>
    ),
  },
]

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <section id="features" className="relative overflow-hidden py-24 md:py-32">
      {/* Background */}
      <div className="from-background to-background absolute inset-0 bg-gradient-to-b via-slate-900/50" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="mb-16 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="bg-accent/10 border-accent/20 text-accent mb-4 inline-block rounded-full border px-3 py-1 text-xs font-medium">
            More than mock interviews
          </span>
          <h2 className="font-heading mb-6 text-3xl leading-tight font-bold text-white md:text-4xl lg:text-5xl">
            Practice the way
            <span className="from-accent to-neural bg-gradient-to-r bg-clip-text text-transparent">
              {" "}
              real interviews{" "}
            </span>
            actually work
          </h2>
          <p className="max-w-2xl text-lg text-white/60">
            Modern tech interviews let you use AI tools. They test real-world coding, not
            memorization. CodeSparring simulates exactly that.
          </p>
        </motion.div>

        {/* Interview Types Row */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <p className="mb-4 text-sm tracking-wider text-white/40 uppercase">6 Interview Types</p>
          <div className="flex flex-wrap gap-3">
            {interviewTypes.map((type) => (
              <div
                key={type.name}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition-colors hover:border-white/20"
              >
                <type.icon className="text-accent h-4 w-4" />
                <span className="text-sm font-medium text-white">{type.name}</span>
                <span className="hidden text-xs text-white/40 sm:inline">— {type.description}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Features List */}
        <div ref={containerRef} className="space-y-24 md:space-y-32">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              className="grid items-center gap-8 md:grid-cols-2 md:gap-16"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Text - alternates sides */}
              <div className={index % 2 === 1 ? "md:order-2" : ""}>
                <span className="mb-4 inline-block rounded bg-white/5 px-2 py-1 text-xs font-medium text-white/50">
                  {feature.label}
                </span>
                <h3 className="mb-4 text-2xl leading-tight font-bold text-white md:text-3xl">
                  {feature.title}
                </h3>
                <p className="mb-4 leading-relaxed text-white/60">{feature.description}</p>
                <p className="text-accent text-sm">{feature.highlight}</p>
              </div>

              {/* Visual */}
              <div
                className={`rounded-2xl border border-white/10 bg-white/[0.02] p-6 ${index % 2 === 1 ? "md:order-1" : ""}`}
              >
                {feature.visual}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-24 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-6 text-white/50">
            Ready to practice the way top companies actually interview?
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/interview">
              <MagneticButton size="lg" variant="primary" glowColor="accent">
                <Play className="h-5 w-5" />
                Try It Free
              </MagneticButton>
            </Link>
            <Link href="/why-codesparring">
              <MagneticButton size="lg" variant="outline" glowColor="none">
                How It Works
              </MagneticButton>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
