"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GridBackground } from "@/components/GridBackground"
import { Rocket, Code, Mail, Linkedin, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"

const roles = [
  {
    title: "Growth",
    type: "Marketing",
    description: "Help us reach more developers. Run experiments, find what works, grow the community.",
    tags: ["Content", "Community", "Analytics"],
  },
  {
    title: "Fullstack Developer",
    type: "Engineering",
    description: "Build features across the stack. Bonus if you've worked with RAG or AI systems.",
    tags: ["React", "Node", "AI/ML"],
  },
]

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <GridBackground />
      <Header />

      {/* Hero - Clean and centered like Apple */}
      <section className="min-h-[70vh] flex items-center justify-center pt-20 relative z-10">
        <motion.div
          className="container mx-auto px-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <div className="max-w-2xl mx-auto text-center">
            <motion.p
              variants={staggerItem}
              className="text-accent text-sm font-medium mb-4"
            >
              We're building something cool
            </motion.p>

            <motion.h1
              variants={staggerItem}
              className="text-5xl sm:text-6xl md:text-7xl font-bold text-foreground mb-6 tracking-tight"
            >
              Join the team
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-xl text-muted-foreground leading-relaxed mb-8"
            >
              Small team. Big ideas. Help developers nail their interviews.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/5 border border-accent/10 text-sm text-muted-foreground"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Actively hiring</span>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Roles - Minimal cards */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-muted-foreground/60 text-xs uppercase tracking-widest mb-8"
            >
              Open Roles
            </motion.p>

            <div className="space-y-4">
              {roles.map((role, index) => (
                <motion.div
                  key={role.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group p-6 rounded-2xl bg-secondary/30 border border-border hover:border-accent/30 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">
                        {role.title}
                      </h3>
                      <p className="text-sm text-muted-foreground/60">
                        {role.type} · Equity
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>

                  <p className="text-muted-foreground mb-4">
                    {role.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {role.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-xs rounded-full bg-background border border-border text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact - Super minimal */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">
              Interested?
            </h2>
            <p className="text-muted-foreground mb-8">
              No formal applications. Just reach out and tell me what excites you about this.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="mailto:nikayel@skillon.dev"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 text-foreground border border-border rounded-xl hover:bg-secondary/50 transition-all"
              >
                <Mail className="h-4 w-4" />
                nikayel@skillon.dev
              </a>
              <a
                href="https://linkedin.com/in/nikayel-ali"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-all"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </div>

            <p className="mt-8 text-sm text-muted-foreground/60">
              Sacramento State senior · Building this because I needed it myself
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
