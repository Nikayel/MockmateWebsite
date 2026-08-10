"use client"

import React, { useRef, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown } from "lucide-react"
import { getProPricing, PRICING_CONFIG } from "@/lib/config"
import { trackEvent } from "@/lib/analytics"
import Link from "next/link"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Feature } from "@/components/ui/feature-with-image-comparison"
import { ComparisonSection } from "@/components/comparison-section"

interface PricingPageClientProps {
  faqs: { question: string; answer: string }[]
}

type BillingPeriod = "monthly" | "yearly"

const BILLING_PERIODS: { value: BillingPeriod; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Annually" },
]

/* Session counts are the enforced server quota, not copy: they must move with
   PRICING_CONFIG or this page advertises a limit the server no longer grants. */
const FREE_FEATURES = [
  "20+ problems, unlimited practice",
  `${PRICING_CONFIG.free.sessionsPerMonth} full interview sessions/month`,
  "AI interviewer feedback",
]

const PRO_FEATURES = [
  `${PRICING_CONFIG.pro.sessionsPerMonth} sessions/month`,
  "Spaced repetition scheduling",
  "Personalized study roadmap",
  "Priority support",
]

/** One feature row. Written seven times by hand before, with three different
 *  check-icon colours between the two cards. */
function PlanFeature({ children, accent = false }: { children: string; accent?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <Check
        aria-hidden
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          accent ? "text-accent-strong" : "text-muted-foreground"
        )}
      />
      {children}
    </li>
  )
}

