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
  FileCode,
  Lightbulb,
  Users,
  Accessibility,
} from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

/**
 * Features Section - Tabbed Interface with Animated Demos
 * Compact, interactive, engaging
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
    icon: Bot,
    label: "AI Collaboration",
    title: "Use AI during interviews. Never penalized.",
    description:
      "Like Meta's new format—ask your AI partner for debugging help, architecture feedback, or implementation suggestions. We grade understanding, not AI usage.",
    highlight: "Available in System Design, Bug Fix & Add Functionality",
  },
  {
    id: "voice",
    icon: Mic,
    label: "Voice-Enabled",
    title: "Talk through your approach. The AI listens.",
    description:
      "Real interviews are conversations. Speak your thought process, and our AI responds with follow-up questions—just like a real interviewer.",
    highlight: "Two channels: Interviewer + AI Partner",
  },
  {
    id: "real-code",
    icon: FileCode,
    label: "Real-World Code",
    title: "Multi-file codebases. Not just LeetCode.",
    description:
      "Practice with production contexts—payment processing bugs, feature implementations, e-commerce systems. Understand existing code before writing new code.",
    highlight: "60-minute rounds: explore → fix → implement → extend",
  },
  {
    id: "hints",
    icon: Lightbulb,
    label: "Adaptive Hints",
    title: "Progressive hints when you're stuck.",
    description:
      "Our AI detects when you're struggling—stagnant code, failed tests, long pauses. It offers increasingly specific hints without giving away the answer.",
    highlight: "4 levels: Nudge → Guide → Explain → Reveal",
  },
  {
    id: "scenarios",
    icon: Users,
    label: "70+ Scenarios",
    title: "FAANG-specific interview simulations.",
    description:
      "Practice with scenarios tailored to Google, Meta, Amazon, Apple, Netflix—plus Stripe, Airbnb, Shopify, and more. Each company has different patterns.",
    highlight: "Company-specific knowledge base via RAG",
  },
  {
    id: "accessibility",
    icon: Accessibility,
    label: "Built for Everyone",
    title: "Calm mode. Focus mode. Your pace.",
    description:
      "Interview anxiety is real. Hide the timer, mute distracting colors, collapse panels you don't need. Practice in an environment that works for you.",
    highlight: "WCAG 2.1 compliant design",
  },
]

// Animated visual components for each feature
function AICollaborationVisual() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % 4)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const messages = [
    { type: "user", text: "Can you help me think through the edge cases?" },
    { type: "ai", text: "Sure! Consider: empty input, single element, duplicates..." },
    { type: "user", text: "What about negative numbers?" },
    { type: "ai", text: "Good catch! Your current approach handles them, but..." },
  ]

  return (
    <div className="space-y-3">
      {messages.slice(0, step + 1).map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`flex items-start gap-3 ${msg.type === "ai" ? "ml-4" : ""}`}
        >
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
              msg.type === "user" ? "bg-white/10" : "bg-accent/20"
            }`}
          >
            {msg.type === "user" ? (
              <Users className="h-4 w-4 text-white/60" />
            ) : (
              <Bot className="text-accent h-4 w-4" />
            )}
          </div>
          <div
            className={`rounded-xl px-4 py-2 text-sm ${
              msg.type === "user"
                ? "bg-white/5 text-white/70"
                : "border-accent/20 bg-accent/5 border text-white/80"
            }`}
          >
            {msg.text}
          </div>
        </motion.div>
      ))}
      {step < 3 && (
        <motion.div
          className="ml-4 flex items-center gap-2 text-xs text-white/40"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Bot className="h-3 w-3" />
          AI Partner is typing...
        </motion.div>
      )}
    </div>
  )
}

function VoiceVisual() {
  return (
    <div className="space-y-4">
      {/* Waveform */}
      <div className="flex items-center gap-3">
        <div className="bg-accent/20 flex h-10 w-10 items-center justify-center rounded-full">
          <Mic className="text-accent h-5 w-5" />
        </div>
        <div className="flex flex-1 items-center gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="bg-accent w-1 rounded-full"
              animate={{
                height: [8, 24, 8],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.05,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          <span className="text-accent text-xs font-medium">You:</span>
          <span className="text-sm text-white/70">
            "I'm thinking a two-pointer approach here..."
          </span>
        </div>
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-neural text-xs font-medium">AI:</span>
          <span className="text-sm text-white/70">
            "Good intuition. What's your time complexity?"
          </span>
        </motion.div>
      </div>
    </div>
  )
}

