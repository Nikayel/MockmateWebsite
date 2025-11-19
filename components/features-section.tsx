"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { BentoGrid, BentoFeature } from "@/components/ui/bento-grid"
import { Brain, Code2, MessageSquare, BarChart3, Zap, Shield, Play, TrendingUp } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import Image from "next/image"

const features = [
  {
    icon: <Brain className="w-8 h-8" />,
    title: "AI-Powered Interviewer",
    description:
      "Practice with an intelligent AI that adapts to your skill level and provides realistic interview scenarios tailored to your target companies.",
    span: "wide" as const,
    metric: {
      value: "98%",
      label: "Accuracy Rate",
    },
  },
  {
    icon: <Code2 className="w-8 h-8" />,
    title: "Real-Time Coding Partner",
    description: "Get instant feedback and suggestions as you code, just like having a senior developer reviewing your work.",
    span: "default" as const,
    features: [
      "Live code analysis",
      "Smart suggestions",
      "Error detection"
    ],
  },
  {
    icon: <MessageSquare className="w-8 h-8" />,
    title: "Natural Conversations",
    description:
      "Engage in authentic technical discussions about your code, architecture decisions, and problem-solving approach.",
    span: "default" as const,
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: "Performance Analytics",
    description: "Track your progress with detailed metrics on coding speed, accuracy, and problem-solving efficiency across multiple sessions.",
    span: "tall" as const,
    metric: {
      value: "5x",
      label: "Faster Improvement",
    },
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: "Instant Feedback",
    description: "Receive immediate insights on code quality, optimization opportunities, and best practices that matter.",
    span: "default" as const,
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: "Secure & Private",
    description:
      "Your code and practice sessions remain completely private and secure. Practice in VS Code or on the web with enterprise-grade security.",
    span: "default" as const,
    features: [
      "Local-first architecture",
      "End-to-end encryption",
      "Secure cloud storage"
    ],
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 md:py-32 bg-black overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-accent/5 to-black pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <ScrollReveal className="text-center mb-16 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" />
              Built for Success
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-black text-white mb-6">
              Everything You Need
              <br />
              <span className="bg-gradient-to-r from-accent via-neural to-accent bg-clip-text text-transparent">
                To Ace Interviews
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Powerful features designed to accelerate your interview preparation
              <br className="hidden sm:block" />
              and help you land your dream role.
            </p>
          </motion.div>
        </ScrollReveal>

        {/* Bento Grid */}
        <ScrollReveal>
          <BentoGrid className="mb-20">
            {features.map((feature, index) => (
              <BentoFeature
                key={index}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                span={feature.span}
                metric={feature.metric}
                features={feature.features}
                index={index}
              />
            ))}
          </BentoGrid>
        </ScrollReveal>

        {/* Interactive Demo Section */}
        <ScrollReveal>
          <motion.div
            className="glass-minimal rounded-3xl p-8 md:p-12 border border-accent/20 max-w-5xl mx-auto group hover:border-accent/40 transition-all duration-500"
            whileHover={{ y: -4 }}
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
                See MockMate in Action
              </h3>
              <p className="text-lg text-gray-400">
                Watch how our AI interviewer provides real-time feedback
              </p>
            </div>

            <div className="relative aspect-video bg-gradient-to-br from-card to-card/50 rounded-2xl overflow-hidden mb-8 group-hover:shadow-[0_0_50px_rgba(0,217,255,0.15)] transition-all duration-500">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/FeedbackSummeryMockup-GFSpAQsPcwjnrAW21qXk63EEXS2Nv4.png"
                alt="MockMate Feedback Summary Interface"
                fill
                className="object-contain p-4 opacity-90 group-hover:opacity-100 transition-opacity duration-500"
              />

              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/interview">
                <MagneticButton
                  size="lg"
                  variant="primary"
                  glowColor="accent"
                  className="group/btn"
                >
                  <Play className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                  Try on Web
                </MagneticButton>
              </Link>
              <Link href="/install">
                <MagneticButton
                  size="lg"
                  variant="outline"
                  glowColor="none"
                  className="group/btn"
                >
                  <Code2 className="w-5 h-5" />
                  Download for VS Code
                </MagneticButton>
              </Link>
            </div>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  )
}
