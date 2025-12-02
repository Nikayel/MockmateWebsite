"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { Check, Zap, Crown, Sparkles } from "lucide-react"
import { PRICING_CONFIG, getProPricing } from "@/lib/config"
import Link from "next/link"
import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"

// Flatten the pro config for website
const proPlan = {
  ...getProPricing('website'),
  features: PRICING_CONFIG.pro.features,
  buttonText: PRICING_CONFIG.pro.buttonText,
  popular: PRICING_CONFIG.pro.popular,
}

const plans = [PRICING_CONFIG.free, proPlan]

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-24 md:py-32 bg-black overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-neural/5 to-black pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,217,255,0.03),transparent_50%)]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <ScrollReveal className="text-center mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neural/30 bg-neural/5 text-neural text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Simple & Transparent
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-black text-white mb-6">
              Invest in Your
              <br />
              <span className="bg-gradient-to-r from-accent via-neural to-accent bg-clip-text text-transparent">
                Career Success
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Start free and scale when you're ready.
              <br className="hidden sm:block" />
              No credit card required.
            </p>
          </motion.div>
        </ScrollReveal>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto mb-12">
          {plans.map((plan, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <motion.div
                className={`relative rounded-3xl p-8 md:p-10 border transition-all duration-500 group ${
                  plan.popular
                    ? "bg-gradient-to-br from-accent/10 to-neural/10 border-accent/50 hover:border-accent hover:shadow-[0_0_50px_rgba(0,217,255,0.2)]"
                    : "glass-minimal border-white/[0.08] hover:border-accent/30 hover:shadow-[0_0_40px_rgba(0,217,255,0.1)]"
                }`}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                {/* Plan Badge */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    {plan.popular ? (
                      <Crown className="w-6 h-6 text-accent" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-neural" />
                    )}
                    <h3 className="text-2xl font-heading font-bold text-white">{plan.name}</h3>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-5xl md:text-6xl font-black ${
                      plan.popular ? "text-accent" : "text-white"
                    }`}>
                      {plan.priceDisplay}
                    </span>
                    {plan.period && (
                      <span className="text-gray-400 text-lg">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <motion.li
                      key={featureIndex}
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: featureIndex * 0.05 }}
                    >
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        plan.popular ? "text-accent" : "text-neural"
                      }`} />
                      <span className="text-gray-300 leading-relaxed">{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href={plan.popular ? "/upgrade" : "/interview"} className="block">
                  <MagneticButton
                    variant={plan.popular ? "primary" : "outline"}
                    glowColor={plan.popular ? "accent" : "none"}
                    className="w-full justify-center"
                    size="lg"
                    strength={0.3}
                  >
                    {plan.buttonText}
                  </MagneticButton>
                </Link>

                {/* Decorative corner */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl pointer-events-none" />
                )}
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom Note */}
        <ScrollReveal>
          <div className="text-center">
            <p className="text-gray-500 text-sm md:text-base">
              7-day free trial included • Cancel anytime • No hidden fees
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
