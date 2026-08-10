"use client"

import React, { useRef, useState, useEffect } from "react"
import { motion, useInView, useReducedMotion, useSpring, useTransform } from "framer-motion"
import { Check, X, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
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
}: {
  value: number
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const prefersReducedMotion = useReducedMotion()
  const spring = useSpring(0, { stiffness: 50, damping: 25 })
  const display = useTransform(spring, (v) => Math.floor(v).toLocaleString())
  // Seeded with the REAL price, not "0". This used to start at "0" and only
  // count up once the browser scrolled it into view, which meant the server
  // rendered every price on the page as "$0" — what a crawler reads, what a
  // no-JS visitor sees, and what shows for the split second before hydration.
  // The count-up now starts from zero only when we are actually going to run it.
  const [displayValue, setDisplayValue] = useState(() => value.toLocaleString())

  useEffect(() => {
    const unsubscribe = display.on("change", setDisplayValue)
    return unsubscribe
  }, [display])

  useEffect(() => {
    if (!isInView || prefersReducedMotion) return

    setDisplayValue("0")
    const timer = setTimeout(() => spring.set(value), delay)
    return () => clearTimeout(timer)
  }, [isInView, value, spring, delay, prefersReducedMotion])

  return (
    <span
      ref={ref}
      className={cn("font-heading text-foreground text-4xl leading-tight font-light", className)}
    >
      ${displayValue}
    </span>
  )
}

type CostPoint = { included: boolean; text: string }

/**
 * One cost card. The two cards were ~90-line near-duplicates differing only in
 * border weight, label colour, and check-icon colour, so a change to the shared
 * 80% had to be made twice and the "not included" X only existed on one of them.
 */
