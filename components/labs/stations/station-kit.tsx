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
    <Collapsible open={open} onOpenChange={onToggle} className="border-border rounded-lg border">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="text-foreground text-sm font-medium">{title}</span>
        <ChevronDown
          className={cn("text-muted-foreground h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 px-3 pb-3">
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
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
