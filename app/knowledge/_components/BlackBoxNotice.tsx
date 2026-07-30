"use client"

import { EyeOff } from "lucide-react"

/**
 * Shown in the black-box (study control) condition: the model exists but its
 * beliefs are not exposed and challenges are disabled.
 */
export function BlackBoxNotice() {
  return (
    <div className="border-border bg-card/30 mb-6 flex items-start gap-3 rounded-xl border p-4">
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
