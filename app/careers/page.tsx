"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { GridBackground } from "@/components/GridBackground"
import { Badge } from "@/components/ui/badge"
import { Rocket, Code, Mail, Linkedin, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const roles = [
  {
    icon: Rocket,
    title: "Growth",
    description: "Help us get Skillon in front of more developers. You'll figure out what works, run experiments, and grow our user base. No fluff, just results.",
    color: "#00d9ff",
  },
  {
    icon: Code,
    title: "Fullstack Developer",
    description: "Build features across the stack. Bonus points if you've worked with RAG systems or anything AI-related. We ship fast and break things (then fix them).",
    color: "#00ff88",
  },
]

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center overflow-hidden">
        <GridBackground />
        <div className="container mx-auto px-4 relative z-10 py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Badge className="bg-[#00d9ff]/10 text-[#00d9ff] border-[#00d9ff]/20 mb-6">
              We're Hiring
            </Badge>
            <h1 className="text-5xl md:text-7xl font-heading font-bold text-white mb-6 leading-tight">
              Join the
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ff88]">
                Team
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-xl leading-relaxed">
              Small team. Big ideas. If you're into AI and want to help developers nail their interviews, let's talk.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Roles Section - Flowing design */}
      <section className="py-24 bg-black relative">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-gray-500 text-sm uppercase tracking-widest mb-12"
            >
              Open Roles
            </motion.p>

            <div className="space-y-8">
              {roles.map((role, index) => (
                <motion.div
                  key={role.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <div className="flex items-start gap-6 p-6 rounded-2xl bg-gradient-to-r from-gray-900/50 to-transparent border-l-2 hover:border-l-4 transition-all"
                    style={{ borderColor: role.color }}
                  >
                    <div
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `${role.color}15` }}
                    >
                      <role.icon className="h-6 w-6" style={{ color: role.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-heading font-semibold text-white">
                          {role.title}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                          Equity
                        </span>
                      </div>
                      <p className="text-gray-400 leading-relaxed mb-3">
                        {role.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        Compensation: Equity (negotiable)
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section - Minimal */}
      <section className="py-24 bg-black border-t border-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl font-heading font-bold text-white mb-4">
              Interested?
            </h2>
            <p className="text-gray-400 mb-8">
              No formal applications. Just drop me a message about yourself and what excites you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:nikayel@skillon.dev"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white border border-gray-800 rounded-full hover:border-gray-600 transition-colors"
              >
                <Mail className="h-4 w-4" />
                nikayel@skillon.dev
              </a>
              <a
                href="https://linkedin.com/in/nikayel-ali"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-black bg-white rounded-full hover:bg-gray-100 transition-colors"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
