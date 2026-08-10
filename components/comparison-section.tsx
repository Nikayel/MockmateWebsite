"use client"

import React, { useRef, useState, useEffect } from "react"
import { motion, useInView, useSpring, useTransform } from "framer-motion"
import { Check, X, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getProPricing } from "@/lib/config"
import {
  COMPETITOR_PRICING,
  MOCKS_FOR_IMPACT,
  getHumanMockCostBasis,
  getHumanMockTotalCost,
} from "@/lib/pricing-comparison"

/**
 * Comparison Section - Professional Redesign
 *
 * Design principles applied:
 * - Typography: Work Sans for headings, Open Sans for body (via font-heading/font-sans)
 * - Colors: zinc-800/900 palette matching authenticated dashboard
 * - Cards: Subtle borders (zinc-800/50), minimal backgrounds (zinc-900/50)
 * - Animation: Subtle scroll reveals only, no gimmicky effects
 * - Layout: Clean grid, proper spacing, professional hierarchy
 */

// Animated counter - subtle, professional
function AnimatedPrice({
  value,
  delay = 0,
  className = "",
  style,
}: {
  value: number
  delay?: number
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const spring = useSpring(0, { stiffness: 50, damping: 25 })
  const display = useTransform(spring, (v) => Math.floor(v).toLocaleString())
  const [displayValue, setDisplayValue] = useState("0")

  useEffect(() => {
    const unsubscribe = display.on("change", setDisplayValue)
    return unsubscribe
  }, [display])

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => spring.set(value), delay)
      return () => clearTimeout(timer)
    }
  }, [isInView, value, spring, delay])

  return (
    <span ref={ref} className={className} style={style}>
      ${displayValue}
    </span>
  )
}

// Feature row with clean styling
function FeatureRow({
  feature,
  leetcode,
  human,
  codesparring,
  index,
  fontBody,
}: {
  feature: string
  leetcode: boolean | string
  human: boolean | string
  codesparring: boolean
  index: number
  fontBody: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  const renderValue = (value: boolean | string, highlight = false) => {
    if (typeof value === "string") {
      return (
        <span style={{ fontFamily: fontBody, fontSize: "12px", color: "#7a7a7a" }}>{value}</span>
      )
    }
    if (value) {
      return <Check className="h-4 w-4" style={{ color: highlight ? "#c4703f" : "#7a7a7a" }} />
    }
    return <X className="h-4 w-4" style={{ color: "#e0e0e0" }} />
  }

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-[1fr_72px_72px_72px] items-center gap-2 py-3 last:border-0 sm:grid-cols-[1fr_88px_88px_88px]"
      style={{ borderBottom: "1px solid #f0f0f0" }}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <span
        style={{
          fontFamily: fontBody,
          fontSize: "14px",
          color: "#1a1917",
          letterSpacing: "-0.224px",
        }}
      >
        {feature}
      </span>
      <div className="flex justify-center">{renderValue(leetcode)}</div>
      <div className="flex justify-center">{renderValue(human)}</div>
      <div className="flex justify-center">{renderValue(codesparring, true)}</div>
    </motion.div>
  )
}

