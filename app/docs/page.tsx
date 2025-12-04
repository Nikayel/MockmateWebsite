"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GridBackground } from "@/components/GridBackground"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Download,
  Settings,
  Play,
  MessageSquare,
  BarChart3,
  Code,
  ArrowRight,
  ExternalLink,
  Keyboard,
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

const quickStart = [
  { step: "01", title: "Sign Up", desc: "Create your account - no downloads needed", icon: Download },
  { step: "02", title: "Configure", desc: "Set your preferences and skill level", icon: Settings },
  { step: "03", title: "Practice", desc: "Start your first mock interview", icon: Play },
  { step: "04", title: "Improve", desc: "Review feedback and track progress", icon: BarChart3 },
]

const features = [
  {
    icon: MessageSquare,
    title: "AI Interviewer",
    items: ["Natural conversation flow", "Contextual hints", "Real-time code review"],
  },
  {
    icon: Code,
    title: "Coding Challenges",
    items: ["Arrays & strings", "Data structures", "Dynamic programming"],
  },
  {
    icon: BarChart3,
    title: "Analytics",
    items: ["Time complexity analysis", "Code quality metrics", "Progress tracking"],
  },
]

const shortcuts = [
  { key: "Ctrl+Enter", action: "Run Code" },
  { key: "Ctrl+H", action: "Request Hint" },
  { key: "Ctrl+Shift+Enter", action: "Submit Solution" },
  { key: "Esc", action: "Pause Session" },
]

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center overflow-hidden">
        <GridBackground />
        <div className="container mx-auto px-4 relative z-10 py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Badge className="bg-[#00d9ff]/10 text-[#00d9ff] border-[#00d9ff]/20 mb-6">
              Documentation
            </Badge>
            <h1 className="text-5xl md:text-7xl font-heading font-bold text-white mb-6 leading-tight">
              Get
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ff88]">
                Started
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-xl leading-relaxed">
              Everything you need to master coding interviews with Skillon.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Start - Horizontal flow */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-4">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gray-500 text-sm uppercase tracking-widest mb-12"
          >
            Quick Start
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {quickStart.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-6xl font-bold text-gray-900 mb-4">{item.step}</div>
                <div className="flex items-center gap-3 mb-2">
                  <item.icon className="h-5 w-5 text-[#00d9ff]" />
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                </div>
                <p className="text-gray-500 text-sm">{item.desc}</p>
                {index < quickStart.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-3 h-4 w-4 text-gray-800" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Clean list */}
      <section className="py-24 bg-black border-t border-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-gray-500 text-sm uppercase tracking-widest mb-12"
            >
              Core Features
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <feature.icon className="h-8 w-8 text-[#00d9ff] mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                  <ul className="space-y-2">
                    {feature.items.map((item) => (
                      <li key={item} className="text-gray-500 flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[#00ff88]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="py-24 bg-black border-t border-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-12"
            >
              <Keyboard className="h-5 w-5 text-gray-500" />
              <p className="text-gray-500 text-sm uppercase tracking-widest">
                Keyboard Shortcuts
              </p>
            </motion.div>

            <div className="space-y-4">
              {shortcuts.map((shortcut, index) => (
                <motion.div
                  key={shortcut.key}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between py-3 border-b border-gray-900"
                >
                  <span className="text-gray-400">{shortcut.action}</span>
                  <kbd className="px-3 py-1 rounded bg-gray-900 text-gray-300 font-mono text-sm">
                    {shortcut.key}
                  </kbd>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-black border-t border-gray-900">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-heading font-bold text-white mb-4">
              Ready to practice?
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Start your first mock interview and get AI-powered feedback instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/interview">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 rounded-full px-8">
                  Start Practicing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/samples">
                <Button size="lg" variant="outline" className="border-gray-800 text-white hover:bg-gray-900 rounded-full px-8 bg-transparent">
                  View Samples
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
