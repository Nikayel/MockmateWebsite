"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { Play, Mic, Code2, Wrench, Layers, Shield, Zap, Bot, Clock, Building2, Sparkles } from "lucide-react"
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
    description: "Like Meta's new interview format—you can ask your AI partner for hints, debugging help, or algorithm suggestions. We grade you on understanding, not whether you used AI.",
    highlight: "Simulates real AI-enabled interview formats",
    visual: (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-white/70">"Can you help me think through the edge cases here?"</p>
          <p className="text-xs text-white/40 mt-1">AI Partner is typing...</p>
        </div>
      </div>
    ),
  },
  {
    id: "voice-interviewer",
    label: "Voice-Enabled",
    title: "Talk through your approach. The AI listens.",
    description: "Real interviews are conversations, not typing tests. Speak your thought process, and our AI interviewer responds naturally with follow-up questions—just like a real interviewer would.",
    highlight: "Two channels: Interviewer + AI Partner",
    visual: (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <Mic className="w-4 h-4 text-accent animate-pulse" />
          <span className="text-sm text-white/70">"I'm thinking a two-pointer approach here..."</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 ml-4">
          <span className="text-xs text-accent font-medium">AI:</span>
          <span className="text-sm text-white/60">"Good intuition. What's your time complexity?"</span>
        </div>
      </div>
    ),
  },
  {
    id: "real-codebases",
    label: "Real-World Code",
    title: "Multi-file codebases. Not just LeetCode.",
    description: "Practice with real production contexts—payment processing bugs, feature implementations, e-commerce systems. Understand existing code before you write new code.",
    highlight: "60-minute rounds: explore → fix → implement → extend",
    visual: (
      <div className="font-mono text-xs">
        <div className="flex items-center gap-2 text-white/40 mb-2">
          <span className="px-2 py-0.5 rounded bg-white/10">src/</span>
          <span className="px-2 py-0.5 rounded bg-white/10">tests/</span>
          <span className="px-2 py-0.5 rounded bg-accent/20 text-accent">payment.ts</span>
        </div>
        <div className="text-white/50">
          <span className="text-purple-400">export</span> <span className="text-accent">function</span> processPayment(...)
        </div>
      </div>
    ),
  },
  {
    id: "smart-hints",
    label: "Adaptive Hints",
    title: "Progressive hints when you're stuck.",
    description: "Our AI detects when you're struggling—stagnant code, failed tests, long pauses. It offers increasingly specific hints without giving away the answer. You stay in control.",
    highlight: "4 levels: Nudge → Guide → Explain → Reveal",
    visual: (
      <div className="flex gap-2">
        {["Nudge", "Guide", "Explain", "Reveal"].map((level, i) => (
          <div
            key={level}
            className={`px-3 py-1.5 rounded-lg text-xs ${
              i === 0 ? "bg-accent/20 text-accent border border-accent/30" : "bg-white/5 text-white/40 border border-white/10"
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
    description: "Practice with scenarios tailored to Google, Meta, Amazon, Apple, Netflix—plus Stripe, Airbnb, Shopify, and more. Each company has different patterns and expectations.",
    highlight: "Company-specific knowledge base via RAG",
    visual: (
      <div className="flex flex-wrap gap-2">
        {["Google", "Meta", "Amazon", "Apple", "Stripe", "Airbnb"].map((company) => (
          <span key={company} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
            {company}
          </span>
        ))}
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">
          +64 more
        </span>
      </div>
    ),
  },
  {
    id: "accessibility",
    label: "Built for Everyone",
    title: "Calm mode. Focus mode. Your pace.",
    description: "Interview anxiety is real. Hide the timer, mute distracting colors, collapse panels you don't need. Practice in an environment that works for you.",
    highlight: "WCAG 2.1 compliant design",
    visual: (
      <div className="flex gap-3">
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">
          <Clock className="w-4 h-4 mb-1 opacity-50" />
          Hide Timer
        </div>
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">
          <Sparkles className="w-4 h-4 mb-1 opacity-50" />
          Calm Mode
        </div>
      </div>
    ),
  },
]

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-slate-900/50 to-background" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="max-w-3xl mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
            More than mock interviews
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-6 leading-tight">
            Practice the way
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-neural"> real interviews </span>
            actually work
          </h2>
          <p className="text-lg text-white/60 max-w-2xl">
            Modern tech interviews let you use AI tools. They test real-world coding, not memorization. CodeSparring simulates exactly that.
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
          <p className="text-sm text-white/40 uppercase tracking-wider mb-4">6 Interview Types</p>
          <div className="flex flex-wrap gap-3">
            {interviewTypes.map((type) => (
              <div
                key={type.name}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
              >
                <type.icon className="w-4 h-4 text-accent" />
                <span className="text-sm text-white font-medium">{type.name}</span>
                <span className="text-xs text-white/40 hidden sm:inline">— {type.description}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Features List */}
        <div ref={containerRef} className="space-y-24 md:space-y-32">
          {features.map((feature, index) => (
            <motion.div
              key={feature.id}
              className="grid md:grid-cols-2 gap-8 md:gap-16 items-center"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Text - alternates sides */}
              <div className={index % 2 === 1 ? "md:order-2" : ""}>
                <span className="inline-block px-2 py-1 rounded bg-white/5 text-xs text-white/50 font-medium mb-4">
                  {feature.label}
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-white/60 mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <p className="text-sm text-accent">
                  {feature.highlight}
                </p>
              </div>

              {/* Visual */}
              <div className={`p-6 rounded-2xl bg-white/[0.02] border border-white/10 ${index % 2 === 1 ? "md:order-1" : ""}`}>
                {feature.visual}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-white/50 mb-6">
            Ready to practice the way top companies actually interview?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/interview">
              <MagneticButton size="lg" variant="primary" glowColor="accent">
                <Play className="w-5 h-5" />
                Try It Free
              </MagneticButton>
            </Link>
            <Link href="/why-skillon">
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
