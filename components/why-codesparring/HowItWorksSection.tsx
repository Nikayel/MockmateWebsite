"use client"

import { ScrollReveal } from "@/lib/motion"
import { Route, Brain, Trophy } from "lucide-react"

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-950 to-black relative overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-heading font-bold text-white mb-4">
              3 Steps to <span className="text-accent">Interview Success</span>
            </h2>
          </div>
        </ScrollReveal>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute top-24 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent hidden md:block" />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Create Your Roadmap",
                  description: "Enter your interview date and target company. Our AI generates your personalized study plan.",
                  icon: Route
                },
                {
                  step: "02",
                  title: "Practice Smart",
                  description: "Follow daily recommendations. We track your performance and optimize review timing.",
                  icon: Brain
                },
                {
                  step: "03",
                  title: "Ace Your Interview",
                  description: "Arrive confident with patterns deeply embedded in long-term memory.",
                  icon: Trophy
                }
              ].map((item, i) => (
                <ScrollReveal key={item.step} delay={i * 0.15}>
                  <div className="relative text-center">
                    <div className="relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 border border-accent/20">
                        <item.icon className="w-8 h-8 text-accent" />
                      </div>
                      <div className="text-4xl font-bold text-accent/20 mb-2">{item.step}</div>
                      <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
