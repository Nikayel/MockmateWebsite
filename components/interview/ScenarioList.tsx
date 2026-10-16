"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"

import type { Scenario } from "@/lib/scenarios"
import type { UsageLimit } from "@/lib/stores"

import { ScenarioCard } from "./ScenarioCard"
import { ScenarioListRow } from "./ScenarioListRow"
import type { ScenarioDensity } from "./useScenarioDensity"

// Progressive reveal: render a light initial batch and let users expand in chunks rather than
// mounting the whole catalog up front.
const INITIAL_VISIBLE = 18
const LOAD_MORE_STEP = 18

interface ScenarioListProps {
  density: ScenarioDensity
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
 * The discovery toolbar owns density; progressive reveal stays local so switching away from
 * the list still resets its expansion without losing the user's view preference.
 */
export function ScenarioList({
  density,
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
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  // Collapse the reveal back to the initial batch whenever the visible set changes, so an
  // expanded count from one search never leaks into the results of the next. Relies on the caller
  // memoizing `scenarios`; an array rebuilt every render would reset this on every keystroke.
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE)
  }, [scenarios])

  if (scenarios.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="border-border bg-muted/50 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border">
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
            className="border-border bg-card text-foreground hover:border-accent/40 hover:bg-accent/5 focus-visible:ring-accent/50 cursor-pointer rounded-full border px-5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
