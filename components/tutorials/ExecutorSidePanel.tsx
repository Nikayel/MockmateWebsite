"use client"

import { useState } from "react"
import { ProblemNotesPanel } from "./ProblemNotesPanel"
import { UnderstandPlanImplementPanel } from "./UnderstandPlanImplementPanel"

/**
 * The Python Executor's left panel: two tabs sharing one column so the code editor keeps most of
 * the width. "Problem" is a paste-and-read reference (the description, rendered nicely); "Scratchpad"
 * is the Understand → Plan → Implement working notes. Both tabs stay mounted (not remounted on
 * switch) so neither loses its text while the other is active.
 */
type Tab = "problem" | "scratchpad"

const TABS: { key: Tab; label: string }[] = [
  { key: "problem", label: "Problem" },
  { key: "scratchpad", label: "Scratchpad" },
]

export function ExecutorSidePanel() {
  const [tab, setTab] = useState<Tab>("problem")

  return (
    <div className="border-border bg-card flex min-h-0 w-[300px] shrink-0 flex-col border-r">
      <div
        role="tablist"
        aria-label="Executor side panel"
        className="border-border bg-muted/40 flex shrink-0 gap-1 border-b px-2 py-1.5"
      >
        {TABS.map((item) => {
          const selected = tab === item.key
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.key)}
              className={[
                "focus-visible:ring-accent/50 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                selected
                  ? "bg-accent/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1" hidden={tab !== "problem"}>
        <ProblemNotesPanel />
      </div>
      <div className="min-h-0 flex-1" hidden={tab !== "scratchpad"}>
        <UnderstandPlanImplementPanel />
      </div>
    </div>
  )
}
