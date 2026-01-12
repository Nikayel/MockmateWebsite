"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { motion, useInView, useSpring, useTransform } from "framer-motion"
import { Mic, Clock, Brain, Zap, ArrowRight } from "lucide-react"
import Link from "next/link"
import { MagneticButton } from "@/components/ui/magnetic-button"

/**
 * Comparison Section - Premium redesign
 *
 * Design philosophy:
 * - Motion with meaning: every animation tells part of the story
 * - Visual hierarchy: the win is obvious at a glance
 * - Professional restraint: smooth, subtle, intentional
 * - Narrative flow: expensive → transformation → value
 */

// Smooth spring-based price counter
function AnimatedPrice({
  value,
  delay = 0,
  className = "",
  onComplete,
}: {
  value: number
  delay?: number
  className?: string
  onComplete?: () => void
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const spring = useSpring(0, { stiffness: 40, damping: 20 })
  const display = useTransform(spring, (v) => Math.floor(v).toLocaleString())
  const [displayValue, setDisplayValue] = useState("0")
  const [hasCompleted, setHasCompleted] = useState(false)

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      setDisplayValue(v)
      if (!hasCompleted && parseInt(v.replace(/,/g, "")) >= value * 0.95) {
        setHasCompleted(true)
        onComplete?.()
      }
    })
    return unsubscribe
  }, [display, value, hasCompleted, onComplete])

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        spring.set(value)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [isInView, value, spring, delay])

  return (
    <span ref={ref} className={className}>
      ${displayValue}
    </span>
  )
}

// Strike-through animation - the "defeat" moment
function StrikeThrough({ show, delay = 0 }: { show: boolean; delay?: number }) {
  return (
    <motion.span
      className="absolute top-1/2 right-0 left-0 h-[3px] origin-left bg-gradient-to-r from-red-500/90 via-red-400/80 to-red-500/60"
      initial={{ scaleX: 0 }}
      animate={show ? { scaleX: 1 } : { scaleX: 0 }}
      transition={{
        delay,
        duration: 0.5,
        ease: [0.32, 0.72, 0, 1],
      }}
    />
  )
}

// Value advantage card - replaces boring table rows
function AdvantageCard({
  icon: Icon,
  title,
  subtitle,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  index: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <motion.div
      ref={ref}
      className="group relative"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        delay: 0.08 * index + 0.2,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <div className="border-border/50 bg-card/30 hover:border-accent/30 hover:bg-card/50 relative flex items-start gap-3 rounded-xl border p-4 transition-all duration-300">
        {/* Icon */}
        <div className="bg-accent/10 ring-accent/20 group-hover:bg-accent/15 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ring-1 transition-all">
          <Icon className="text-accent h-4 w-4" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h4 className="text-foreground text-sm font-medium">{title}</h4>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  )
}

// The multiplier badge - the hero stat
function MultiplierBadge({ delay = 0 }: { delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  return (
    <motion.div
      ref={ref}
      className="border-neural/30 bg-neural/10 inline-flex items-center gap-2 rounded-full border px-4 py-2"
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
      transition={{
        delay,
        duration: 0.6,
        type: "spring",
        stiffness: 150,
        damping: 15,
      }}
    >
      <span className="text-neural text-2xl font-bold sm:text-3xl">45×</span>
      <span className="text-neural/80 text-sm">less expensive</span>
    </motion.div>
  )
}

export function ComparisonSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 })
  const [showStrike, setShowStrike] = useState(false)

  const handlePriceComplete = useCallback(() => {
    setShowStrike(true)
  }, [])

  const advantages = [
    {
      icon: Mic,
      title: "Voice-first practice",
      subtitle: "Talk through problems exactly like a real interview",
    },
    {
      icon: Clock,
      title: "Available 24/7",
      subtitle: "No scheduling, no waiting for availability",
    },
    {
      icon: Brain,
      title: "Adaptive difficulty",
      subtitle: "Real-time hints calibrated to your level",
    },
    {
      icon: Zap,
      title: "Spaced repetition",
      subtitle: "Science-backed retention for lasting skills",
    },
  ]

  return (
    <section ref={sectionRef} className="bg-background relative overflow-hidden py-20 lg:py-28">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="from-accent/[0.04] absolute top-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          {/* Section header */}
          <motion.div
            className="mb-14 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              <span className="text-foreground">The real cost of </span>
              <span className="text-accent">interview prep</span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm sm:text-base">
              Research shows 5 mock interviews doubles your pass rate. Here's what that actually
              costs.
            </p>
          </motion.div>

          {/* The dramatic price comparison */}
          <div className="mb-14">
            {/* Old way - expensive, defeated */}
            <motion.div
              className="mb-6 text-center"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                Human mock interviews
              </p>
              <div className="relative inline-block">
                <AnimatedPrice
                  value={1125}
                  delay={400}
                  className="text-muted-foreground/70 text-4xl font-bold sm:text-5xl"
                  onComplete={handlePriceComplete}
                />
                <StrikeThrough show={showStrike} delay={0.3} />
              </div>
              <p className="text-muted-foreground/60 mt-2 text-xs">$225/session × 5 sessions</p>
            </motion.div>

            {/* Transformation divider */}
            <motion.div
              className="mb-6 flex items-center justify-center gap-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              transition={{ delay: 1.2, duration: 0.4 }}
            >
              <div className="to-border h-px w-12 bg-gradient-to-r from-transparent sm:w-16" />
              <span className="text-muted-foreground text-xs font-medium">or</span>
              <div className="to-border h-px w-12 bg-gradient-to-l from-transparent sm:w-16" />
            </motion.div>

            {/* New way - the win */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
              transition={{ delay: 1.4, duration: 0.6 }}
            >
              <p className="text-accent mb-2 text-xs font-medium tracking-wider uppercase">
                Unlimited AI mock interviews
              </p>
              <div className="mb-2 flex items-baseline justify-center gap-1">
                <AnimatedPrice
                  value={25}
                  delay={1600}
                  className="text-foreground text-5xl font-bold sm:text-6xl"
                />
                <span className="text-muted-foreground text-lg">/mo</span>
              </div>

              {/* Hero stat */}
              <motion.div
                className="mt-5"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 2.2 }}
              >
                <MultiplierBadge delay={2.3} />
              </motion.div>
            </motion.div>
          </div>

          {/* What you get - advantage cards */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <p className="text-muted-foreground mb-5 text-center text-xs font-medium tracking-wider uppercase">
              What you get
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {advantages.map((advantage, index) => (
                <AdvantageCard key={advantage.title} {...advantage} index={index} />
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <Link href="/interview">
              <MagneticButton variant="primary" glowColor="accent" size="lg">
                Start practicing today
                <ArrowRight className="ml-2 h-4 w-4" />
              </MagneticButton>
            </Link>
            <p className="text-muted-foreground mt-4 text-xs">
              Cancel anytime. No commitment required.
            </p>
          </motion.div>

          {/* Positioning statement */}
          <motion.p
            className="text-muted-foreground mt-12 text-center text-sm"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            LeetCode trains problem-solving. We train interview performance.
            <span className="text-foreground"> Different skills.</span>
          </motion.p>
        </div>
      </div>
    </section>
  )
}
