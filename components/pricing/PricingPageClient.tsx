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
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="mb-3 text-base font-semibold text-white">Free</h3>

              <div className="mb-2 text-4xl font-bold text-white">Free</div>

              <Link
                href="/interview"
                onClick={() =>
                  trackEvent("cta_click", { location: "pricing_free", destination: "/interview" })
                }
              >
                <Button
                  variant="outline"
                  className="mb-4 w-full border-white/20 text-white hover:bg-white/10"
                >
                  Start practicing free
                </Button>
              </Link>

              <p className="mb-2 text-xs text-gray-400">
                Try before you commit. Includes free Python, SQL, and System Design courses.
              </p>

              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-gray-500" />
                  20+ problems, unlimited practice
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-gray-500" />
                  {/* The number is the enforced quota, not copy: it must move with
                      PRICING_CONFIG or this page advertises a limit the server no
                      longer grants. */}
                  {`${PRICING_CONFIG.free.sessionsPerMonth} full interview sessions/month`}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-gray-500" />
                  AI interviewer feedback
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="from-accent/5 border-accent/50 rounded-xl border-2 bg-gradient-to-br to-transparent p-5">
              <h3 className="mb-3 text-base font-semibold text-white">Pro</h3>

              <div className="mb-2 flex items-baseline gap-1">
                <span className="text-accent text-4xl font-bold">
                  {currentProPrice.priceDisplay}
                </span>
                <span className="text-sm text-gray-400">{currentProPrice.period}</span>
              </div>

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
                <Button className="bg-accent hover:bg-accent/90 mb-4 w-full font-semibold text-black">
                  Subscribe
                </Button>
              </Link>

              <p className="mb-2 text-xs text-gray-400">Everything you need to get hired.</p>

              <p className="mb-2 text-xs text-gray-500">Everything in Free, plus...</p>
              <ul className="space-y-1.5 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Check className="text-accent h-3.5 w-3.5" />
                  {`${PRICING_CONFIG.pro.sessionsPerMonth} sessions/month`}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-accent h-3.5 w-3.5" />
                  Spaced repetition scheduling
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-accent h-3.5 w-3.5" />
                  Personalized study roadmap
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-accent h-3.5 w-3.5" />
                  Priority support
                </li>
              </ul>
            </div>
          </div>

          {/* Trust line. The third clause used to read "Used by Palantir & FAANG
              candidates", an unsubstantiated usage claim sitting directly above a
              purchase button. The two guarantees are real and verifiable, so the
              line keeps those and drops the claim until there are users to cite. */}
          <p className="mb-8 text-center text-xs text-gray-600">
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
