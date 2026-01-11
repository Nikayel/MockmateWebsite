"use client"

import dynamic from "next/dynamic"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { TypewriterText } from "@/components/ui/rotating-text"
import { Play, ArrowRight, Mic, Sparkles } from "lucide-react"
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
    <section className="bg-background relative flex min-h-screen flex-col justify-center overflow-hidden">
      {/* CSS Background - lightweight base */}
      <GridBackground />

      {/* Subtle Three.js particles overlay */}
      <SubtleParticles
        className="absolute inset-0 z-[1] opacity-40"
        particleCount={15}
        primaryColor="#00d9ff"
        secondaryColor="#00ff88"
      />

      {/* Content */}
      <motion.div
        className="relative z-10 container mx-auto px-4 pt-20 pb-12 lg:pt-24"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="mx-auto max-w-6xl">
          {/* Headline + Demo side by side */}
          <div className="grid items-center gap-6 lg:grid-cols-5 lg:gap-8">
            {/* Left: Headline (2 cols) */}
            <div className="pt-4 text-center lg:col-span-2 lg:text-left">
              <motion.div
                variants={staggerItem}
                className="bg-neural/10 border-neural/20 mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
              >
                <span className="text-neural text-xs font-medium">
                  Practice the skill interviews actually test
                </span>
              </motion.div>

              <motion.h1
                variants={staggerItem}
                className="font-heading mb-4 text-4xl leading-[1.1] font-black tracking-tight sm:text-5xl lg:text-5xl"
              >
                <span className="text-foreground">Ace your next</span>
                <br />
                <span className="from-accent via-neural to-accent bg-gradient-to-r bg-clip-text text-transparent">
                  tech interview
                </span>
              </motion.h1>

              {/* Rotating capabilities - progressive disclosure */}
              <motion.div
                variants={staggerItem}
                className="mb-4 flex h-8 items-center justify-center lg:justify-start"
              >
                <div className="flex items-center gap-2 text-base lg:text-lg">
                  <Sparkles className="text-neural h-4 w-4 flex-shrink-0" />
                  <TypewriterText
                    texts={capabilities}
                    typingSpeed={40}
                    deletingSpeed={25}
                    pauseDuration={2500}
                    className="text-gray-300"
                  />
                </div>
              </motion.div>

              <motion.p
                variants={staggerItem}
                className="text-muted-foreground mb-4 text-sm leading-relaxed lg:text-base"
              >
                LeetCode tests if you can solve problems alone. Real interviews test if you can
                think out loud under pressure. Practice with an AI interviewer that gives real
                feedback—anytime, anywhere.
              </motion.p>

              {/* Single CTA - friction-free */}
              <motion.div variants={staggerItem} className="mb-4">
                <Link href="/interview">
                  <MagneticButton
                    size="lg"
                    variant="primary"
                    glowColor="accent"
                    strength={0.4}
                    className="w-full sm:w-auto"
                  >
                    <Play className="h-5 w-5" />
                    Try Free - No Signup Required
                    <ArrowRight className="h-5 w-5" />
                  </MagneticButton>
                </Link>
              </motion.div>

              <motion.p variants={staggerItem} className="text-muted-foreground/60 text-sm">
                Complete one full interview with AI feedback. No account needed.
              </motion.p>
            </div>

            {/* Right: Live Demo (3 cols) - More prominent */}
            <motion.div variants={staggerItem} className="lg:col-span-3">
              <div className="relative">
                {/* Glow */}
                <div className="from-accent/15 to-neural/15 absolute -inset-3 rounded-2xl bg-gradient-to-r blur-xl" />

                <div className="bg-card/95 border-border relative overflow-hidden rounded-xl border shadow-2xl backdrop-blur-sm">
                  {/* Browser chrome */}
                  <div className="border-border bg-secondary/60 flex items-center gap-2 border-b px-3 py-2">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <span className="text-muted-foreground ml-3 font-mono text-xs">
                      codesparring.dev/interview
                    </span>

                    {/* Live indicator */}
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="bg-neural h-1.5 w-1.5 animate-pulse rounded-full" />
                      <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Live
                      </span>
                    </div>
                  </div>

                  {/* Interview conversation */}
                  <div className="space-y-3 p-4">
                    {/* You speaking (voice) */}
                    <div className="flex justify-end gap-2.5">
                      <div className="bg-accent/10 border-accent/20 max-w-[280px] rounded-lg rounded-tr-none border p-2.5">
                        <div className="mb-1 flex items-center gap-1.5">
                          <Mic className="text-accent h-2.5 w-2.5" />
                          <span className="text-accent text-[9px] tracking-wider uppercase">
                            You (speaking)
                          </span>
                        </div>
                        <p className="text-foreground/80 text-xs">
                          "So I'm thinking... if I use a hashmap here, I can look up values in O(1)
                          instead of looping through again..."
                        </p>
                      </div>
                      <div className="bg-secondary flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px]">
                        You
                      </div>
                    </div>

                    {/* AI responds */}
                    <div className="flex gap-2.5">
                      <div className="bg-accent/20 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full">
                        <span className="text-accent text-[9px] font-bold">AI</span>
                      </div>
                      <div className="bg-secondary/60 max-w-[280px] rounded-lg rounded-tl-none p-2.5">
                        <p className="text-foreground/80 text-xs">
                          Exactly right. Walk me through what you'd store in the hashmap and how
                          you'd handle the lookup.
                        </p>
                      </div>
                    </div>

                    {/* Code + feedback */}
                    <div className="bg-background/80 rounded-lg p-2.5 font-mono text-xs">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-muted-foreground">{"// your solution"}</span>
                        <div className="flex gap-2">
                          <span className="bg-neural/20 text-neural rounded px-1.5 py-0.5 text-[10px]">
                            O(n)
                          </span>
                          <span className="bg-accent/20 text-accent rounded px-1.5 py-0.5 text-[10px]">
                            HashMap
                          </span>
                        </div>
                      </div>
                      <div className="text-foreground/70">
                        <span className="text-purple-400">const</span> map ={" "}
                        <span className="text-neural">new Map</span>();
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
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
