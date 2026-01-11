"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown } from "lucide-react"
import { getProPricing } from "@/lib/config"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface PricingPageClientProps {
  faqs: { question: string; answer: string }[]
}

export function PricingPageClient({ faqs }: PricingPageClientProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly")
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
            <h1 className="text-2xl font-bold text-white md:text-3xl">Choose Your Plan</h1>
          </div>

          {/* Billing Toggle - Inline */}
          <div className="mb-5 flex justify-center">
            <div className="inline-flex items-center gap-1 text-sm">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`rounded-full px-3 py-1 transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`rounded-full px-3 py-1 transition-all ${
                  billingPeriod === "yearly"
                    ? "bg-white/10 text-white"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                Annually
              </button>
              {billingPeriod === "yearly" && (
                <span className="ml-1 text-xs text-green-400">Save 25%</span>
              )}
            </div>
          </div>

          {/* Pricing Cards - Ultra Compact */}
          <div className="mx-auto mb-4 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
            {/* Free Plan */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="mb-3 text-base font-semibold text-white">Free</h3>

              <div className="mb-2 text-4xl font-bold text-white">Free</div>

              <Link href="/interview">
                <Button
                  variant="outline"
                  className="mb-4 w-full border-white/20 text-white hover:bg-white/10"
                >
                  Get Started
                </Button>
              </Link>

              <p className="mb-2 text-xs text-gray-400">Try before you commit.</p>

              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-gray-500" />
                  20+ problems, unlimited practice
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-gray-500" />2 full interview scenarios
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

              <Link href="/upgrade">
                <Button className="bg-accent hover:bg-accent/90 mb-4 w-full font-semibold text-black">
                  Subscribe
                </Button>
              </Link>

              <p className="mb-2 text-xs text-gray-400">Everything you need to get hired.</p>

              <p className="mb-2 text-xs text-gray-500">Everything in Free, plus...</p>
              <ul className="space-y-1.5 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Check className="text-accent h-3.5 w-3.5" />
                  350+ problems/month
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

          {/* Trust - Single line */}
          <p className="mb-8 text-center text-xs text-gray-600">
            30-day money-back guarantee · Cancel anytime · Used by engineers at Google, Meta, Amazon
          </p>
        </div>
      </section>

      {/* Comparison Stats - Compact */}
      <section className="bg-background border-t border-white/5 py-8">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-accent text-2xl font-bold">$0.63</div>
                <div className="text-xs text-gray-500">per day (yearly)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">350+</div>
                <div className="text-xs text-gray-500">problems/month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">29%</div>
                <div className="text-xs text-gray-500">cheaper than LeetCode</div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
