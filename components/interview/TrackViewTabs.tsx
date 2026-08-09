"use client"

import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface TrackViewTab<Id extends string> {
  id: Id
  label: string
  Icon: LucideIcon
}

interface TrackViewTabsProps<Id extends string> {
  /** Names the group for screen readers, e.g. "DSA practice view". */
  label: string
  tabs: readonly TrackViewTab<Id>[]
  value: Id
  onChange: (id: Id) => void
  className?: string
}

/**
 * The segmented control a track uses to switch between its own views.
 *
 * Deliberately not `role="tablist"`: these buttons swap whole page sections rather than panels
 * wired to them by id, and a tablist that lies about its panels is worse for a screen reader than
 * an honest group of toggles. `aria-pressed` states which view is showing.
 */
export function TrackViewTabs<Id extends string>({
  label,
  tabs,
  value,
  onChange,
  className,
}: TrackViewTabsProps<Id>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "border-border/[0.06] bg-card/[0.02] inline-flex rounded-full border p-1",
        className
      )}
    >
      {tabs.map(({ id, label: tabLabel, Icon }) => {
        const isActive = id === value
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={isActive}
            className={cn(
              "focus-visible:ring-accent/50 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
              isActive
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {tabLabel}
          </button>
        )
      })}
    </div>
  )
}
