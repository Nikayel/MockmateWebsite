"use client"

/**
 * CaseLabIntro — the start screen shown before a lab begins.
 *
 * Frames the company context (P6), previews the milestones, and lets the
 * candidate pick Practice vs Onsite before starting the run.
 */

import { useState } from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { CaseLabBrief } from "@/components/labs/CaseLabBrief"
import { CaseLabScopePanel } from "@/components/labs/CaseLabScopePanel"
import { CompanyLogo } from "@/components/labs/CompanyLogo"
import type { CaseLab, CaseLabMode } from "@/lib/labs/types"

const MODES: { id: CaseLabMode; label: string; description: string }[] = [
  {
    id: "practice",
    label: "Practice",
    description: "Open, hint-friendly. Move between milestones freely.",
  },
  {
    id: "onsite",
    label: "Onsite",
    description: "Interview conditions: a running clock and a curveball during Build.",
  },
]

export function CaseLabIntro({
  lab,
  onStart,
}: {
  lab: CaseLab
  onStart: (mode: CaseLabMode) => void
}) {
  const [mode, setMode] = useState<CaseLabMode>("practice")

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CompanyLogo company={lab.company} size="sm" showLabel />
          <span className="text-muted-foreground text-xs capitalize">· {lab.role}</span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-medium capitalize",
              difficultyColorClass(lab.difficulty, "softBadge")
            )}
          >
            {lab.difficulty}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {lab.estimatedMinutes} min
          </span>
        </div>
        <h1 className="text-foreground text-2xl font-bold">{lab.title}</h1>
      </header>

      <CaseLabBrief brief={lab.brief} />

      <section className="flex flex-col gap-1">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Why this company
        </h2>
        <p className="text-foreground text-sm">{lab.whyThisCompany}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          What you&apos;ll do
        </h2>
        <ol className="flex flex-col gap-2">
          {lab.milestones.map((milestone, i) => (
            <li key={milestone.kind} className="flex gap-3">
              <span className="border-border text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-foreground text-sm font-medium">{milestone.title}</span>
                  {milestone.mapsToRound && (
                    <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium">
                      {milestone.mapsToRound}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">{milestone.purpose}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {lab.coverage && <CaseLabScopePanel coverage={lab.coverage} />}

      <section className="flex flex-col gap-2">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Mode
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                mode === m.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <span className="text-foreground text-sm font-medium">{m.label}</span>
              <span className="text-muted-foreground text-xs">{m.description}</span>
            </button>
          ))}
        </div>
      </section>

      <Button type="button" onClick={() => onStart(mode)} className="self-start">
        Start lab
      </Button>
    </div>
  )
}
