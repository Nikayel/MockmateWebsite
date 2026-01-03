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
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const proPricing = getProPricing('website')

  const currentProPrice = billingPeriod === 'yearly'
    ? proPricing.yearly
    : proPricing.monthly

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Pricing Section - Above the fold */}
      <section className="pt-20 pb-8">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Minimal Header */}
          <div className="text-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Choose Your Plan
            </h1>
          </div>

          {/* Billing Toggle - Inline */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex items-center gap-1 text-sm">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-3 py-1 rounded-full transition-all ${
                  billingPeriod === 'monthly' ? "text-white bg-white/10" : "text-gray-500 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-3 py-1 rounded-full transition-all ${
                  billingPeriod === 'yearly' ? "text-white bg-white/10" : "text-gray-500 hover:text-white"
                }`}
              >
                Annually
              </button>
              {billingPeriod === 'yearly' && (
                <span className="text-green-400 text-xs ml-1">Save 25%</span>
              )}
            </div>
          </div>

          {/* Pricing Cards - Ultra Compact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 max-w-2xl mx-auto">

            {/* Free Plan */}
            <div className="rounded-xl p-5 border bg-white/[0.02] border-white/10">
              <h3 className="text-base font-semibold text-white mb-3">Free</h3>

              <div className="text-4xl font-bold text-white mb-2">Free</div>

              <Link href="/interview">
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 mb-4"
                >
                  Get Started
                </Button>
              </Link>

              <p className="text-gray-400 text-xs mb-2">Try before you commit.</p>

              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-gray-500" />
                  2 interview scenarios/month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-gray-500" />
                  All 200+ DSA problems
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-gray-500" />
                  AI interviewer feedback
                </li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="rounded-xl p-5 border-2 bg-gradient-to-br from-accent/5 to-transparent border-accent/50">
              <h3 className="text-base font-semibold text-white mb-3">Pro</h3>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-accent">
                  {currentProPrice.priceDisplay}
                </span>
                <span className="text-gray-400 text-sm">{currentProPrice.period}</span>
              </div>

              <Link href="/upgrade">
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-black font-semibold mb-4"
                >
                  Subscribe
                </Button>
              </Link>

              <p className="text-gray-400 text-xs mb-2">Everything you need to get hired.</p>

              <p className="text-xs text-gray-500 mb-2">Everything in Free, plus...</p>
              <ul className="space-y-1.5 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  350+ problems/month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  Spaced repetition scheduling
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  Personalized study roadmap
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-accent" />
                  Priority support
                </li>
              </ul>
            </div>
          </div>

          {/* Trust - Single line */}
          <p className="text-center text-xs text-gray-600 mb-8">
            30-day money-back guarantee · Cancel anytime · Used by engineers at Google, Meta, Amazon
          </p>
        </div>
      </section>

      {/* Comparison Stats - Compact */}
      <section className="py-8 bg-background border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">$0.63</div>
                <div className="text-gray-500 text-xs">per day (yearly)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">350+</div>
                <div className="text-gray-500 text-xs">problems/month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">29%</div>
                <div className="text-gray-500 text-xs">cheaper than LeetCode</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 bg-background border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-white text-center mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/10 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="text-white text-sm font-medium">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-gray-500 transition-transform",
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
                        <p className="px-4 pb-3 text-gray-400 text-sm leading-relaxed">
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
