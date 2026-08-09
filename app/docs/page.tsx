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
  {
    step: "01",
    title: "Sign Up",
    desc: "Create your account - no downloads needed",
    icon: Download,
  },
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
    <main className="bg-background min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative flex min-h-[50vh] items-center overflow-hidden">
        <GridBackground />
        <div className="relative z-10 container mx-auto px-4 py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Badge className="bg-accent/10 text-accent-strong border-accent/20 mb-6">
              Documentation
            </Badge>
            <h1 className="font-heading text-foreground mb-6 text-5xl leading-tight font-bold md:text-7xl">
              Get
              <span className="from-accent to-neural block bg-gradient-to-r bg-clip-text text-transparent">
                Started
              </span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-xl leading-relaxed">
              Everything you need to master coding interviews with CodeSparring.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Start - Horizontal flow */}
      <section className="bg-background py-24">
        <div className="container mx-auto px-4">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-muted-foreground mb-12 text-sm tracking-widest uppercase"
          >
            Quick Start
          </motion.p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {quickStart.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-foreground mb-4 text-6xl font-bold">{item.step}</div>
                <div className="mb-2 flex items-center gap-3">
                  <item.icon className="text-accent-strong h-5 w-5" />
                  <h3 className="text-foreground text-lg font-semibold">{item.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
                {index < quickStart.length - 1 && (
                  <ArrowRight className="text-foreground absolute top-8 -right-3 hidden h-4 w-4 md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Clean list */}
      <section className="bg-background border-border border-t py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-muted-foreground mb-12 text-sm tracking-widest uppercase"
            >
              Core Features
            </motion.p>

            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <feature.icon className="text-accent-strong mb-4 h-8 w-8" />
                  <h3 className="text-foreground mb-4 text-xl font-semibold">{feature.title}</h3>
                  <ul className="space-y-2">
                    {feature.items.map((item) => (
                      <li key={item} className="text-muted-foreground flex items-center gap-2">
                        <span className="bg-neural h-1 w-1 rounded-full" />
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
      <section className="bg-background border-border border-t py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-12 flex items-center gap-3"
            >
              <Keyboard className="text-muted-foreground h-5 w-5" />
              <p className="text-muted-foreground text-sm tracking-widest uppercase">
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
                  className="border-border flex items-center justify-between border-b py-3"
                >
                  <span className="text-muted-foreground">{shortcut.action}</span>
                  <kbd className="bg-card text-muted-foreground rounded px-3 py-1 font-mono text-sm">
                    {shortcut.key}
                  </kbd>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background border-border border-t py-24">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-foreground mb-4 text-3xl font-bold">
              Ready to practice?
            </h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-md">
              Start your first mock interview and get AI-powered feedback instantly.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/interview">
                <Button
                  size="lg"
                  className="bg-card text-foreground hover:bg-muted rounded-full px-8"
                >
                  Start Practicing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/samples">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border text-foreground hover:bg-card rounded-full bg-transparent px-8"
                >
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
