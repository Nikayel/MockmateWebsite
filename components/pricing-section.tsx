"use client"

import { useState } from "react"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Check, X, Zap, Crown, Sparkles, ArrowRight, Infinity, Shield, TrendingUp, Users, Building2 } from "lucide-react"
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
    <section id="pricing" className="relative py-12 md:py-16 bg-background overflow-hidden">

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header - Compact */}
        <ScrollReveal className="text-center mb-6 md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neural/30 bg-neural/5 text-neural text-xs font-medium mb-4">
              <TrendingUp className="w-3.5 h-3.5" />
              Join 2,000+ developers
            </span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-foreground mb-3">
              Simple, Transparent Pricing
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Start free, upgrade when you&apos;re ready. Cancel anytime.
            </p>
          </motion.div>
        </ScrollReveal>

        {/* Billing Toggle - Compact */}
        <ScrollReveal className="flex justify-center mb-6">
          <div className="relative inline-flex items-center gap-1 p-1 rounded-full bg-muted border border-border">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={cn(
                "relative px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                billingPeriod === 'monthly'
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {billingPeriod === 'monthly' && (
                <motion.div
                  layoutId="billingToggle"
                  className="absolute inset-0 bg-primary rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Monthly</span>
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={cn(
                "relative px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                billingPeriod === 'yearly'
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {billingPeriod === 'yearly' && (
                <motion.div
                  layoutId="billingToggle"
                  className="absolute inset-0 bg-primary rounded-full"
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
                  className="absolute -right-20 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-semibold border border-green-500/30"
                >
                  Save 25%
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </ScrollReveal>

        {/* Pricing Cards - Compact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 max-w-4xl mx-auto mb-8">
          {/* Free Plan */}
          <ScrollReveal delay={0}>
            <motion.div
              className="relative rounded-xl p-4 md:p-5 border bg-card border-border hover:border-accent/30 transition-all duration-300 group h-full flex flex-col"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Plan Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-neural" />
                  <h3 className="text-lg font-heading font-bold text-foreground">{PRICING_CONFIG.free.name}</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-foreground">
                    {PRICING_CONFIG.free.priceDisplay}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{PRICING_CONFIG.free.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4 flex-grow">
                {PRICING_CONFIG.free.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-neural" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
                {PRICING_CONFIG.free.limitations.slice(0, 2).map((limitation, idx) => (
                  <li key={`limit-${idx}`} className="flex items-start gap-2 text-sm">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground/50" />
                    <span className="text-muted-foreground/60">{limitation}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href="/interview" className="block mt-auto">
                <MagneticButton
                  variant="outline"
                  glowColor="none"
                  className="w-full justify-center text-sm"
                  size="default"
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
              className="relative rounded-xl p-4 md:p-5 border bg-accent/5 border-accent/40 hover:border-accent transition-all duration-300 group h-full flex flex-col"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full bg-accent text-black text-xs font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Most Popular
                </span>
              </div>

              {/* Plan Header */}
              <div className="mb-4 mt-2">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-accent" />
                  <h3 className="text-lg font-heading font-bold text-foreground">Pro</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={billingPeriod}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-3xl font-bold text-accent"
                    >
                      {currentProPrice.priceDisplay}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-muted-foreground text-sm">{currentProPrice.period}</span>
                  {billingPeriod === 'yearly' && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-muted-foreground/50 text-sm line-through ml-1"
                    >
                      $25
                    </motion.span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentProPrice.billingNote}
                </p>
                {billingPeriod === 'yearly' && (
                  <p className="text-green-400 text-xs mt-1 font-medium">
                    Save ${proPricing.yearly.savings}/year
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4 flex-grow">
                <li className="flex items-start gap-2 text-sm">
                  <Infinity className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
                  <span className="text-foreground font-medium">35 scenarios/month</span>
                </li>
                {PRICING_CONFIG.pro.highlights.slice(0, 4).map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-accent" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href="/upgrade" className="block mt-auto">
                <MagneticButton
                  variant="primary"
                  glowColor="accent"
                  className="w-full justify-center group text-sm"
                  size="default"
                  strength={0.3}
                >
                  Get Pro
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </MagneticButton>
              </Link>

              {/* Guarantee badge */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <Shield className="w-3 h-3 text-green-500" />
                <span>30-day money-back</span>
              </div>
            </motion.div>
          </ScrollReveal>

          {/* Enterprise Plan */}
          <ScrollReveal delay={0.2}>
            <motion.div
              className="relative rounded-xl p-4 md:p-5 border bg-card border-border hover:border-accent/30 transition-all duration-300 group h-full flex flex-col"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Plan Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-neural" />
                  <h3 className="text-lg font-heading font-bold text-foreground">{PRICING_CONFIG.enterprise.name}</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-foreground">
                    {PRICING_CONFIG.enterprise.priceDisplay}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{PRICING_CONFIG.enterprise.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4 flex-grow">
                {PRICING_CONFIG.enterprise.features.slice(0, 5).map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-neural" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href="mailto:enterprise@skillon.dev?subject=Skillon Enterprise Inquiry" className="block mt-auto">
                <MagneticButton
                  variant="outline"
                  glowColor="none"
                  className="w-full justify-center text-sm"
                  size="default"
                  strength={0.3}
                >
                  {PRICING_CONFIG.enterprise.buttonText}
                </MagneticButton>
              </Link>
            </motion.div>
          </ScrollReveal>
        </div>

        {/* Bottom Trust Signals - Compact */}
        <ScrollReveal>
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-green-500" />
                30-day money-back
              </span>
              <span>•</span>
              <span>Cancel anytime</span>
              <span>•</span>
              <span>No hidden fees</span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
