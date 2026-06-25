"use client"

import { useState } from "react"
import { MagneticButton } from "@/components/ui/magnetic-button"
import {
  Check,
  X,
  Zap,
  Crown,
  Sparkles,
  ArrowRight,
  Infinity,
  Shield,
  TrendingUp,
  Users,
  Building2,
} from "lucide-react"
import { PRICING_CONFIG, getProPricing } from "@/lib/config"
import { trackEvent } from "@/lib/analytics"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import { cn } from "@/lib/utils"

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly")
  const proPricing = getProPricing("website")

  const currentProPrice = billingPeriod === "yearly" ? proPricing.yearly : proPricing.monthly

  return (
    <section id="pricing" className="bg-background relative overflow-hidden py-12 md:py-16">
      <div className="relative z-10 container mx-auto px-4">
        {/* Section Header - Compact */}
        <ScrollReveal className="mb-6 text-center md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="border-neural/30 bg-neural/5 text-neural mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              Join 2,000+ developers
            </span>
            <h2 className="font-heading text-foreground mb-3 text-2xl font-bold md:text-3xl lg:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground mx-auto max-w-xl text-sm md:text-base">
              Start free, upgrade when you&apos;re ready. Cancel anytime.
            </p>
          </motion.div>
        </ScrollReveal>

        {/* Billing Toggle - Compact */}
        <ScrollReveal className="mb-6 flex justify-center">
          <div className="bg-muted border-border relative inline-flex items-center gap-1 rounded-full border p-1">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={cn(
                "relative rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300",
                billingPeriod === "monthly"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {billingPeriod === "monthly" && (
                <motion.div
                  layoutId="billingToggle"
                  className="bg-primary absolute inset-0 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Monthly</span>
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={cn(
                "relative rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-300",
                billingPeriod === "yearly"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {billingPeriod === "yearly" && (
                <motion.div
                  layoutId="billingToggle"
                  className="bg-primary absolute inset-0 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Yearly</span>
            </button>
            {/* Savings Badge */}
            <AnimatePresence>
              {billingPeriod === "yearly" && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  className="absolute -right-20 rounded-full border border-green-500/30 bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400"
                >
                  Save 25%
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </ScrollReveal>

        {/* Pricing Cards - Compact */}
        <div className="mx-auto mb-8 grid max-w-4xl grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
          {/* Free Plan */}
          <ScrollReveal delay={0}>
            <motion.div
              className="bg-card border-border hover:border-accent/30 group relative flex h-full flex-col rounded-xl border p-4 transition-all duration-300 md:p-5"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Plan Header */}
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="text-neural h-4 w-4" />
                  <h3 className="font-heading text-foreground text-lg font-bold">
                    {PRICING_CONFIG.free.name}
                  </h3>
                </div>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-foreground text-3xl font-bold">
                    {PRICING_CONFIG.free.priceDisplay}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">{PRICING_CONFIG.free.description}</p>
              </div>

              {/* Features */}
              <ul className="mb-4 flex-grow space-y-2">
                {PRICING_CONFIG.free.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                    <Check className="text-neural mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
                {PRICING_CONFIG.free.limitations.slice(0, 2).map((limitation, idx) => (
                  <li key={`limit-${idx}`} className="flex items-start gap-2 text-sm">
                    <X className="text-muted-foreground/50 mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span className="text-muted-foreground/60">{limitation}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                href="/interview"
                className="mt-auto block"
                onClick={() =>
                  trackEvent("cta_click", {
                    location: "home_pricing_free",
                    destination: "/interview",
                  })
                }
              >
                <MagneticButton
                  variant="outline"
                  glowColor="none"
                  className="w-full justify-center text-sm"
                  size="md"
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
              className="bg-accent/5 border-accent/40 hover:border-accent group relative flex h-full flex-col rounded-xl border p-4 transition-all duration-300 md:p-5"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-accent flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-black">
                  <Users className="h-3 w-3" />
                  Most Popular
                </span>
              </div>

              {/* Plan Header */}
              <div className="mt-2 mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Crown className="text-accent h-4 w-4" />
                  <h3 className="font-heading text-foreground text-lg font-bold">Pro</h3>
                </div>
                <div className="mb-1 flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={billingPeriod}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-accent text-3xl font-bold"
                    >
                      {currentProPrice.priceDisplay}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-muted-foreground text-sm">{currentProPrice.period}</span>
                  {billingPeriod === "yearly" && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-muted-foreground/50 ml-1 text-sm line-through"
                    >
                      $25
                    </motion.span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">{currentProPrice.billingNote}</p>
                {billingPeriod === "yearly" && (
                  <p className="mt-1 text-xs font-medium text-green-400">
                    Save ${proPricing.yearly.savings}/year
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="mb-4 flex-grow space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <Infinity className="text-accent mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span className="text-foreground font-medium">350+ problems/month</span>
                </li>
                {PRICING_CONFIG.pro.highlights.slice(0, 4).map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                    <Check className="text-accent mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                href="/upgrade"
                className="mt-auto block"
                onClick={() =>
                  trackEvent("cta_click", {
                    location: "home_pricing_pro",
                    destination: "/upgrade",
                    billing_period: billingPeriod,
                  })
                }
              >
                <MagneticButton
                  variant="primary"
                  glowColor="accent"
                  className="group w-full justify-center text-sm"
                  size="md"
                  strength={0.3}
                >
                  Get Pro
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </MagneticButton>
              </Link>

              {/* Guarantee badge */}
              <div className="text-muted-foreground mt-3 flex items-center justify-center gap-1.5 text-[10px]">
                <Shield className="h-3 w-3 text-green-500" />
                <span>30-day money-back</span>
              </div>
            </motion.div>
          </ScrollReveal>

          {/* Enterprise Plan */}
          <ScrollReveal delay={0.2}>
            <motion.div
              className="bg-card border-border hover:border-accent/30 group relative flex h-full flex-col rounded-xl border p-4 transition-all duration-300 md:p-5"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Plan Header */}
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Building2 className="text-neural h-4 w-4" />
                  <h3 className="font-heading text-foreground text-lg font-bold">
                    {PRICING_CONFIG.enterprise.name}
                  </h3>
                </div>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-foreground text-3xl font-bold">
                    {PRICING_CONFIG.enterprise.priceDisplay}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {PRICING_CONFIG.enterprise.description}
                </p>
              </div>

              {/* Features */}
              <ul className="mb-4 flex-grow space-y-2">
                {PRICING_CONFIG.enterprise.features.slice(0, 5).map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm">
                    <Check className="text-neural mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                href="mailto:enterprise@codesparring.dev?subject=CodeSparring Enterprise Inquiry"
                className="mt-auto block"
              >
                <MagneticButton
                  variant="outline"
                  glowColor="none"
                  className="w-full justify-center text-sm"
                  size="md"
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
            <div className="text-muted-foreground flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-green-500" />
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
