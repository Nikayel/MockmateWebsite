"use client"

import { motion } from "framer-motion"
import { BriefcaseBusiness, Bug, Lock, Network, Puzzle, Workflow } from "lucide-react"

const interviewTypes = [
  {
    title: "DSA Patterns",
    description: "15 patterns from arrays to graphs. Master logic and efficiency.",
    icon: Workflow,
    tone: "text-[#adc6ff] bg-[#adc6ff]/12",
  },
  {
    title: "System Design",
    description: "Architecture & scalability. Discuss tradeoffs like a Senior Engineer.",
    icon: Network,
    tone: "text-[#60a5fa] bg-[#60a5fa]/12",
  },
  {
    title: "Bug Fix",
    description: "Debug real codebases. Find the bottleneck, fix the performance.",
    icon: Bug,
    tone: "text-[#ffb4ab] bg-[#ffb4ab]/12",
  },
  {
    title: "Add Functionality",
    description: "Build on existing code. Test your ability to read and extend systems.",
    icon: Puzzle,
    tone: "text-[#ffb786] bg-[#ffb786]/12",
  },
  {
    title: "Real-World Rounds",
    description: "60-min sessions mirroring FAANG interview loops.",
    icon: BriefcaseBusiness,
    tone: "text-[#e4e1e7] bg-white/10",
  },
  {
    title: "Security",
    description: "Code quality & safety. Identify vulnerabilities and harden systems.",
    icon: Lock,
    tone: "text-[#adc6ff] bg-[#adc6ff]/12",
  },
]

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-[#0f0f13] px-4 py-20 font-[var(--font-geist)] text-[#e4e1e7] sm:px-6 lg:px-12 xl:px-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(173,198,255,0.07),rgba(15,15,19,0)_42%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1050px]">
        <motion.div
          className="mb-10 text-center sm:mb-12 lg:mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
        >
          <h2 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-extrabold tracking-[-0.04em] text-[#f0eff6]">
            6 Specialized Interview Types
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 font-medium text-[#c2c6d6] sm:text-base">
            Master every format of the modern tech interview.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {interviewTypes.map((type, index) => {
            const Icon = type.icon

            return (
              <motion.article
                key={type.title}
                className="group flex min-h-[168px] flex-col rounded-[18px] border border-white/10 bg-[#17171c] p-7 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.9)] transition-all duration-300 hover:-translate-y-1 hover:border-[#adc6ff]/25 hover:bg-[#1b1b20]"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
              >
                <div
                  className={`mb-7 flex h-11 w-11 items-center justify-center rounded-[10px] ${type.tone}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <h3 className="text-lg leading-6 font-extrabold tracking-[-0.03em] text-[#e8e7ee]">
                  {type.title}
                </h3>
                <p className="mt-3 max-w-[18rem] text-sm leading-5 font-semibold text-[#c2c6d6]/85">
                  {type.description}
                </p>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
