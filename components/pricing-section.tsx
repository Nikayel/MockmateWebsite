"use client"

import { useState } from "react"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Check, X, Crown, Sparkles, Building2, ArrowRight, Infinity, Shield, TrendingUp, Users } from "lucide-react"
import { PRICING_CONFIG, getProPricing } from "@/lib/config"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import { cn } from "@/lib/utils"

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const proPricing = getProPricing('website')

  const currentProPrice = billingPeriod === 'yearly'
    ? proPricing.yearly
    : proPricing.monthly

  return (
    <section id="pricing" className="relative py-16 md:py-20 bg-black overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-neural/5 to-black pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,217,255,0.03),transparent_50%)]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <ScrollReveal className="text-center mb-8 md:mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neural/30 bg-neural/5 text-neural text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" />
              Join 2,000+ developers practicing smarter
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-black text-white mb-6">
              Land Your Dream Job
              <br />
              <span className="bg-gradient-to-r from-accent via-neural to-accent bg-clip-text text-transparent">
                For Less Than Coffee
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              LeetCode Premium costs $35/mo. We give you more for less. Start free, upgrade when you&apos;re ready.
            </p>
          </motion.div>
        </ScrollReveal>

        {/* Billing Toggle */}
        <ScrollReveal className="flex justify-center mb-8">
          <div className="relative inline-flex items-center gap-3 p-1.5 rounded-full bg-white/5 border border-white/10">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                "relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                billingPeriod === 'monthly'
                  ? "text-black"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {billingPeriod === 'monthly' && (
                <motion.div
                  layoutId="billingToggle"
                  className="absolute inset-0 bg-white rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Monthly</span>
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={cn(
                "relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                billingPeriod === 'yearly'
                  ? "text-black"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {billingPeriod === 'yearly' && (
                <motion.div
                  layoutId="billingToggle"
                  className="absolute inset-0 bg-white rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Yearly</span>
            </button>
            {/* Savings Badge */}
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
        </ScrollReveal>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mb-10">
          {/* Free Plan */}
          <ScrollReveal delay={0}>
            <motion.div
              className="relative rounded-2xl p-6 md:p-8 border glass-minimal border-white/[0.08] hover:border-accent/30 hover:shadow-[0_0_40px_rgba(0,217,255,0.1)] transition-all duration-500 group h-full flex flex-col"
              whileHover={{ y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Plan Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6 text-neural" />
                  <h3 className="text-2xl font-heading font-bold text-white">{PRICING_CONFIG.free.name}</h3>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl md:text-6xl font-black text-white">
                    {PRICING_CONFIG.free.priceDisplay}
                  </span>
                </div>
                <p className="text-gray-400">{PRICING_CONFIG.free.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                {PRICING_CONFIG.free.features.map((feature, featureIndex) => (
                  <motion.li
                    key={featureIndex}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: featureIndex * 0.05 }}
                  >
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-neural" />
                    <span className="text-gray-300 leading-relaxed">{feature}</span>
                  </motion.li>
                ))}
                {/* Show limitations */}
                {PRICING_CONFIG.free.limitations.map((limitation, idx) => (
                  <motion.li
                    key={`limit-${idx}`}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (PRICING_CONFIG.free.features.length + idx) * 0.05 }}
                  >
                    <X className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-600" />
                    <span className="text-gray-500 leading-relaxed">{limitation}</span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href="/interview" className="block mt-auto">
                <MagneticButton
                  variant="outline"
                  glowColor="none"
                  className="w-full justify-center"
                  size="lg"
                  strength={0.3}
                >
                  {PRICING_CONFIG.free.buttonText}
                </MagneticButton>
              </Link>
            </motion.div>
          </ScrollReveal>

          {/* Pro Plan */}
          <ScrollReveal delay={0.1}>
            <motion.div
              className="relative rounded-2xl p-6 md:p-8 border bg-gradient-to-br from-accent/10 to-neural/10 border-accent/50 hover:border-accent hover:shadow-[0_0_50px_rgba(0,217,255,0.2)] transition-all duration-500 group h-full flex flex-col"
              whileHover={{ y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Popular Badge with social proof */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1.5 rounded-full bg-accent text-black text-sm font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Chosen by 87% of users
                </span>
              </div>

              {/* Plan Header */}
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
                      className="text-5xl md:text-6xl font-black text-accent"
                    >
                      {currentProPrice.priceDisplay}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-gray-400 text-lg">{currentProPrice.period}</span>
                  {/* Price anchoring - show monthly crossed out when yearly */}
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
                <p className="text-gray-400 text-sm">
                  {currentProPrice.billingNote}
                </p>
                {billingPeriod === 'yearly' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-green-400 text-sm mt-1 font-medium"
                  >
                    Save ${proPricing.yearly.savings}/year — that&apos;s 3 months free
                  </motion.p>
                )}
              </div>

              {/* Value Props - Unique to Pro */}
              <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Infinity className="w-5 h-5 text-accent" />
                  <span className="text-white font-semibold text-sm">Unlimited Practice</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  35 scenarios/month, each with 10+ problems. Practice each problem unlimited times—only scenarios count.
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-grow">
                {PRICING_CONFIG.pro.highlights.map((feature, featureIndex) => (
                  <motion.li
                    key={featureIndex}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: featureIndex * 0.05 }}
                  >
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent" />
                    <span className="text-gray-300 leading-relaxed text-sm">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href="/upgrade" className="block mt-auto">
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

              {/* Guarantee badge */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                <span>30-day money-back guarantee</span>
              </div>

              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl pointer-events-none" />
            </motion.div>
          </ScrollReveal>

          {/* Enterprise Plan */}
          <ScrollReveal delay={0.2}>
            <motion.div
              className="relative rounded-2xl p-6 md:p-8 border glass-minimal border-white/[0.08] hover:border-accent/30 hover:shadow-[0_0_40px_rgba(0,217,255,0.1)] transition-all duration-500 group h-full flex flex-col"
              whileHover={{ y: -8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Plan Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-6 h-6 text-neural" />
                  <h3 className="text-2xl font-heading font-bold text-white">{PRICING_CONFIG.enterprise.name}</h3>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl md:text-6xl font-black text-white">
                    {PRICING_CONFIG.enterprise.priceDisplay}
                  </span>
                </div>
                <p className="text-gray-400">{PRICING_CONFIG.enterprise.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-grow">
                {PRICING_CONFIG.enterprise.features.map((feature, featureIndex) => (
                  <motion.li
                    key={featureIndex}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: featureIndex * 0.05 }}
                  >
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-neural" />
                    <span className="text-gray-300 leading-relaxed">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href="mailto:enterprise@skillon.dev?subject=Skillon Enterprise Inquiry" className="block mt-auto">
                <MagneticButton
                  variant="outline"
                  glowColor="none"
                  className="w-full justify-center"
                  size="lg"
                  strength={0.3}
                >
                  {PRICING_CONFIG.enterprise.buttonText}
                </MagneticButton>
              </Link>
            </motion.div>
          </ScrollReveal>
        </div>

        {/* Value Explainer with ROI */}
        <ScrollReveal>
          <div className="max-w-4xl mx-auto mb-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-heading font-bold text-white mb-2">
                The Math Makes Sense
              </h3>
              <p className="text-gray-400">
                A $10K salary increase pays for 33 years of Pro
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center"
              >
                <div className="text-3xl font-bold text-accent mb-2">$0.63</div>
                <div className="text-gray-400 text-sm">per day with yearly plan</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center"
              >
                <div className="text-3xl font-bold text-neural mb-2">350+</div>
                <div className="text-gray-400 text-sm">problems unlocked per month</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center"
              >
                <div className="text-3xl font-bold text-green-400 mb-2">29%</div>
                <div className="text-gray-400 text-sm">cheaper than LeetCode Premium</div>
              </motion.div>
            </div>
          </div>
        </ScrollReveal>

        {/* Bottom Trust Signals */}
        <ScrollReveal>
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-6 text-gray-500 text-sm">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-green-500" />
                30-day money-back
              </span>
              <span>•</span>
              <span>Cancel anytime</span>
              <span>•</span>
              <span>No hidden fees</span>
            </div>
            <p className="text-gray-600 text-xs">
              Trusted by engineers at Google, Meta, Amazon, and 50+ other companies
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
