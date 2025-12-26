"use client"

import dynamic from "next/dynamic"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { TypewriterText } from "@/components/ui/rotating-text"
import { Play, ArrowRight, Mic, MessageCircle, Brain, BarChart3, Target, Sparkles } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import { GridBackground } from "@/components/GridBackground"

// Lazy load Three.js particles for performance
const SubtleParticles = dynamic(
  () => import("@/components/SubtleParticles").then(mod => mod.SubtleParticles),
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

// Capabilities to rotate through - shows breadth without overwhelming
const capabilities = [
  "Voice-enabled mock interviews",
  "Real-time AI feedback",
  "Spaced repetition scheduling",
  "200+ DSA problems",
  "FAANG interview simulations",
  "Pattern mastery tracking",
]

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-background">
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
        className="container mx-auto px-4 relative z-10 pt-20 pb-12 lg:pt-24"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="max-w-6xl mx-auto">

          {/* Top: Headline + Demo side by side */}
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 items-start mb-8">

            {/* Left: Headline (2 cols) */}
            <div className="lg:col-span-2 text-center lg:text-left pt-4">
              {/* Product descriptor - tells users WHAT this is immediately */}
              <motion.div
                variants={staggerItem}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4"
              >
                <Brain className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs text-accent font-medium tracking-wide uppercase">
                  AI Mock Interview Platform
                </span>
              </motion.div>

              <motion.h1
                variants={staggerItem}
                className="text-4xl sm:text-5xl lg:text-5xl font-heading font-black mb-4 leading-[1.1] tracking-tight"
              >
                <span className="text-foreground">Practice like</span>
                <br />
                <span className="bg-gradient-to-r from-accent via-neural to-accent bg-clip-text text-transparent">
                  it's the real thing
                </span>
              </motion.h1>

              {/* Rotating capabilities - progressive disclosure */}
              <motion.div
                variants={staggerItem}
                className="h-8 mb-4 flex items-center justify-center lg:justify-start"
              >
                <div className="flex items-center gap-2 text-base lg:text-lg">
                  <Sparkles className="w-4 h-4 text-neural flex-shrink-0" />
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
                className="text-sm lg:text-base text-muted-foreground mb-4 leading-relaxed"
              >
                AI trained on 500+ real company interviews. Think out loud—it listens and responds naturally. Get detailed feedback to nail your next interview.
              </motion.p>

              {/* CTA */}
              <motion.div variants={staggerItem} className="mb-4">
                <Link href="/interview">
                  <MagneticButton
                    size="lg"
                    variant="primary"
                    glowColor="accent"
                    strength={0.4}
                    className="w-full sm:w-auto"
                  >
                    <Play className="w-5 h-5" />
                    Start practicing
                    <ArrowRight className="w-5 h-5" />
                  </MagneticButton>
                </Link>
              </motion.div>

              <motion.p variants={staggerItem} className="text-sm text-muted-foreground/60">
                Free to try. No card needed.
              </motion.p>
            </div>

            {/* Right: Live Demo (3 cols) - More prominent */}
            <motion.div
              variants={staggerItem}
              className="lg:col-span-3"
            >
              <div className="relative">
                {/* Glow */}
                <div className="absolute -inset-3 bg-gradient-to-r from-accent/15 to-neural/15 rounded-2xl blur-xl" />

                <div className="relative bg-card/95 backdrop-blur-sm rounded-xl border border-border overflow-hidden shadow-2xl">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/60">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-red-500/50 rounded-full" />
                      <div className="w-2.5 h-2.5 bg-yellow-500/50 rounded-full" />
                      <div className="w-2.5 h-2.5 bg-green-500/50 rounded-full" />
                    </div>
                    <span className="ml-3 text-xs text-muted-foreground font-mono">skillon.dev/interview</span>

                    {/* Live indicator */}
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-neural animate-pulse" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live</span>
                    </div>
                  </div>

                  {/* Interview conversation */}
                  <div className="p-4 space-y-3">

                    {/* You speaking (voice) */}
                    <div className="flex gap-2.5 justify-end">
                      <div className="bg-accent/10 border border-accent/20 rounded-lg rounded-tr-none p-2.5 max-w-[280px]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Mic className="w-2.5 h-2.5 text-accent" />
                          <span className="text-[9px] text-accent uppercase tracking-wider">You (speaking)</span>
                        </div>
                        <p className="text-xs text-foreground/80">
                          "So I'm thinking... if I use a hashmap here, I can look up values in O(1) instead of looping through again..."
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-[10px]">
                        You
                      </div>
                    </div>

                    {/* AI responds */}
                    <div className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent text-[9px] font-bold">AI</span>
                      </div>
                      <div className="bg-secondary/60 rounded-lg rounded-tl-none p-2.5 max-w-[280px]">
                        <p className="text-xs text-foreground/80">
                          Exactly right. Walk me through what you'd store in the hashmap and how you'd handle the lookup.
                        </p>
                      </div>
                    </div>

                    {/* Code + feedback */}
                    <div className="bg-background/80 rounded-lg p-2.5 font-mono text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">// your solution</span>
                        <div className="flex gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-neural/20 text-neural text-[10px]">O(n)</span>
                          <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[10px]">HashMap</span>
                        </div>
                      </div>
                      <div className="text-foreground/70">
                        <span className="text-purple-400">const</span> map = <span className="text-neural">new Map</span>();
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Middle: Key differentiator - Voice/Think out loud */}
          <motion.div
            variants={staggerItem}
            className="bg-gradient-to-r from-secondary/50 via-secondary/30 to-secondary/50 rounded-xl border border-border/50 p-4 md:p-5 mb-6"
          >
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-center md:text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <div className="text-foreground font-medium text-sm md:text-base">Think out loud</div>
                  <div className="text-xs text-muted-foreground">Just talk through your approach</div>
                </div>
              </div>

              <div className="hidden md:block w-px h-8 bg-border" />

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-neural/10 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-neural" />
                </div>
                <div>
                  <div className="text-foreground font-medium text-sm md:text-base">Real-time responses</div>
                  <div className="text-xs text-muted-foreground">AI follows your reasoning</div>
                </div>
              </div>

              <div className="hidden md:block w-px h-8 bg-border" />

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <div className="text-foreground font-medium text-sm md:text-base">Spaced repetition</div>
                  <div className="text-xs text-muted-foreground">Science-backed review timing</div>
                </div>
              </div>

            </div>
          </motion.div>

          {/* Bottom: Social proof + secondary CTA */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col md:flex-row items-center justify-between gap-4"
          >
            {/* Left: Stats */}
            <div className="flex items-center gap-8 text-center md:text-left">
              <div>
                <div className="text-2xl font-bold text-foreground">15+</div>
                <div className="text-xs text-muted-foreground">DSA patterns</div>
              </div>
              <div className="w-px h-8 bg-border hidden md:block" />
              <div>
                <div className="text-2xl font-bold text-foreground">200+</div>
                <div className="text-xs text-muted-foreground">problems</div>
              </div>
              <div className="w-px h-8 bg-border hidden md:block" />
              <div>
                <div className="text-xs text-muted-foreground mb-1">Includes simulations from</div>
                <div className="text-sm text-foreground/80">20+ companies</div>
              </div>
            </div>

            {/* Right: Learn more */}
            <Link href="/why-skillon" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              How it actually works
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-5 h-8 rounded-full border border-border flex items-start justify-center p-1.5">
          <motion.div
            className="w-1 h-1.5 bg-muted-foreground/30 rounded-full"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  )
}
