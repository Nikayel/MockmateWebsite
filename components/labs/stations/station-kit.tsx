"use client"

/**
 * Shared building blocks for Case Lab form stations (Clarify / Decompose /
 * Design). Keeps the progressive-disclosure panel and row-remove control in one
 * place so stations stay consistent and DRY.
 */

import type { ReactNode } from "react"
import { ChevronDown, X } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Shared station header — a context tag (the milestone kind), the prompt as an
 * 18px H1, and an optional one-line description. Keeps every station's heading
 * typography identical to the workbook spec.
 */
export function StationHeader({
  tag,
  title,
  titleId,
  description,
}: {
  tag: string
  title: string
  titleId: string
  description?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
        {tag}
      </span>
      <h2 id={titleId} className="text-[18px] leading-tight font-medium text-[var(--wb-text)]">
        {title}
      </h2>
      {description ? (
        <p className="text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">{description}</p>
      ) : null}
    </header>
  )
}

/** A titled, collapsible panel — the unit of progressive disclosure (P2). */
export function CollapsiblePanel({
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string
  hint?: string
  open: boolean
  onToggle: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onToggle}
      className="rounded-lg border border-[var(--wb-border)]"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="text-[13px] font-medium text-[var(--wb-text)]">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--wb-muted)] transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 px-3 pb-3">
        {hint ? <p className="text-[11px] text-[var(--wb-faint)]">{hint}</p> : null}
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

/** Icon button for removing a row from a dynamic list. */
export function RemoveRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={label}
      className="text-muted-foreground shrink-0"
    >
      <X className="h-4 w-4" aria-hidden />
    </Button>
  )
}