export function ComparisonSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 })
  const proMonthly = getProPricing("website").monthly
  const humanMockCost = getHumanMockTotalCost()

  // "Available 24/7, no scheduling" and "Practice anytime, 24/7" were two rows
  // making the identical claim with identical values, which pads a six-row
  // comparison to look like it has more evidence than it does. Kept once.
  const features = [
    {
      feature: "Practice speaking through solutions",
      leetcode: false,
      human: true,
      codesparring: true,
    },
    { feature: "Available 24/7, no scheduling", leetcode: true, human: false, codesparring: true },
    { feature: "Real-time hints while coding", leetcode: false, human: true, codesparring: true },
    {
      feature: "Consistent feedback quality",
      leetcode: "N/A",
      human: "Varies",
      codesparring: true,
    },
    { feature: "Spaced repetition system", leetcode: false, human: false, codesparring: true },
  ]

  // Shared font stacks from Design.md — resolved via CSS variables set in globals.css
  const fontHeading = "var(--font-work-sans), system-ui, -apple-system, sans-serif"
  const fontBody = "var(--font-open-sans), system-ui, -apple-system, sans-serif"

  return (
    // Was a fixed #232220 tile with white cards, justified by a comment saying it
    // "deliberately sits outside the light/dark theme". That comment covered one
    // of the 48 hex literals in this file; the other 47 were a private palette
    // forked from globals.css, and three of them failed WCAG AA in BOTH themes
    // (#7a7a7a body text at 4.29:1, #e0e0e0 X icons at 1.32:1, #c4703f as text
    // at 3.66:1). So the tile was not a light-mode problem being tolerated for
    // design reasons, it was a contrast bug hiding behind one. Now the standard
    // section pattern used by features/relevance-gap/ai-assisted: page surface
    // outside, card surface inside, hairline border between.
    <section ref={sectionRef} className="bg-background py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-heading text-foreground text-3xl font-semibold tracking-tight">
              What interview prep costs
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-lg leading-relaxed">
              {`${MOCKS_FOR_IMPACT}+ mock interviews significantly improve pass rates. Here's what that investment looks like.`}
            </p>
          </motion.div>

          {/* Price Cards — white canvas on dark tile, hairline border, 18px radius */}
          <div className="mb-10 grid gap-6 sm:grid-cols-2">
            {/* Human Mocks */}
            <motion.div
              className="rounded-[18px] p-6"
              style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <div className="mb-5">
                <span
                  className="font-semibold uppercase"
                  style={{
                    fontFamily: fontBody,
                    fontSize: "14px",
                    letterSpacing: "0.08em",
                    color: "#7a7a7a",
                  }}
                >
                  {COMPETITOR_PRICING.humanMock.fullName}
                </span>
                <p
                  style={{
                    fontFamily: fontBody,
                    fontSize: "12px",
                    letterSpacing: "-0.12px",
                    color: "#7a7a7a",
                    marginTop: "2px",
                  }}
                >
                  {COMPETITOR_PRICING.humanMock.examples}
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <AnimatedPrice
                  value={humanMockCost.min}
                  delay={300}
                  className="font-light"
                  style={{
                    fontFamily: fontHeading,
                    fontSize: "40px",
                    color: "#1a1917",
                    lineHeight: 1.1,
                  }}
                />
                <span style={{ fontFamily: fontBody, color: "#7a7a7a" }}>–</span>
                <AnimatedPrice
                  value={humanMockCost.max}
                  delay={500}
                  className="font-light"
                  style={{
                    fontFamily: fontHeading,
                    fontSize: "40px",
                    color: "#1a1917",
                    lineHeight: 1.1,
                  }}
                />
              </div>

              <p
                style={{
                  fontFamily: fontBody,
                  fontSize: "12px",
                  color: "#7a7a7a",
                  marginTop: "6px",
                  letterSpacing: "-0.12px",
                }}
              >
                {getHumanMockCostBasis()}
              </p>

              <div className="mt-5 space-y-2 pt-5" style={{ borderTop: "1px solid #e0e0e0" }}>
                <div
                  className="flex items-center gap-2"
                  style={{ fontFamily: fontBody, fontSize: "14px", color: "#1a1917" }}
                >
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#7a7a7a" }} />
                  Real human feedback
                </div>
                <div
                  className="flex items-center gap-2"
                  style={{ fontFamily: fontBody, fontSize: "14px", color: "#7a7a7a" }}
                >
                  <X className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#7a7a7a" }} />
                  Requires scheduling in advance
                </div>
              </div>
            </motion.div>

            {/* CodeSparring — Action Blue border to signal selection */}
            <motion.div
              className="rounded-[18px] p-6"
              style={{ backgroundColor: "#ffffff", border: "2px solid #c4703f" }}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="mb-5">
                <span
                  className="font-semibold uppercase"
                  style={{
                    fontFamily: fontBody,
                    fontSize: "14px",
                    letterSpacing: "0.08em",
                    color: "#c4703f",
                  }}
                >
                  CodeSparring
                </span>
                <p
                  style={{
                    fontFamily: fontBody,
                    fontSize: "12px",
                    letterSpacing: "-0.12px",
                    color: "#7a7a7a",
                    marginTop: "2px",
                  }}
                >
                  AI mock interviews on demand
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <AnimatedPrice
                  value={proMonthly.price}
                  delay={700}
                  className="font-light"
                  style={{
                    fontFamily: fontHeading,
                    fontSize: "40px",
                    color: "#1a1917",
                    lineHeight: 1.1,
                  }}
                />
                <span
                  style={{
                    fontFamily: fontBody,
                    fontSize: "17px",
                    color: "#7a7a7a",
                    letterSpacing: "-0.374px",
                  }}
                >
                  /month
                </span>
              </div>

              <p
                style={{
                  fontFamily: fontBody,
                  fontSize: "12px",
                  color: "#7a7a7a",
                  marginTop: "6px",
                  letterSpacing: "-0.12px",
                }}
              >
                Cancel anytime
              </p>

              <div className="mt-5 space-y-2 pt-5" style={{ borderTop: "1px solid #e0e0e0" }}>
                <div
                  className="flex items-center gap-2"
                  style={{ fontFamily: fontBody, fontSize: "14px", color: "#1a1917" }}
                >
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#c4703f" }} />
                  AI adapts to your skill level
                </div>
                <div
                  className="flex items-center gap-2"
                  style={{ fontFamily: fontBody, fontSize: "14px", color: "#1a1917" }}
                >
                  <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#c4703f" }} />
                  Practice at 2am before your 9am interview
                </div>
              </div>
            </motion.div>
          </div>

          {/* Value statement */}
          <motion.p
            className="font-heading text-foreground mb-10 text-center text-xl font-semibold"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            One month costs less than a single human mock session.
          </motion.p>

          {/* Feature Comparison — white canvas card */}
          <motion.div
            className="mb-10 rounded-[18px] p-4 sm:p-6"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div
              className="mb-1 grid grid-cols-[1fr_72px_72px_72px] items-end gap-2 pb-3 sm:grid-cols-[1fr_88px_88px_88px]"
              style={{ borderBottom: "1px solid #e0e0e0" }}
            >
              <span
                className="font-semibold uppercase"
                style={{
                  fontFamily: fontBody,
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  color: "#7a7a7a",
                }}
              >
                Feature
              </span>
              <div className="text-center">
                <span
                  className="block"
                  style={{ fontFamily: fontBody, fontSize: "12px", color: "#7a7a7a" }}
                >
                  {COMPETITOR_PRICING.leetcodePremium.name}
                </span>
                <span style={{ fontFamily: fontBody, fontSize: "11px", color: "#7a7a7a" }}>
                  {`$${COMPETITOR_PRICING.leetcodePremium.monthlyPrice}/mo`}
                </span>
              </div>
              <div className="text-center">
                <span
                  className="block"
                  style={{ fontFamily: fontBody, fontSize: "12px", color: "#7a7a7a" }}
                >
                  {COMPETITOR_PRICING.humanMock.name}
                </span>
                <span style={{ fontFamily: fontBody, fontSize: "11px", color: "#7a7a7a" }}>
                  {`$${COMPETITOR_PRICING.humanMock.perSessionMin}+`}
                </span>
              </div>
              <div className="text-center">
                <span
                  className="block font-semibold"
                  style={{ fontFamily: fontBody, fontSize: "12px", color: "#c4703f" }}
                >
                  Ours
                </span>
                <span style={{ fontFamily: fontBody, fontSize: "11px", color: "#c4703f" }}>
                  {proMonthly.priceDisplay}/mo
                </span>
              </div>
            </div>

            <div>
              {features.map((row, index) => (
                <FeatureRow key={row.feature} {...row} index={index} fontBody={fontBody} />
              ))}
            </div>
          </motion.div>

          {/* CTA. The comment here read "Action Blue pill" while the button was
              clay, a leftover from a different design system. It was also
              #ffffff on #c4703f = 3.66:1, failing AA at 17px. */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Link
              href="/interview"
              className="bg-accent-strong text-accent-foreground hover:bg-accent-strong/90 focus-visible:ring-ring inline-flex items-center rounded-full px-7 py-3 text-lg font-medium transition-transform focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95"
            >
              Try your first mock free
              <ArrowRight aria-hidden className="ml-2 h-4 w-4" />
            </Link>
            <p className="text-muted-foreground mt-3 text-xs">No credit card required</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