function RealCodeVisual() {
  const [charIndex, setCharIndex] = useState(0)
  const code = `export function processPayment(order: Order) {
  // BUG: Race condition here
  const payment = await stripe.create(order);
  await updateInventory(order.items);
  return payment;
}`

  useEffect(() => {
    if (charIndex < code.length) {
      const timer = setTimeout(() => setCharIndex((c) => c + 1), 30)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setCharIndex(0), 2000)
      return () => clearTimeout(timer)
    }
  }, [charIndex, code.length])

  return (
    <div className="space-y-3">
      {/* File tabs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-white/10 px-2 py-1 text-white/40">src/</span>
        <span className="rounded bg-white/10 px-2 py-1 text-white/40">tests/</span>
        <span className="border-accent/30 bg-accent/10 text-accent rounded border px-2 py-1">
          payment.ts
        </span>
      </div>

      {/* Code editor */}
      <div className="rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-xs">
        <pre className="text-white/70">
          <code>
            {code.slice(0, charIndex)}
            <motion.span
              className="bg-accent inline-block h-4 w-[2px]"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          </code>
        </pre>
      </div>

      {/* Bug indicator */}
      <motion.div
        className="flex items-center gap-2 text-xs text-yellow-500/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: charIndex > 80 ? 1 : 0 }}
      >
        <span className="h-2 w-2 rounded-full bg-yellow-500/80" />
        Line 3: Potential race condition detected
      </motion.div>
    </div>
  )
}

