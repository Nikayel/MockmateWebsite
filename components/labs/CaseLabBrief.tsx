"use client"

/**
 * CaseLabBrief — the problem context (situation + task) for a Case Lab.
 *
 * Single source of truth for how a brief is presented, reused in two places:
 * - the intro screen (`open`, static), where the candidate first reads it;
 * - the lab shell (collapsible), so the context stays one click away on every
 *   milestone instead of vanishing the moment the lab starts.
 */

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CaseLabBrief as CaseLabBriefData } from "@/lib/labs/types"

function BriefBody({ brief }: { brief: CaseLabBriefData }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground text-sm leading-relaxed">{brief.situation}</p>
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Your task
        </span>
        <p className="text-foreground text-sm leading-relaxed">{brief.task}</p>
      </div>
    </div>
  )
}

/**
 * Static brief block for the intro screen.
 */
export function CaseLabBrief({ brief }: { brief: CaseLabBriefData }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        The brief
      </h2>
      <BriefBody brief={brief} />
    </section>
  )
}

/**
 * Collapsible brief for the lab shell — collapsed by default to a "View brief"
 * toggle so the active station owns the space (progressive disclosure), with the
 * full situation + task one click away on every milestone.
 */
export function CaseLabBriefPanel({
  brief,
  defaultOpen = false,
  className,
}: {
  brief: CaseLabBriefData
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-fit items-center gap-1.5 text-[12px] text-[var(--wb-muted)] transition-colors hover:text-[var(--wb-text)]"
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
        {open ? "Hide brief" : "View brief"}
      </button>
      {open && (
        <div className="rounded-lg border border-[var(--wb-border)] bg-[var(--wb-field-bg)] px-4 py-3.5 text-[13px] leading-[1.7] text-[var(--wb-text-secondary)]">
          <p>{brief.situation}</p>
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
              Your task
            </span>
            <p>{brief.task}</p>
          </div>
        </div>
      )}
    </div>
  )
}
