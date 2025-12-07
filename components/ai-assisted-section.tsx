"use client"

import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import { MagneticButton } from "@/components/ui/magnetic-button"
import {
  Brain,
  Building2,
  TrendingUp,
  Users,
  Zap,
  Target,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

/**
 * AIAssistedSection - Marketing content about AI-assisted interviews
 *
 * Key message: Companies are adopting AI-assisted interviews.
 * This is the future. You need to be prepared.
 */

const companies = [
  { name: "Meta", status: "AI pilot program", year: "2024" },
  { name: "Google", status: "AI tools allowed", year: "2024" },
  { name: "Amazon", status: "Evaluating AI usage", year: "2024" },
  { name: "Microsoft", status: "Copilot integration", year: "2024" },
]

const gradingCriteria = [
  {
    icon: Brain,
    title: "Understanding",
    description: "Can you explain your code? Why did you choose this approach?",
    weight: "30%",
  },
  {
    icon: Target,
    title: "Problem-Solving",
    description: "How do you break down problems? How do you debug?",
    weight: "25%",
  },
  {
    icon: Zap,
    title: "Code Quality",
    description: "Does it work? Is it efficient? Is it readable?",
    weight: "25%",
  },
  {
    icon: Users,
    title: "Communication",
    description: "Do you share your thought process? Ask clarifying questions?",
    weight: "20%",
  },
]

const notGradedOn = [
  "How often you use AI",
  "Whether you type fast",
  "Memorizing algorithms",
  "Using AI for every question",
]

export function AIAssistedSection() {
  return (
    <section className="relative py-24 bg-black overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950/80 to-black" />

      {/* Subtle accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00d9ff]/[0.03] rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00ff88]/30 bg-[#00ff88]/5 text-[#00ff88] text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" />
              The Future of Technical Interviews
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white mb-6 leading-tight">
              AI-Assisted Interviews
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ff88]">
                Are Here
              </span>
            </h2>

            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Top tech companies are rolling out AI-assisted coding interviews.
              They want to see if you can{" "}
              <span className="text-white font-medium">use AI as a tool</span>,
              not a crutch.
            </p>
          </motion.div>
        </ScrollReveal>

        {/* Company adoption */}
        <ScrollReveal>
          <motion.div
            className="mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-center text-gray-500 text-sm uppercase tracking-widest mb-6">
              Companies adopting AI-assisted interviews
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {companies.map((company, idx) => (
                <motion.div
                  key={company.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <Building2 className="h-5 w-5 text-[#00d9ff]" />
                  <div>
                    <div className="font-medium text-white">{company.name}</div>
                    <div className="text-xs text-gray-500">{company.status}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </ScrollReveal>

        {/* What you're graded on */}
        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          {/* Graded on */}
          <ScrollReveal>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle className="h-5 w-5 text-[#00ff88]" />
                <h3 className="text-2xl font-bold text-white">What You're Graded On</h3>
              </div>

              <div className="space-y-4">
                {gradingCriteria.map((criteria, idx) => (
                  <motion.div
                    key={criteria.title}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800 group hover:border-[#00d9ff]/30 transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: "#00d9ff10" }}
                    >
                      <criteria.icon className="h-6 w-6 text-[#00d9ff]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-white">{criteria.title}</h4>
                        <span className="text-xs font-medium text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded">
                          {criteria.weight}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{criteria.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </ScrollReveal>

          {/* NOT graded on */}
          <ScrollReveal>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <h3 className="text-2xl font-bold text-white">What You're NOT Graded On</h3>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
                <ul className="space-y-3">
                  {notGradedOn.map((item, idx) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 text-gray-400"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500/50" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-r from-[#00d9ff]/10 to-[#00ff88]/10 border border-[#00d9ff]/20 rounded-xl p-6">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-[#00d9ff]" />
                  The Real Test
                </h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Interviewers want to see if you can{" "}
                  <span className="text-white">think critically</span>,{" "}
                  <span className="text-white">understand code</span>, and{" "}
                  <span className="text-white">explain your decisions</span>.
                  AI is just a tool — like Stack Overflow or documentation.
                  What matters is what you do with it.
                </p>
              </div>
            </motion.div>
          </ScrollReveal>
        </div>

        {/* CTA */}
        <ScrollReveal>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-gray-400 mb-6 text-lg">
              Practice like the real thing. Get evaluated on what actually matters.
            </p>
            <Link href="/interview">
              <MagneticButton
                size="lg"
                variant="primary"
                glowColor="accent"
                className="group"
              >
                <Zap className="w-5 h-5" />
                Start AI-Assisted Practice
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
            </Link>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default AIAssistedSection
