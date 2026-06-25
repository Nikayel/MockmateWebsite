"use client"

import dynamic from "next/dynamic"
import { TypewriterText } from "@/components/ui/rotating-text"
import { Bot, Sparkles } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import { GridBackground } from "@/components/GridBackground"

// Lazy load Three.js particles for performance
const SubtleParticles = dynamic(
  () => import("@/components/SubtleParticles").then((mod) => mod.SubtleParticles),
  { ssr: false, loading: () => null }
)

/**
 * Hero Section - Research-backed UX improvements
 *
 * Changes based on cognitive load research:
 * 1. Clear product descriptor above headline ("AI Mock Interview Platform")
 * 2. Rotating text showing capabilities - progressive disclosure
 * 3. Softer background (bg-background instead of bg-black)
 * 4. Clearer value proposition hierarchy
 *
 * Sources: NN/G, Voyage AI patterns, 2025 Eye Tracking Studies
 */

// Capabilities to rotate through - focused on real value
const capabilities = [
  "Voice-enabled mock interviews",
  "Available 24/7, no scheduling",
  "Real-time AI feedback",
  "Spaced repetition scheduling",
  "15 DSA patterns covered",
]

export function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center overflow-hidden bg-[#131317] px-4 pt-[clamp(8rem,18vh,13rem)] pb-16 text-center font-[var(--font-geist)] md:px-16">
      {/* CSS Background - lightweight base */}
      <GridBackground />

      {/* Subtle Three.js particles overlay */}
      <SubtleParticles
        className="absolute inset-0 z-[1] opacity-40"
        particleCount={15}
        primaryColor="#adc6ff"
        secondaryColor="#60a5fa"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[620px] bg-[radial-gradient(circle_at_50%_-20%,rgba(173,198,255,0.12),rgba(19,19,23,0)_70%)]" />

      {/* Content */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-[1200px]"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem} className="mx-auto flex max-w-4xl flex-col items-center">
          <span className="mb-8 inline-flex rounded-full border border-white/10 bg-[#2a2a2e]/80 px-4 py-1.5 text-[12px] font-bold tracking-[0.1em] text-[#adc6ff] uppercase lg:mb-9">
            AI Mock Interviews + Spaced Repetition
          </span>

          <motion.h1
            variants={staggerItem}
            className="font-heading mb-6 text-[clamp(3.25rem,8vw,4.75rem)] leading-[1.06] font-extrabold tracking-[-0.055em] text-[#e9e8ef]"
          >
            Don't just practice.
            <br />
            <span className="text-[#adc6ff]">Actually get better.</span>
          </motion.h1>

          <motion.p
            variants={staggerItem}
            className="mx-auto mb-5 max-w-2xl text-base leading-7 font-medium text-[#c2c6d6] sm:text-lg md:text-xl md:leading-8"
          >
            Realistic AI mock interviews with real code execution and voice — plus spaced
            repetition that makes it stick, so you walk into the real thing ready.
          </motion.p>

          <motion.div
            variants={staggerItem}
            className="mb-8 flex h-8 items-center justify-center text-sm font-semibold text-[#dfe4f2] sm:text-base"
          >
            <Sparkles className="mr-2 h-4 w-4 flex-shrink-0 text-[#adc6ff]" />
            <TypewriterText
              texts={capabilities}
              typingSpeed={40}
              deletingSpeed={25}
              pauseDuration={2500}
              className="text-[#dfe4f2]"
            />
          </motion.div>

          <motion.div
            variants={staggerItem}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              href="/interview"
              className="inline-flex rounded-[14px] bg-[#adc6ff] px-10 py-4 text-base font-extrabold text-[#001a42] shadow-[0_0_40px_rgba(173,198,255,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#bfd0ff] hover:shadow-[0_0_46px_rgba(173,198,255,0.36)]"
            >
              Start free — 8 sessions
            </Link>
            <Link
              href="/why-codesparring"
              className="inline-flex rounded-[14px] border border-white/15 px-8 py-4 text-base font-bold text-[#dfe4f2] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#adc6ff]/40 hover:bg-white/5"
            >
              See how it works
            </Link>
          </motion.div>

          <motion.p
            variants={staggerItem}
            className="mt-5 text-[13px] font-medium text-[#c2c6d6]/70"
          >
            No credit card required · 200+ real scenarios · 15 DSA patterns
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerItem}
          className="mx-auto mt-[clamp(3rem,8vh,5rem)] w-full max-w-[1000px] px-2"
        >
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#1f1f23]/45 shadow-[0_30px_90px_-40px_rgba(96,165,250,0.45)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-[#adc6ff]/30">
            <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#2a2a2e]/45 px-4">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ffb4ab]/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#ffb786]/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#adc6ff]/50" />
              </div>
              <div className="mx-auto font-mono text-xs text-[#c2c6d6]/60">
                Interview Session: Two Sum (Optimal)
              </div>
            </div>

            <div className="grid min-h-[360px] grid-cols-1 overflow-hidden text-left md:grid-cols-12">
              <div className="overflow-hidden border-white/10 bg-[#1a1a1f] p-6 font-mono text-sm leading-6 text-[#c2c6d6] md:col-span-8 md:border-r md:p-8">
                <pre className="whitespace-pre-wrap">
                  <span className="text-[#adc6ff]">const</span>{" "}
                  <span className="text-[#e4e1e7]">twoSum</span> = (nums, target) =&gt; {"{"}
                  {"\n"}
                  {"    "}
                  <span className="text-[#adc6ff]">const</span> map ={" "}
                  <span className="text-[#adc6ff]">new</span> Map();{"\n"}
                  {"    "}
                  <span className="text-[#ffb786]">
                    {"// I'm thinking... if I use a hashmap here"}
                  </span>
                  {"\n"}
                  {"    "}
                  <span className="text-[#ffb786]">{"// I can look up values in O(1)"}</span>
                  {"\n"}
                  {"    "}
                  <span className="text-[#adc6ff]">for</span> (
                  <span className="text-[#adc6ff]">let</span> i = 0; i &lt; nums.length; i++) {"{"}
                  {"\n"}
                  {"        "}
                  <span className="text-[#adc6ff]">const</span> complement = target - nums[i];
                  {"\n"}
                  {"        "}
                  <span className="text-[#adc6ff]">if</span> (map.has(complement)) {"{"}
                  {"\n"}
                  {"            "}
                  <span className="text-[#adc6ff]">return</span> [map.get(complement), i];{"\n"}
                  {"        "}
                  {"}"}
                  {"\n"}
                  {"        "}map.set(nums[i], i);{"\n"}
                  {"    "}
                  {"}"}
                  {"\n"}
                  {"}"};
                </pre>
              </div>

              <div className="flex flex-col gap-6 bg-[#1b1b1f]/65 p-6 md:col-span-4 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#adc6ff]/30 bg-[#adc6ff]/20">
                    <Bot className="h-4 w-4 text-[#adc6ff]" />
                  </div>
                  <div className="text-sm font-bold text-[#e4e1e7]">AI Interviewer</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#1f1f23]/60 p-5 text-sm leading-6 text-[#c2c6d6]">
                  "Exactly right. Walk me through what you'd store in the hashmap and how you'd
                  handle the lookup."
                </div>
                <div className="mt-auto border-t border-white/10 pt-6">
                  <div className="mb-3 flex items-center justify-between text-[10px] font-bold tracking-[0.14em] text-[#c2c6d6] uppercase">
                    <span>Voice Activity</span>
                    <span className="flex items-center gap-1 text-[#adc6ff]">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#adc6ff]" />
                      Recording...
                    </span>
                  </div>
                  <div className="flex h-8 items-center gap-1.5">
                    {[16, 32, 24, 16, 28, 20].map((height, index) => (
                      <div
                        key={index}
                        className="w-1 animate-bounce rounded-full bg-[#adc6ff]"
                        style={{
                          height,
                          opacity: index === 0 || index === 5 ? 0.45 : index === 3 ? 0.65 : 1,
                          animationDelay: `${index * 0.1}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="border-border flex h-8 w-5 items-start justify-center rounded-full border p-1.5">
          <motion.div
            className="bg-muted-foreground/30 h-1.5 w-1 rounded-full"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  )
}
