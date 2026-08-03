"use client"

import { EyeOff } from "lucide-react"

/**
 * Shown in the black-box (study control) condition: the model exists but its
 * beliefs are not exposed and challenges are disabled.
 */
export function BlackBoxNotice() {
  return (
    // Solid, like every other card on the page. bg-card/30 composites within
    // ~1.03:1 of the page background in both themes — a border around nothing —
    // and this notice escaped the surfaces sweep only because it was not in that
    // directive's file list.
    <div className="border-border bg-card mb-6 flex items-start gap-3 rounded-xl border p-4 shadow-sm">
      <EyeOff className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-foreground text-sm font-medium">
          Progress details are hidden for your account
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          The system still schedules your reviews the same way — your practice queue is unaffected.
        </p>
      </div>
    </div>
  )
}
