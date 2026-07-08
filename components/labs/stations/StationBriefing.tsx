"use client"

/**
 * StationBriefing — the per-round instruction shown at the top of every station.
 *
 * Two jobs:
 *  1. Keep the interviewer's prompt for THIS round in front of the candidate the
 *     whole time (the question they clarify / decompose / design against), rather
 *     than leaving it on the start screen or collapsed behind "View brief".
 *  2. Teach the round: what it actually tests at this company, how to work it,
 *     what a strong answer looks like, and the classic trap — folded into a
 *     one-click disclosure so it never crowds the working area.
 *
 * Renders nothing when a lab has no authored `guidance` for the round, so older
 * labs degrade gracefully.
 */

import { useState } from "react"
import { AlertTriangle, Check, ChevronDown, MessageSquareQuote } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import type { MilestoneGuidance, MilestoneKind } from "@/lib/labs/types"

function GuidanceSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

function HowToBody({ guidance }: { guidance: MilestoneGuidance }) {
  return (
    <div className="flex flex-col gap-3.5 border-t border-[var(--wb-border)] px-3.5 py-3">
      <GuidanceSection label="What this round tests">
        <p className="text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">
          {guidance.whatItTests}
        </p>
      </GuidanceSection>

      <GuidanceSection label="How to approach it">
        <ol className="flex flex-col gap-1.5">
          {guidance.howToApproach.map((step, i) => (
            <li
              key={i}
              className="flex gap-2 text-[13px] leading-relaxed text-[var(--wb-text-secondary)]"
            >
              <span className="mt-px shrink-0 text-[11px] font-semibold text-[var(--wb-accent-strong)] tabular-nums">
                {i + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </GuidanceSection>

      <GuidanceSection label="What good looks like">
        <ul className="flex flex-col gap-1.5">
          {guidance.whatGoodLooksLike.map((marker, i) => (
            <li
              key={i}
              className="flex gap-2 text-[13px] leading-relaxed text-[var(--wb-text-secondary)]"
            >
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--wb-success)]" aria-hidden />
              <span>{marker}</span>
            </li>
          ))}
        </ul>
      </GuidanceSection>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-medium tracking-[0.08em] text-amber-600 uppercase dark:text-amber-400">
            Common trap
          </span>
          <span className="text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">
            {guidance.commonTrap}
          </span>
        </span>
      </div>
    </div>
  )
}

export function StationBriefing({ kind, className }: { kind: MilestoneKind; className?: string }) {
  const lab = useCaseLabStore((s) => s.activeLab)
  const [open, setOpen] = useState(false)

  const guidance = lab?.milestones.find((m) => m.kind === kind)?.guidance
  if (!guidance) return null

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--wb-border)] bg-[var(--wb-field-bg)]",
        className
      )}
    >
      {/* Persistent interviewer prompt — the question the candidate works against,
          kept on the practice surface the whole round. */}
      <div className="flex gap-2.5 border-l-2 border-[var(--wb-accent)] px-3.5 py-3">
        <MessageSquareQuote
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--wb-accent)]"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
            The interviewer asks
          </span>
          <p className="text-[13.5px] leading-relaxed font-medium text-[var(--wb-text)]">
            {guidance.interviewerPrompt}
          </p>
        </div>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 border-t border-[var(--wb-border)] px-3.5 py-2 text-left text-[12px] text-[var(--wb-muted)] transition-colors hover:text-[var(--wb-text)]">
          <span>{open ? "Hide how to approach this round" : "How to approach this round"}</span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <HowToBody guidance={guidance} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
