"use client"

import { useEffect, useState } from "react"
import { ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Scenario } from "@/lib/scenarios/types"

// Versioned because the four-file Python incident is an update to an existing question.
const DISMISSAL_KEY = "codesparring:cache-incident-release:2026-10-16"

interface DebuggingReleaseBannerProps {
  scenario: Scenario
  onView: (scenario: Scenario) => void
}

export function DebuggingReleaseBanner({ scenario, onView }: DebuggingReleaseBannerProps) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISSAL_KEY) !== "dismissed")
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  return (
    <aside
      aria-label="New Python debugging question"
      className="border-border bg-card mb-6 flex items-start gap-3 rounded-xl border p-4 sm:items-center"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground mb-1 text-xs font-medium">New · Python debugging</p>
          <h3 className="text-foreground text-sm font-semibold">{scenario.title}</h3>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Four Python files · Fix + extend · {scenario.estimatedTime} min
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-accent-strong hover:bg-muted h-11 shrink-0 gap-2 self-start px-2 sm:self-center"
          onClick={() => onView(scenario)}
        >
          View question <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="text-muted-foreground hover:bg-muted hover:text-foreground h-11 w-11 shrink-0"
        aria-label="Dismiss new question banner"
        onClick={() => {
          setVisible(false)
          try {
            localStorage.setItem(DISMISSAL_KEY, "dismissed")
          } catch {
            // Dismissal still works for this visit when browser storage is unavailable.
          }
        }}
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </Button>
    </aside>
  )
}
