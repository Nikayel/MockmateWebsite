"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GridBackground } from "@/components/GridBackground"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Crown, Sparkles, ArrowRight, Infinity, Shield, TrendingUp, Users, Zap, ChevronDown } from "lucide-react"
import { PRICING_CONFIG, getProPricing } from "@/lib/config"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// FAQ data
const faqs = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. You'll continue to have access to Pro features until the end of your billing period. No questions asked."
  },
  {
    question: "Is there a free trial?",
    answer: "The free plan gives you 2 interview scenarios per month with full AI feedback. This lets you experience the product before upgrading. No credit card required."
  },
  {
    question: "How does billing work?",
    answer: "Pro subscriptions can be billed monthly ($25/mo) or yearly ($225/year, saving you $75). Yearly plans are charged as a one-time payment for 12 months of access."
  },
  {
    question: "What if I'm not satisfied?",
    answer: "We offer a 30-day money-back guarantee. If you're not completely satisfied with Pro, email us and we'll refund your payment in full."
  },
  {
    question: "How is this different from LeetCode Premium?",
    answer: "LeetCode gives you problems. We give you a system. Our spaced repetition algorithm schedules reviews at the optimal time for long-term retention, plus you get AI-powered mock interviews that feel like the real thing. And we're 29% cheaper."
  },
  {
    question: "What counts as a 'scenario'?",
    answer: "A scenario is one AI interview session. Each scenario includes 10+ DSA problems that you can practice unlimited times. Only starting a new scenario counts against your monthly limit."
  }
]

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const proPricing = getProPricing('website')

  const currentProPrice = billingPeriod === 'yearly'
    ? proPricing.yearly
    : proPricing.monthly

  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        <GridBackground />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-neural/20 text-neural border-neural/30 mb-6 px-4 py-2">
              <TrendingUp className="w-4 h-4 mr-2 inline" />
              Join 2,000+ developers practicing smarter
            </Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              Land Your Dream Job
              <span className="block mt-2 bg-gradient-to-r from-accent via-neural to-accent bg-clip-text text-transparent">
                For Less Than Coffee
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
              LeetCode Premium costs $35/mo. We give you more for less.
            </p>
            <p className="text-gray-500 mb-8">
              Start free, upgrade when you're ready. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="pb-8 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <div className="relative inline-flex items-center gap-3 p-1.5 rounded-full bg-white/5 border border-white/10">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  "relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  billingPeriod === 'monthly'
                    ? "text-black bg-white"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn(
                  "relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  billingPeriod === 'yearly'
                    ? "text-black bg-white"
                    : "text-gray-400 hover:text-white"
                )}
              >
                Yearly
              </button>
              <AnimatePresence>
                {billingPeriod === 'yearly' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    className="absolute -right-24 md:-right-28 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30"
                  >
                    Save 25%
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Free Plan */}
              <motion.div
                className="relative rounded-3xl p-8 md:p-10 border bg-gray-900/30 border-white/10 hover:border-white/20 transition-all duration-300"
                whileHover={{ y: -4 }}
              >
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-6 h-6 text-gray-400" />
                    <h3 className="text-2xl font-heading font-bold text-white">Free</h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black text-white">$0</span>
                  </div>
                  <p className="text-gray-400">Try Skillon and see if it's right for you</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {PRICING_CONFIG.free.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-500" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                  {PRICING_CONFIG.free.limitations.map((limitation, idx) => (
                    <li key={`limit-${idx}`} className="flex items-start gap-3">
                      <X className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-700" />
                      <span className="text-gray-600">{limitation}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/interview">
                  <MagneticButton
                    variant="outline"
                    glowColor="none"
                    className="w-full justify-center"
                    size="lg"
                    strength={0.3}
                  >
                    Start Free
                  </MagneticButton>
                </Link>
              </motion.div>

              {/* Pro Plan */}
              <motion.div
                className="relative rounded-3xl p-8 md:p-10 border bg-gradient-to-br from-accent/10 to-neural/10 border-accent/50 hover:border-accent transition-all duration-300"
                whileHover={{ y: -4 }}
              >
                {/* Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 rounded-full bg-accent text-black text-sm font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Chosen by 87% of users
                  </span>
                </div>

                <div className="mb-6 mt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-6 h-6 text-accent" />
                    <h3 className="text-2xl font-heading font-bold text-white">Pro</h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={billingPeriod}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-5xl font-black text-accent"
                      >
                        {currentProPrice.priceDisplay}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-gray-400 text-lg">{currentProPrice.period}</span>
                    {billingPeriod === 'yearly' && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-gray-600 text-lg line-through ml-2"
                      >
                        $25/mo
                      </motion.span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{currentProPrice.billingNote}</p>
                  {billingPeriod === 'yearly' && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-green-400 text-sm mt-1 font-medium"
                    >
                      Save ${proPricing.yearly.savings}/year — that's 3 months free
                    </motion.p>
                  )}
                </div>

                {/* Value highlight */}
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Infinity className="w-5 h-5 text-accent" />
                    <span className="text-white font-semibold text-sm">Unlimited Practice</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    35 scenarios/month, each with 10+ problems. Practice unlimited times.
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {PRICING_CONFIG.pro.highlights.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/upgrade">
                  <MagneticButton
                    variant="primary"
                    glowColor="accent"
                    className="w-full justify-center group"
                    size="lg"
                    strength={0.3}
                  >
                    Get Hired Faster
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </MagneticButton>
                </Link>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Shield className="w-3.5 h-3.5 text-green-500" />
                  <span>30-day money-back guarantee</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Stats */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-heading font-bold text-white text-center mb-8">
              The Math Makes Sense
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-3xl font-bold text-accent mb-2">$0.63</div>
                <div className="text-gray-400 text-sm">per day with yearly plan</div>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-3xl font-bold text-neural mb-2">350+</div>
                <div className="text-gray-400 text-sm">problems unlocked per month</div>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">29%</div>
                <div className="text-gray-400 text-sm">cheaper than LeetCode Premium</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-black border-t border-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-heading font-bold text-white text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-800 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-900/50 transition-colors"
                  >
                    <span className="text-white font-medium">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-gray-500 transition-transform",
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
                        <p className="px-6 pb-4 text-gray-400 leading-relaxed">
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

      {/* Bottom Trust Signals */}
      <section className="py-12 bg-black border-t border-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-6 text-gray-500 text-sm flex-wrap">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-green-500" />
                30-day money-back guarantee
              </span>
              <span className="hidden md:inline">•</span>
              <span>Cancel anytime</span>
              <span className="hidden md:inline">•</span>
              <span>No hidden fees</span>
            </div>
            <p className="text-gray-600 text-xs">
              Trusted by engineers at Google, Meta, Amazon, and 50+ other companies
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
