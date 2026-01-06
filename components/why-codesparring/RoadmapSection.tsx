"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/lib/motion"
import Link from "next/link"
import { Check, Route, ArrowRight } from "lucide-react"

export function RoadmapSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-black to-gray-950 relative overflow-hidden">
      <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] -translate-y-1/2" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          <ScrollReveal>
            <div>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-6">
                <Route className="w-4 h-4 mr-2 inline" />
                Personalized Roadmaps
              </Badge>
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">
                Your Interview
                <br />
                <span className="text-purple-400">Your Timeline</span>
              </h2>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Tell us your interview date, target company, and current level.
                Get a day-by-day plan optimized for your success.
              </p>

              <div className="space-y-4">
                {[
                  "Customized to your target company's patterns",
                  "Adapts based on your performance",
                  "Prioritizes weak areas automatically",
                  "Accounts for forgetting curve science"
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Link href="/roadmap">
                  <MagneticButton variant="primary" glowColor="neural">
                    Create Your Roadmap <ArrowRight className="w-4 h-4" />
                  </MagneticButton>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-purple-500/10 via-transparent to-accent/10 rounded-[2rem] blur-xl" />
              <div className="relative bg-gradient-to-br from-gray-900 to-gray-900/80 rounded-2xl border border-gray-800/50 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Your Roadmap</div>
                    <div className="text-lg font-bold text-white">Google L4 Interview</div>
                  </div>
                  <Badge className="bg-neural/20 text-neural border-neural/30">28 days</Badge>
                </div>

                <div className="space-y-3">
                  {[
                    { week: "Week 1", focus: "Arrays & Hashing", progress: 100, status: "complete" },
                    { week: "Week 2", focus: "Two Pointers & Sliding Window", progress: 75, status: "current" },
                    { week: "Week 3", focus: "Trees & Graphs", progress: 0, status: "upcoming" },
                    { week: "Week 4", focus: "Dynamic Programming", progress: 0, status: "upcoming" },
                  ].map((week) => (
                    <div
                      key={week.week}
                      className={`p-4 rounded-xl transition-all ${
                        week.status === 'current'
                          ? 'bg-accent/10 border border-accent/30'
                          : week.status === 'complete'
                          ? 'bg-neural/5 border border-neural/20'
                          : 'bg-gray-800/30 border border-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${week.status === 'current' ? 'text-accent' : 'text-gray-400'}`}>
                          {week.week}
                        </span>
                        {week.status === 'complete' && <Check className="w-4 h-4 text-neural" />}
                        {week.status === 'current' && <span className="text-xs text-accent">In Progress</span>}
                      </div>
                      <div className="text-white font-medium mb-2">{week.focus}</div>
                      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${week.status === 'complete' ? 'bg-neural' : 'bg-accent'}`}
                          style={{ width: `${week.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
