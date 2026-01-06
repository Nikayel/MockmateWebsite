"use client"

import { GridBackground } from "@/components/GridBackground"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import Link from "next/link"
import {
  Brain,
  ArrowRight,
  Route,
  ChevronRight,
  Play,
} from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
      <GridBackground />

      {/* Organic gradient blobs instead of rectangles */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-accent/30 via-accent/10 to-transparent rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-neural/25 via-neural/10 to-transparent rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

      <motion.div
        className="container mx-auto px-4 text-center relative z-10"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div variants={staggerItem}>
            <Badge className="bg-neural/20 text-neural border-neural/30 mb-8 px-4 py-2">
              <Brain className="w-4 h-4 mr-2 inline" />
              Powered by Cognitive Science
            </Badge>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="text-5xl sm:text-6xl md:text-7xl font-heading font-black mb-8 leading-[1.1] tracking-tight"
          >
            <span className="text-white">Stop Guessing</span>
            <br />
            <span className="text-white">How Much to Practice</span>
          </motion.h1>

          <motion.p
            variants={staggerItem}
            className="text-xl md:text-2xl text-gray-400 mb-6 max-w-2xl mx-auto leading-relaxed"
          >
            Our algorithm calculates <span className="text-accent font-medium">exactly when</span> and{" "}
            <span className="text-neural font-medium">how many times</span> to review each problem—based on your actual performance.
          </motion.p>

          <motion.p
            variants={staggerItem}
            className="text-lg text-gray-500 mb-12 max-w-xl mx-auto"
          >
            No more random grinding. No more forgetting before interviews.
          </motion.p>

          <motion.div
            variants={staggerItem}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/roadmap">
              <MagneticButton size="lg" variant="primary" glowColor="accent">
                <Route className="w-5 h-5" />
                Create Your Roadmap
                <ArrowRight className="w-5 h-5" />
              </MagneticButton>
            </Link>
            <Link href="/interview">
              <MagneticButton size="lg" variant="outline" glowColor="none">
                <Play className="w-5 h-5" />
                Try Free Practice
              </MagneticButton>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronRight className="w-6 h-6 text-gray-600 rotate-90" />
      </motion.div>
    </section>
  )
}
