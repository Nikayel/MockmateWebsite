"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GridBackground } from "@/components/GridBackground"
import { Mail, Linkedin, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"

interface Role {
  title: string
  type: string
  description: string
  tags: string[]
}

interface CareersPageClientProps {
  roles: Role[]
}

export function CareersPageClient({ roles }: CareersPageClientProps) {
  return (
    <main className="bg-background relative min-h-screen overflow-hidden">
      <GridBackground />
      <Header />

      {/* Hero - Clean and centered like Apple */}
      <section className="relative z-10 flex min-h-[70vh] items-center justify-center pt-20">
        <motion.div
          className="container mx-auto px-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <div className="mx-auto max-w-2xl text-center">
            <motion.p variants={staggerItem} className="text-accent mb-4 text-sm font-medium">
              We're building something cool
            </motion.p>

            <motion.h1
              variants={staggerItem}
              className="text-foreground mb-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
            >
              Join the team
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-muted-foreground mb-8 text-xl leading-relaxed"
            >
              Small team. Big ideas. Help developers nail their interviews.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="bg-accent/5 border-accent/10 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span>Actively hiring</span>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Roles - Minimal cards */}
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-muted-foreground mb-8 text-xs font-medium tracking-widest uppercase"
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
                  className="group bg-secondary/50 border-border hover:border-accent/40 hover:bg-secondary cursor-pointer rounded-2xl border p-6 transition-all"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-foreground mb-1 text-xl font-semibold">{role.title}</h3>
                      <p className="text-muted-foreground text-sm">{role.type} · Equity</p>
                    </div>
                    <ArrowRight className="text-muted-foreground/60 group-hover:text-accent h-5 w-5 transition-all group-hover:translate-x-1" />
                  </div>

                  <p className="text-muted-foreground mb-4">{role.description}</p>

                  <div className="flex flex-wrap gap-2">
                    {role.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-background border-border text-muted-foreground rounded-full border px-3 py-1 text-xs"
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
      <section className="relative z-10 py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-xl text-center"
          >
            <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight">Interested?</h2>
            <p className="text-muted-foreground mb-8">
              No formal applications. Just reach out and tell me what excites you about this.
            </p>
            <p className="text-muted-foreground mb-8 text-sm">
              If you do not get a response, reach out on LinkedIn (Nikayel Ali) or at my personal
              email:{" "}
              <a href="mailto:alinikayeljamal@gmail.com" className="text-accent hover:underline">
                alinikayeljamal@gmail.com
              </a>
              .
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="mailto:nikayel_ali@codesparring.dev"
                className="text-foreground border-border hover:border-accent/40 hover:bg-secondary inline-flex h-12 items-center justify-center gap-2 rounded-xl border px-6 transition-all"
              >
                <Mail className="h-4 w-4" />
                nikayel_ali@codesparring.dev
              </a>
              <a
                href="https://linkedin.com/in/nikayel-ali"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 transition-all"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </div>

            <p className="text-muted-foreground mt-8 text-sm">
              Sacramento State senior · Building this because I needed it myself
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
