"use client"

import { LayoutGrid, Rows3 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ScenarioDensity } from "./useScenarioDensity"

interface ScenarioViewControlProps {
  value: ScenarioDensity
  onChange: (density: ScenarioDensity) => void
}

export function ScenarioViewControl({ value, onChange }: ScenarioViewControlProps) {
  return (
    <div
      role="group"
      aria-label="Problem view"
      className="border-border inline-flex shrink-0 rounded-lg border p-0.5"
    >
      {(
        [
          { id: "cards", label: "Cards", title: "Card view", Icon: LayoutGrid },
          { id: "rows", label: "List", title: "List view", Icon: Rows3 },
        ] as const
      ).map(({ id, label, title, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          aria-label={title}
          title={title}
          className={cn(
            "focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
            value === id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
