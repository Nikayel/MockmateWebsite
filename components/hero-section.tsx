"use client"

import dynamic from "next/dynamic"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Play, ArrowRight, Mic, MessageCircle } from "lucide-react"
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
 * Hero Section - Authentic, developer-focused design
 *
 * Key messaging:
 * - Think out loud, just like a real interview
 * - AI listens and responds naturally
 * - Casual, honest tone - not corporate
 */
export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-black">
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
        className="container mx-auto px-4 relative z-10 pt-28 pb-16 lg:pt-32"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="max-w-6xl mx-auto">

          {/* Top: Headline + Demo side by side */}
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start mb-12">

            {/* Left: Headline (2 cols) */}
            <div className="lg:col-span-2 text-center lg:text-left pt-4">
              <motion.h1
                variants={staggerItem}
                className="text-4xl sm:text-5xl lg:text-6xl font-heading font-black mb-5 leading-[1.1] tracking-tight"
              >
                <span className="text-white">Practice like</span>
                <br />
                <span className="bg-gradient-to-r from-accent via-neural to-accent bg-clip-text text-transparent">
                  it's the real thing
                </span>
              </motion.h1>

              <motion.p
                variants={staggerItem}
                className="text-lg text-gray-400 mb-6 leading-relaxed"
              >
                Talk through your approach. Think out loud.
                Our AI listens and responds—just like a real interviewer would.
              </motion.p>

              {/* CTA */}
              <motion.div variants={staggerItem} className="mb-6">
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

              <motion.p variants={staggerItem} className="text-sm text-gray-600">
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

                <div className="relative bg-gray-950/95 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-gray-900/60">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 bg-red-500/50 rounded-full" />
                      <div className="w-2.5 h-2.5 bg-yellow-500/50 rounded-full" />
                      <div className="w-2.5 h-2.5 bg-green-500/50 rounded-full" />
                    </div>
                    <span className="ml-3 text-xs text-gray-600 font-mono">skillon.dev/interview</span>

                    {/* Live indicator */}
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-neural animate-pulse" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Live</span>
                    </div>
                  </div>

                  {/* Interview conversation */}
                  <div className="p-5 space-y-4">

                    {/* You speaking (voice) */}
                    <div className="flex gap-3 justify-end">
                      <div className="bg-accent/10 border border-accent/20 rounded-lg rounded-tr-none p-3 max-w-[300px]">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Mic className="w-3 h-3 text-accent" />
                          <span className="text-[10px] text-accent uppercase tracking-wider">You (speaking)</span>
                        </div>
                        <p className="text-sm text-gray-300">
                          "So I'm thinking... if I use a hashmap here, I can look up values in O(1) instead of looping through again..."
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-xs">
                        You
                      </div>
                    </div>

                    {/* AI responds */}
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent text-[10px] font-bold">AI</span>
                      </div>
                      <div className="bg-gray-800/60 rounded-lg rounded-tl-none p-3 max-w-[300px]">
                        <p className="text-sm text-gray-300">
                          Exactly right. Walk me through what you'd store in the hashmap and how you'd handle the lookup.
                        </p>
                      </div>
                    </div>

                    {/* Code + feedback */}
                    <div className="bg-gray-900/80 rounded-lg p-3 font-mono text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500">// your solution</span>
                        <div className="flex gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-neural/20 text-neural text-[10px]">O(n)</span>
                          <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[10px]">HashMap</span>
                        </div>
                      </div>
                      <div className="text-gray-400">
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
            className="bg-gradient-to-r from-gray-900/50 via-gray-900/30 to-gray-900/50 rounded-xl border border-white/5 p-6 mb-12"
          >
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-center md:text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="text-white font-medium">Think out loud</div>
                  <div className="text-sm text-gray-500">Just talk through your approach</div>
                </div>
              </div>

              <div className="hidden md:block w-px h-10 bg-white/10" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neural/10 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-neural" />
                </div>
                <div>
                  <div className="text-white font-medium">Real-time responses</div>
                  <div className="text-sm text-gray-500">AI follows your reasoning</div>
                </div>
              </div>

              <div className="hidden md:block w-px h-10 bg-white/10" />

              <div className="text-center md:text-left">
                <div className="text-gray-400 text-sm">
                  No awkward silence. No typing everything out.
                  <br className="hidden md:block" />
                  <span className="text-white">Just a real conversation about code.</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom: Social proof + secondary CTA */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col md:flex-row items-center justify-between gap-6"
          >
            {/* Left: Stats */}
            <div className="flex items-center gap-8 text-center md:text-left">
              <div>
                <div className="text-2xl font-bold text-white">15+</div>
                <div className="text-xs text-gray-500">DSA patterns</div>
              </div>
              <div className="w-px h-8 bg-white/10 hidden md:block" />
              <div>
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-xs text-gray-500">problems</div>
              </div>
              <div className="w-px h-8 bg-white/10 hidden md:block" />
              <div>
                <div className="text-xs text-gray-500 mb-1">Used by engineers at</div>
                <div className="text-sm text-gray-400">Meta, Google, Amazon</div>
              </div>
            </div>

            {/* Right: Learn more */}
            <Link href="/why-skillon" className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5">
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
        <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5">
          <motion.div
            className="w-1 h-1.5 bg-white/30 rounded-full"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  )
}
