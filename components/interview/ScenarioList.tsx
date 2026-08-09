"use client"

import { useEffect, useState } from "react"
import { LayoutGrid, Rows3, Search } from "lucide-react"

import type { Scenario } from "@/lib/scenarios"
import type { UsageLimit } from "@/lib/stores"
import { cn } from "@/lib/utils"

import { ScenarioCard } from "./ScenarioCard"
import { ScenarioListRow } from "./ScenarioListRow"

/** Density of a scenario list: rich cards for discovery, compact rows for scanning. */
type Density = "cards" | "rows"
const DENSITY_STORAGE_KEY = "mockmate_scenario_density"

// Progressive reveal: render a light initial batch and let users expand in chunks rather than
// mounting the whole catalog up front.
const INITIAL_VISIBLE = 18
const LOAD_MORE_STEP = 18

interface ScenarioListProps {
  /** Already narrowed to one track and filtered. This component does no selecting of its own. */
  scenarios: Scenario[]
  selectedScenarioId: string | null
  completedProblems: string[]
  usageLimit: UsageLimit | null
  /** True while a start is in flight, so a double-click cannot open a second session. */
  isStarting: boolean
  hasActiveFilters: boolean
  onClearFilters: () => void
  onSelect: (scenario: Scenario) => void
  onStart: (scenario: Scenario) => void
}

/**
 * A list of problems, at the density the user picked, revealed a batch at a time.
 *
 * Split out of `ScenarioBrowser` because both track surfaces render it and neither of them cares
 * how it works. Density and reveal state belong here rather than in the browser: they are
 * properties of a list, and keeping them local means a list that unmounts (switching to the DSA
 * roadmap, say) comes back collapsed instead of remembering an expansion from another context.
 */
export function ScenarioList({
  scenarios,
  selectedScenarioId,
  completedProblems,
  usageLimit,
  isStarting,
  hasActiveFilters,
  onClearFilters,
  onSelect,
  onStart,
}: ScenarioListProps) {
  const [density, setDensity] = useState<Density>("cards")
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  // Restore the user's preferred density once on mount (client-only).
  useEffect(() => {
    const saved = localStorage.getItem(DENSITY_STORAGE_KEY)
    if (saved === "cards" || saved === "rows") setDensity(saved)
  }, [])

  // Collapse the reveal back to the initial batch whenever the visible set changes, so an
  // expanded count from one search never leaks into the results of the next. Relies on the caller
  // memoizing `scenarios`; an array rebuilt every render would reset this on every keystroke.
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE)
  }, [scenarios])

  const updateDensity = (next: Density) => {
    setDensity(next)
    localStorage.setItem(DENSITY_STORAGE_KEY, next)
  }

  if (scenarios.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="border-border/[0.06] bg-card/[0.03] mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
          <Search className="text-muted-foreground h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground mb-2">No problems match your filters</p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 rounded-full px-2 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Clear all filters
          </button>
        )}
      </div>
    )
  }

  const visible = scenarios.slice(0, visibleCount)
  const remaining = scenarios.length - visible.length

  return (
    <>
      <div className="mb-4 flex justify-end">
        <div
          role="group"
          aria-label="List density"
          className="border-border/[0.06] bg-card/60 inline-flex rounded-lg border p-0.5"
        >
          {(
            [
              { id: "cards", label: "Cards", title: "Card view", Icon: LayoutGrid },
              { id: "rows", label: "List", title: "List view", Icon: Rows3 },
            ] as const
          ).map(({ id, label, title, Icon }) => {
            const isActive = density === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => updateDensity(id)}
                aria-pressed={isActive}
                // The visible label is hidden below `sm`, which also hides it from assistive
                // tech, so the name is spelled out here rather than left to the title attribute.
                aria-label={title}
                title={title}
                className={cn(
                  "focus-visible:ring-accent/50 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  isActive
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {density === "rows" ? (
        <div className="flex flex-col gap-1.5">
          {visible.map((scenario) => (
            <ScenarioListRow
              key={scenario.id}
              scenario={scenario}
              isSelected={selectedScenarioId === scenario.id}
              isCompleted={completedProblems.includes(scenario.id)}
              usageLimit={usageLimit}
              isStarting={isStarting}
              onSelect={onSelect}
              onStart={onStart}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isSelected={selectedScenarioId === scenario.id}
              isCompleted={completedProblems.includes(scenario.id)}
              usageLimit={usageLimit}
              isStarting={isStarting}
              onSelect={onSelect}
              onStart={onStart}
            />
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
            className="border-border/[0.08] bg-card/[0.03] text-foreground hover:bg-card/[0.06] focus-visible:ring-accent/50 rounded-full border px-5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Show more
            <span className="text-muted-foreground ml-1.5">
              ({Math.min(LOAD_MORE_STEP, remaining)})
            </span>
          </button>
          <p className="text-muted-foreground text-xs">
            Showing {visible.length} of {scenarios.length}
          </p>
        </div>
      )}
    </>
  )
}
