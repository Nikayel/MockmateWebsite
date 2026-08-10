"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown } from "lucide-react"
import { getProPricing, PRICING_CONFIG } from "@/lib/config"
import { trackEvent } from "@/lib/analytics"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
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
  const proPricing = getProPricing("website")

  const currentProPrice = billingPeriod === "yearly" ? proPricing.yearly : proPricing.monthly

  return (
    <main className="bg-background min-h-screen">
      <Header />

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
          <div className="mb-5 flex justify-center">
            <div
              role="radiogroup"
              aria-label="Billing period"
              className="border-border inline-flex items-center gap-1 rounded-full border p-1 text-sm"
            >
              {BILLING_PERIODS.map((period) => (
                <button
                  key={period.value}
                  type="button"
                  role="radio"
                  aria-checked={billingPeriod === period.value}
                  onClick={() => setBillingPeriod(period.value)}
                  className={cn(
                    "rounded-full px-3 py-1 transition-colors",
                    billingPeriod === period.value
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period.label}
                </button>
              ))}
              <span
                aria-hidden={billingPeriod !== "yearly"}
                className={cn(
                  "text-neural ml-1 pr-2 text-xs font-medium transition-opacity",
                  billingPeriod === "yearly" ? "opacity-100" : "opacity-0"
                )}
              >
                {`Save ${proPricing.yearly.savingsPercent}%`}
              </span>
            </div>
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

              <Link
                href="/interview"
                onClick={() =>
                  trackEvent("cta_click", { location: "pricing_free", destination: "/interview" })
                }
              >
                <Button variant="outline" className="mb-4 w-full">
                  Start practicing free
                </Button>
              </Link>

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

              <Link
                href="/upgrade"
                onClick={() =>
                  trackEvent("cta_click", {
                    location: "pricing_pro_subscribe",
                    destination: "/upgrade",
                    billing_period: billingPeriod,
                  })
                }
              >
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 mb-4 w-full font-semibold">
                  Subscribe
                </Button>
              </Link>

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
      <section className="bg-background border-t border-white/5 py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-6 text-center text-xl font-bold text-white">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <div key={idx} className="overflow-hidden rounded-lg border border-white/10">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="text-sm font-medium text-white">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-gray-500 transition-transform",
                        openFaq === idx && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaq === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-3 text-sm leading-relaxed text-gray-400">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