function HintsVisual() {
  const [activeLevel, setActiveLevel] = useState(0)
  const levels = [
    { name: "Nudge", hint: "Think about the data structure you're using..." },
    { name: "Guide", hint: "A hash map could help with O(1) lookups here." },
    { name: "Explain", hint: "Store each element's index. Check if complement exists." },
    { name: "Reveal", hint: "return [map.get(complement), i]" },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLevel((l) => (l + 1) % 4)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      {/* Level indicators */}
      <div className="flex gap-2">
        {levels.map((level, i) => (
          <motion.button
            key={level.name}
            className={`rounded-lg px-3 py-1.5 text-xs transition-all ${
              i <= activeLevel
                ? "border-accent/30 bg-accent/20 text-accent border"
                : "border border-white/10 bg-white/5 text-white/40"
            }`}
            animate={i === activeLevel ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {level.name}
          </motion.button>
        ))}
      </div>

      {/* Current hint */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLevel}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="text-accent h-4 w-4" />
            <span className="text-accent text-xs font-medium">{levels[activeLevel].name} Hint</span>
          </div>
          <p className="text-sm text-white/70">{levels[activeLevel].hint}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ScenariosVisual() {
  const companies = [
    { name: "Google", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { name: "Meta", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
    { name: "Amazon", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    { name: "Apple", color: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
    { name: "Stripe", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    { name: "Airbnb", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  ]

  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % companies.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [companies.length])

  return (
    <div className="space-y-4">
      {/* Company grid */}
      <div className="grid grid-cols-3 gap-2">
        {companies.map((company, i) => (
          <motion.div
            key={company.name}
            className={`rounded-lg border px-3 py-2 text-center text-xs font-medium ${company.color}`}
            animate={{
              scale: i === activeIndex ? 1.05 : 1,
              borderWidth: i === activeIndex ? 2 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {company.name}
          </motion.div>
        ))}
      </div>

      {/* Scenario preview */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
        >
          <p className="mb-1 text-xs text-white/40">
            {companies[activeIndex].name} Style Interview
          </p>
          <p className="text-sm text-white/70">
            {activeIndex === 0 && "Design a distributed rate limiter for Google Search..."}
            {activeIndex === 1 && "Build a real-time notification system like Facebook..."}
            {activeIndex === 2 && "Implement an inventory management system for Prime..."}
            {activeIndex === 3 && "Create a privacy-preserving analytics pipeline..."}
            {activeIndex === 4 && "Design Stripe's payment retry logic with idempotency..."}
            {activeIndex === 5 && "Build Airbnb's dynamic pricing algorithm..."}
          </p>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-xs text-white/30">+64 more companies</p>
    </div>
  )
}

function AccessibilityVisual() {
  const [settings, setSettings] = useState({
    hideTimer: false,
    calmMode: false,
    focusMode: false,
  })

  useEffect(() => {
    const sequence = [
      { hideTimer: true, calmMode: false, focusMode: false },
      { hideTimer: true, calmMode: true, focusMode: false },
      { hideTimer: true, calmMode: true, focusMode: true },
      { hideTimer: false, calmMode: false, focusMode: false },
    ]
    let step = 0
    const interval = setInterval(() => {
      setSettings(sequence[step % sequence.length])
      step++
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      {/* Toggle switches */}
      <div className="space-y-3">
        {[
          { key: "hideTimer", label: "Hide Timer", icon: Clock },
          { key: "calmMode", label: "Calm Mode", icon: Sparkles },
          { key: "focusMode", label: "Focus Mode", icon: Zap },
        ].map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-white/50" />
              <span className="text-sm text-white/70">{label}</span>
            </div>
            <motion.div
              className={`h-6 w-11 rounded-full p-1 ${
                settings[key as keyof typeof settings] ? "bg-accent" : "bg-white/20"
              }`}
              animate={{
                backgroundColor: settings[key as keyof typeof settings]
                  ? "rgb(var(--accent))"
                  : "rgba(255,255,255,0.2)",
              }}
            >
              <motion.div
                className="h-4 w-4 rounded-full bg-white"
                animate={{
                  x: settings[key as keyof typeof settings] ? 20 : 0,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-white/40">WCAG 2.1 AA compliant</p>
    </div>
  )
}

// Map feature id to visual component
const featureVisuals: Record<string, React.FC> = {
  "ai-collaboration": AICollaborationVisual,
  voice: VoiceVisual,
  "real-code": RealCodeVisual,
  hints: HintsVisual,
  scenarios: ScenariosVisual,
  accessibility: AccessibilityVisual,
}

export function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(features[0].id)
  const activeFeatureData = features.find((f) => f.id === activeFeature)!
  const VisualComponent = featureVisuals[activeFeature]

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
          <span className="border-accent/20 bg-accent/10 text-accent mb-4 inline-block rounded-full border px-3 py-1 text-xs font-medium">
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
          className="mb-16"
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

        {/* Tabbed Feature Showcase */}
        <motion.div
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Tab buttons */}
          <div className="mb-2 flex flex-wrap gap-1 rounded-xl bg-white/[0.02] p-1">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    activeFeature === feature.id
                      ? "bg-accent/20 text-accent"
                      : "text-white/50 hover:bg-white/5 hover:text-white/70"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{feature.label}</span>
                </button>
              )
            })}
          </div>

          {/* Content area */}
          <div className="grid gap-6 p-4 md:grid-cols-2 md:p-6">
            {/* Text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature + "-text"}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col justify-center"
              >
                <h3 className="mb-4 text-2xl leading-tight font-bold text-white md:text-3xl">
                  {activeFeatureData.title}
                </h3>
                <p className="mb-4 leading-relaxed text-white/60">
                  {activeFeatureData.description}
                </p>
                <p className="text-accent text-sm">{activeFeatureData.highlight}</p>
              </motion.div>
            </AnimatePresence>

            {/* Visual */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature + "-visual"}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl border border-white/10 bg-black/20 p-4 md:p-6"
              >
                <VisualComponent />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="mt-16 text-center"
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
