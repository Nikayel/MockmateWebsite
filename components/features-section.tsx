"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { Brain, Code2, MessageSquare, BarChart3, Zap, Shield, Play } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import Image from "next/image"

const features = [
  {
    icon: Brain,
    title: "AI Interviewer",
    description: "Adapts to your skill level with realistic scenarios",
    color: "#00d9ff",
  },
  {
    icon: Code2,
    title: "Real-Time Feedback",
    description: "Instant suggestions as you code",
    color: "#00ff88",
  },
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description: "Discuss your approach like a real interview",
    color: "#00d9ff",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "See your improvement over time",
    color: "#00ff88",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get detailed feedback after each session",
    color: "#00d9ff",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description: "Your code stays yours",
    color: "#00ff88",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 bg-black overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950/50 to-black pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <ScrollReveal className="max-w-3xl mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-gray-500 text-sm uppercase tracking-widest mb-6">
              Why Skillon
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white mb-6 leading-tight">
              Everything you need
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ff88]">
                to ace interviews
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl">
              Practice with AI that understands code, gives meaningful feedback, and helps you improve faster.
            </p>
          </motion.div>
        </ScrollReveal>

        {/* Features Grid - Clean minimal style */}
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 mb-32">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${feature.color}10` }}
                >
                  <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>

        {/* Demo Section - Cleaner */}
        <ScrollReveal>
          <motion.div
            className="max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-[#00d9ff]/20 to-[#00ff88]/20 rounded-3xl blur-3xl opacity-50" />

              <div className="relative bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <div className="flex-1 text-center">
                    <span className="text-xs text-gray-600 font-mono">skillon.dev/interview</span>
                  </div>
                </div>

                {/* Screenshot */}
                <div className="relative aspect-video">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/FeedbackSummeryMockup-GFSpAQsPcwjnrAW21qXk63EEXS2Nv4.png"
                    alt="Skillon Feedback Interface"
                    fill
                    className="object-contain p-4"
                  />
                </div>
              </div>
            </div>

            {/* CTA below demo */}
            <div className="text-center mt-12">
              <p className="text-gray-400 mb-6">
                See how our AI provides detailed, actionable feedback
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/interview">
                  <MagneticButton
                    size="lg"
                    variant="primary"
                    glowColor="accent"
                    className="group"
                  >
                    <Play className="w-5 h-5" />
                    Try It Free
                  </MagneticButton>
                </Link>
                <Link href="/samples">
                  <MagneticButton
                    size="lg"
                    variant="outline"
                    glowColor="none"
                  >
                    View Sample Reports
                  </MagneticButton>
                </Link>
              </div>
            </div>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  )
}