export function PricingPageClient({ faqs }: PricingPageClientProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("yearly")
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([])
  const proPricing = getProPricing("website")

  const currentProPrice = billingPeriod === "yearly" ? proPricing.yearly : proPricing.monthly

  /** Arrow keys move between radios and select as they go, per the WAI-ARIA
   *  radiogroup pattern. Without this the group is reachable but unusable by
   *  keyboard, since only the selected option is in the tab order. */
  const onBillingKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown"
    const backward = e.key === "ArrowLeft" || e.key === "ArrowUp"
    if (!forward && !backward) return

    e.preventDefault()
    const next = (idx + (forward ? 1 : -1) + BILLING_PERIODS.length) % BILLING_PERIODS.length
    setBillingPeriod(BILLING_PERIODS[next].value)
    radioRefs.current[next]?.focus()
  }

  return (
    // Header and Footer sit OUTSIDE <main>. They were inside it, which nests the
    // banner and contentinfo landmarks within main and removes both from the
    // landmark list a screen-reader user navigates by, while also making "skip
    // to main content" land above the nav it was meant to skip.
    <div className="bg-background min-h-screen">
      <Header />

      <main>
        {/* Pricing Section - Above the fold */}
        <section className="pt-20 pb-8">
          <div className="container mx-auto max-w-4xl px-4">
            {/* Minimal Header */}
            <div className="mb-4 text-center">
              <h1 className="font-heading text-foreground text-2xl font-bold md:text-3xl">
                Choose Your Plan
              </h1>
            </div>

            {/* Billing Toggle. A radiogroup, not two loose buttons: a screen reader
              needs to hear that these are two options of one setting and which one
              is active. The "Save 25%" badge is always in the DOM and only fades,
              so switching periods does not reflow the row. */}
            <div className="mb-5 flex items-center justify-center gap-2">
              <div
                role="radiogroup"
                aria-label="Billing period"
                className="border-border inline-flex items-center gap-1 rounded-full border p-1 text-sm"
              >
                {BILLING_PERIODS.map((period, idx) => {
                  const isSelected = billingPeriod === period.value
                  return (
                    <button
                      key={period.value}
                      ref={(el) => {
                        radioRefs.current[idx] = el
                      }}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      // A radiogroup is one stop in the tab order and the arrows move
                      // between options, so only the selected radio stays tabbable.
                      tabIndex={isSelected ? 0 : -1}
                      onKeyDown={(e) => onBillingKeyDown(e, idx)}
                      onClick={() => setBillingPeriod(period.value)}
                      className={cn(
                        "rounded-full px-3 py-1 transition-colors",
                        isSelected
                          ? "bg-muted text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {period.label}
                    </button>
                  )
                })}
              </div>
              {/* Outside the radiogroup: it is a caption, not a third option, and a
                screen reader walking the group should not meet it between radios.
                Always rendered so switching periods never reflows the row. */}
              <span
                aria-hidden={billingPeriod !== "yearly"}
                className={cn(
                  "text-neural-strong text-xs font-medium transition-opacity",
                  billingPeriod === "yearly" ? "opacity-100" : "opacity-0"
                )}
              >
                {`Save ${proPricing.yearly.savingsPercent}%`}
              </span>
            </div>

            {/* Pricing Cards - Ultra Compact */}
            <div className="mx-auto mb-4 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
              {/* Free Plan */}
              <div className="border-border bg-card rounded-xl border p-5">
                <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.12em] uppercase">
                  Free
                </h3>

                {/* The price block used to render the word "Free" a second time,
                  directly under the "Free" heading. $0 states the same thing and
                  reads as a price, which is what this slot is for. */}
                <div className="mb-2 flex items-baseline gap-1">
                  <span className="font-heading text-foreground text-4xl font-bold">
                    {PRICING_CONFIG.free.priceDisplay}
                  </span>
                  <span className="text-muted-foreground text-sm">forever</span>
                </div>

                <Button asChild variant="outline" className="mb-4 w-full">
                  <Link
                    href="/interview"
                    onClick={() =>
                      trackEvent("cta_click", {
                        location: "pricing_free",
                        destination: "/interview",
                      })
                    }
                  >
                    Start practicing free
                  </Link>
                </Button>

                <p className="text-muted-foreground mb-2 text-xs">
                  Try before you commit. Includes free Python, SQL, and System Design courses.
                </p>

                <ul className="text-muted-foreground space-y-1.5 text-sm">
                  {FREE_FEATURES.map((feature) => (
                    <PlanFeature key={feature}>{feature}</PlanFeature>
                  ))}
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="from-accent/8 border-accent bg-card rounded-xl border-2 bg-gradient-to-br to-transparent p-5">
                <h3 className="text-accent-strong mb-3 text-xs font-semibold tracking-[0.12em] uppercase">
                  Pro
                </h3>

                <div className="mb-1 flex items-baseline gap-1">
                  <span className="font-heading text-foreground text-4xl font-bold">
                    {currentProPrice.priceDisplay}
                  </span>
                  <span className="text-muted-foreground text-sm">{currentProPrice.period}</span>
                </div>

                {/* The yearly card showed "$19 /mo" with nothing saying it is billed
                  as one $225 charge. That is the single most important thing a
                  buyer needs before clicking Subscribe, and it was missing. */}
                <p className="text-muted-foreground mb-3 text-xs">{currentProPrice.billingNote}</p>

                {/* The chosen period rides the URL. It used to be reported to
                  analytics and then dropped: /upgrade keeps its own billingPeriod
                  state defaulting to yearly, so a visitor who picked Monthly here,
                  saw $25/mo, and clicked Subscribe landed on a page quoting $19.
                  bg-accent-strong rather than bg-accent because white on --accent
                  is 3.97:1 in light mode; --accent-strong takes it to 5.53:1 and
                  is identical to --accent in dark mode. */}
                <Button
                  asChild
                  className="bg-accent-strong text-accent-foreground hover:bg-accent-strong/90 mb-4 w-full font-semibold"
                >
                  <Link
                    href={`/upgrade?billing=${billingPeriod}`}
                    onClick={() =>
                      trackEvent("cta_click", {
                        location: "pricing_pro_subscribe",
                        destination: "/upgrade",
                        billing_period: billingPeriod,
                      })
                    }
                  >
                    Subscribe
                  </Link>
                </Button>

                <p className="text-muted-foreground mb-2 text-xs">Everything in Free, plus...</p>
                <ul className="text-foreground space-y-1.5 text-sm">
                  {PRO_FEATURES.map((feature) => (
                    <PlanFeature key={feature} accent>
                      {feature}
                    </PlanFeature>
                  ))}
                </ul>
              </div>
            </div>

            {/* Trust line. The third clause used to read "Used by Palantir & FAANG
              candidates", an unsubstantiated usage claim sitting directly above a
              purchase button. The two guarantees are real and verifiable, so the
              line keeps those and drops the claim until there are users to cite. */}
            <p className="text-muted-foreground mb-8 text-center text-xs">
              30-day money-back guarantee · Cancel anytime · No card required to start
            </p>
          </div>
        </section>

        {/* Visual Platform Comparison */}
        <Feature />

        {/* Cost & Feature Comparison Section */}
        <ComparisonSection />

        {/* FAQ Section */}
        <section className="bg-background border-border border-t py-12">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl">
              <h2 className="font-heading text-foreground mb-6 text-center text-xl font-bold">
                Frequently Asked Questions
              </h2>
              <div className="space-y-2">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaq === idx
                  return (
                    <div
                      key={faq.question}
                      className="border-border overflow-hidden rounded-lg border"
                    >
                      <h3>
                        <button
                          type="button"
                          id={`faq-trigger-${idx}`}
                          aria-expanded={isOpen}
                          aria-controls={`faq-panel-${idx}`}
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className="hover:bg-muted flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
                        >
                          <span className="text-foreground text-sm font-medium">
                            {faq.question}
                          </span>
                          <ChevronDown
                            aria-hidden
                            className={cn(
                              "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                              isOpen && "rotate-180"
                            )}
                          />
                        </button>
                      </h3>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={`faq-panel-${idx}`}
                            role="region"
                            aria-labelledby={`faq-trigger-${idx}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="text-muted-foreground px-4 pb-3 text-sm leading-relaxed">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
