"use client"

import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/lib/motion"
import {
  Brain,
  RefreshCw,
  BrainCircuit,
  Layers,
  TrendingUp,
} from "lucide-react"

// Icon mapping for dynamic icons
const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  RefreshCw,
  BrainCircuit,
  Layers,
  TrendingUp,
}

interface SciencePrinciple {
  icon: string
  title: string
  improvement: string
  description: string
  color: string
  visual: string
  citation: string
  source: string
}

interface ScienceSectionProps {
  sciencePrinciples: SciencePrinciple[]
}

export function ScienceSection({ sciencePrinciples }: ScienceSectionProps) {
  return (
    <section className="py-24 bg-gradient-to-b from-black via-gray-950 to-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #00d9ff 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, #00ff88 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge className="bg-neural/20 text-neural border-neural/30 mb-6">
              <Brain className="w-4 h-4 mr-2 inline" />
              Research-Backed
            </Badge>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
              Built on 40 Years of <span className="text-neural">Cognitive Science</span>
            </h2>
            <p className="text-xl text-gray-400">
              Four proven learning principles, applied to your interview prep.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {sciencePrinciples.map((principle, i) => {
            const IconComponent = iconMap[principle.icon] || Brain
            return (
              <ScrollReveal key={principle.title} delay={i * 0.1}>
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 to-gray-900/50 rounded-3xl transform group-hover:scale-[1.02] transition-transform duration-300" />
                  <div className={`absolute -inset-px rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    principle.color === 'accent' ? 'from-accent/20 to-transparent' :
                    principle.color === 'neural' ? 'from-neural/20 to-transparent' :
                    principle.color === 'purple' ? 'from-purple-400/20 to-transparent' :
                    'from-amber-400/20 to-transparent'
                  }`} />

                  <div className="relative p-8 rounded-3xl border border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        principle.color === 'accent' ? 'bg-accent/10' :
                        principle.color === 'neural' ? 'bg-neural/10' :
                        principle.color === 'purple' ? 'bg-purple-400/10' :
                        'bg-amber-400/10'
                      }`}>
                        <IconComponent className={`w-7 h-7 ${
                          principle.color === 'accent' ? 'text-accent' :
                          principle.color === 'neural' ? 'text-neural' :
                          principle.color === 'purple' ? 'text-purple-400' :
                          'text-amber-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className={`text-2xl font-bold mb-1 ${
                          principle.color === 'accent' ? 'text-accent' :
                          principle.color === 'neural' ? 'text-neural' :
                          principle.color === 'purple' ? 'text-purple-400' :
                          'text-amber-400'
                        }`}>{principle.improvement}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Better Retention</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-4 mb-2">{principle.title}</h3>
                    <p className="text-gray-400 leading-relaxed mb-3">{principle.description}</p>
                    <p className="text-xs text-gray-600 italic">
                      {principle.citation} — <span className="text-gray-700">{principle.source}</span>
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
