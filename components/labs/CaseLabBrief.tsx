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
import { ChevronDown, FileText } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
 * Collapsible brief for the lab shell — defaults open so context is visible, but
 * can be tucked away to give the active station more room.
 */
export function CaseLabBriefPanel({
  brief,
  defaultOpen = true,
  className,
}: {
  brief: CaseLabBriefData
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn("border-border rounded-lg border", className)}
    >
      <CollapsibleTrigger
        className="text-foreground flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium"
        aria-label="Toggle the problem brief"
      >
        <span className="flex items-center gap-2">
          <FileText className="text-muted-foreground h-4 w-4" aria-hidden />
          The brief
        </span>
        <ChevronDown
          className={cn("text-muted-foreground h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <BriefBody brief={brief} />
      </CollapsibleContent>
    </Collapsible>
  )
}
