"use client"

import { ScrollReveal } from "@/lib/motion"
import { Brain, RefreshCw, BrainCircuit, Layers, TrendingUp } from "lucide-react"

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
  finding: string
  description: string
  citation: string
  source: string
}

interface ScienceSectionProps {
  sciencePrinciples: SciencePrinciple[]
}

/**
 * ScienceSection — the four learning principles, on the landing design system.
 *
 * The per-card hues are gone. They used to run clay / green / purple-400 / amber-400,
 * two of which are not in the palette at all, and the hue encoded nothing: all four
 * cards report the same quantity (retention lift), so the color was decoration wearing
 * the costume of data. The landing sections commit to one clay accent for exactly this
 * reason, and the icon plus the figure already tell the cards apart.
 */
export function ScienceSection({ sciencePrinciples }: ScienceSectionProps) {
  return (
    <section className="bg-background relative overflow-hidden py-24">
      {/* One soft clay wash, matching the landing sections. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,112,63,0.06),transparent_65%)]" />

      <div className="relative z-10 container mx-auto px-4">
        <ScrollReveal>
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <div className="border-border bg-muted mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1">
              <Brain className="text-accent h-3.5 w-3.5" />
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Research-Backed
              </span>
            </div>
            <h2 className="font-heading text-foreground text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em]">
              Built on 40 years of <span className="text-accent">cognitive science</span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed">
              Four proven learning principles, applied to your interview prep.
            </p>
          </div>
        </ScrollReveal>

        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          {sciencePrinciples.map((principle, i) => {
            const IconComponent = iconMap[principle.icon] || Brain
            return (
              <ScrollReveal key={principle.title} delay={i * 0.1}>
                <div className="border-border bg-card hover:border-accent/30 h-full rounded-2xl border p-8 transition-colors">
                  <div className="flex items-start gap-4">
                    <span className="bg-accent/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                      <IconComponent className="text-accent h-6 w-6" />
                    </span>
                    {/* The lead line holds a finding, not a figure. It was "10-30%" / "50%" /
                        "43%" under the label "Better retention", numbers that could not be
                        traced to the papers cited at the foot of each card. Text-xl rather
                        than text-2xl because a phrase needs to wrap where a number did not. */}
                    <div className="min-w-0 flex-1">
                      <div className="text-accent-strong text-xl leading-snug font-bold text-balance">
                        {principle.finding}
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs tracking-wider uppercase">
                        What the research shows
                      </div>
                    </div>
                  </div>

                  <h3 className="font-heading text-foreground mt-5 mb-2 text-xl font-bold tracking-tight">
                    {principle.title}
                  </h3>
                  <p className="text-muted-foreground mb-3 leading-relaxed">
                    {principle.description}
                  </p>
                  {/* Full muted-foreground, not /70: at 12px the faded variant lands at
                      2.99:1 in light mode. Size carries the hierarchy instead. */}
                  <p className="text-muted-foreground text-xs">
                    {principle.citation} · {principle.source}
                  </p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