function CostCard({
  label,
  sublabel,
  note,
  points,
  highlighted = false,
  delay,
  isInView,
  children,
}: {
  label: string
  sublabel: string
  note: string
  points: CostPoint[]
  highlighted?: boolean
  delay: number
  isInView: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      className={cn(
        "bg-card rounded-[18px] p-6",
        highlighted ? "border-accent border-2" : "border-border border"
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5 }}
    >
      <div className="mb-5">
        <span
          className={cn(
            "text-sm font-semibold tracking-[0.08em] uppercase",
            highlighted ? "text-accent-strong" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        <p className="text-muted-foreground mt-0.5 text-xs">{sublabel}</p>
      </div>

      <div className="flex items-baseline gap-2">{children}</div>

      <p className="text-muted-foreground mt-1.5 text-xs">{note}</p>

      <div className="border-border mt-5 space-y-2 border-t pt-5">
        {points.map((point) => (
          <div
            key={point.text}
            className={cn(
              "flex items-center gap-2 text-sm",
              point.included ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {point.included ? (
              <Check
                aria-hidden
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  highlighted ? "text-accent-strong" : "text-muted-foreground"
                )}
              />
            ) : (
              <X aria-hidden className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            )}
            {/* The icon was the only thing distinguishing "has this" from
                "does not have this", so a screen reader heard both rows the same. */}
            <span className="sr-only">{point.included ? "Included:" : "Not included:"}</span>
            {point.text}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// Feature row with clean styling
function FeatureRow({
  feature,
  leetcode,
  human,
  codesparring,
  index,
}: {
  feature: string
  leetcode: boolean | string
  human: boolean | string
  codesparring: boolean
  index: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  /**
   * Every cell used to be a bare icon with no text alternative, and the "no"
   * state was #e0e0e0 on white — 1.32:1, which is invisible. So the single most
   * important signal in the table, "this competitor does NOT do this", was
   * unreadable by sight and absent entirely for a screen reader.
   */
  const renderValue = (value: boolean | string, highlight = false) => {
    if (typeof value === "string") {
      return <span className="text-muted-foreground text-xs">{value}</span>
    }
    if (value) {
      return (
        <>
          <Check
            aria-hidden
            className={cn(
              "mx-auto h-4 w-4",
              highlight ? "text-accent-strong" : "text-muted-foreground"
            )}
          />
          <span className="sr-only">Yes</span>
        </>
      )
    }
    return (
      <>
        <X aria-hidden className="text-muted-foreground/60 mx-auto h-4 w-4" />
        <span className="sr-only">No</span>
      </>
    )
  }

  return (
    <motion.tr
      ref={ref}
      className="border-border border-b last:border-0"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <th scope="row" className="text-foreground py-3 pr-2 text-sm font-normal">
        {feature}
      </th>
      <td className="py-3 text-center">{renderValue(leetcode)}</td>
      <td className="py-3 text-center">{renderValue(human)}</td>
      <td className="py-3 text-center">{renderValue(codesparring, true)}</td>
    </motion.tr>
  )
}

/** The three compared offerings, in table-column order. */
const COLUMNS = [
  {
    name: COMPETITOR_PRICING.leetcodePremium.name,
    price: `$${COMPETITOR_PRICING.leetcodePremium.monthlyPrice}/mo`,
    highlight: false,
  },
  {
    name: COMPETITOR_PRICING.humanMock.name,
    price: `$${COMPETITOR_PRICING.humanMock.perSessionMin}+`,
    highlight: false,
  },
  {
    name: "Ours",
    price: `${getProPricing("website").monthly.priceDisplay}/mo`,
    highlight: true,
  },
]

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
            <CostCard
              label={COMPETITOR_PRICING.humanMock.fullName}
              sublabel={COMPETITOR_PRICING.humanMock.examples}
              note={getHumanMockCostBasis()}
              points={[
                { included: true, text: "Real human feedback" },
                { included: false, text: "Requires scheduling in advance" },
              ]}
              delay={0.1}
              isInView={isInView}
            >
              <AnimatedPrice value={humanMockCost.min} delay={300} />
              <span className="text-muted-foreground">-</span>
              <AnimatedPrice value={humanMockCost.max} delay={500} />
            </CostCard>

            <CostCard
              label="CodeSparring"
              sublabel="AI mock interviews on demand"
              note="Cancel anytime"
              points={[
                { included: true, text: "AI adapts to your skill level" },
                { included: true, text: "Practice at 2am before your 9am interview" },
              ]}
              highlighted
              delay={0.2}
              isInView={isInView}
            >
              <AnimatedPrice value={proMonthly.price} delay={700} />
              <span className="text-muted-foreground text-lg">/month</span>
            </CostCard>
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

          {/* Feature Comparison. Was a grid of divs, so nothing announced it as a
              table, nothing tied a check to its column, and at 360px the feature
              column collapsed to about 56px and shredded every label. It is now a
              real table that scrolls horizontally instead of crushing. */}
          <motion.div
            className="border-border bg-card mb-10 rounded-[18px] border p-4 sm:p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left">
                <caption className="sr-only">
                  {`How CodeSparring compares with ${COMPETITOR_PRICING.leetcodePremium.fullName} and ${COMPETITOR_PRICING.humanMock.fullName}`}
                </caption>
                <thead>
                  <tr className="border-border border-b">
                    <th
                      scope="col"
                      className="text-muted-foreground pb-3 text-xs font-semibold tracking-[0.08em] uppercase"
                    >
                      Feature
                    </th>
                    {COLUMNS.map((column) => (
                      <th
                        key={column.name}
                        scope="col"
                        className="w-[72px] pb-3 text-center align-bottom sm:w-[88px]"
                      >
                        <span
                          className={cn(
                            "block text-xs",
                            column.highlight
                              ? "text-accent-strong font-semibold"
                              : "text-muted-foreground"
                          )}
                        >
                          {column.name}
                        </span>
                        <span
                          className={cn(
                            "text-[11px]",
                            column.highlight ? "text-accent-strong" : "text-muted-foreground"
                          )}
                        >
                          {column.price}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((row, index) => (
                    <FeatureRow key={row.feature} {...row} index={index} />
                  ))}
                </tbody>
              </table>
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
