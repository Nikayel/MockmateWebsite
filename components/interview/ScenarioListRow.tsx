"use client"

import { memo } from "react"
import Link from "next/link"
import { Play, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Scenario } from "@/lib/scenarios"
import type { UsageLimit } from "@/lib/stores"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { getTypeConfig } from "./scenario-display"
import { STARTER_SCENARIO_ID } from "./scenario-card-meta"

interface ScenarioListRowProps {
  scenario: Scenario
  isSelected: boolean
  isCompleted: boolean
  usageLimit: UsageLimit | null
  // True while a session start is in flight; keeps the Start button loading and
  // disabled so a second click cannot open a duplicate session.
  isStarting?: boolean
  onSelect: (scenario: Scenario) => void
  onStart: (scenario: Scenario) => void
}

// Compact, scannable row for the List density mode (LeetCode/HackerRank-style).
// One line on desktop, gracefully wraps on small screens.
export const ScenarioListRow = memo(function ScenarioListRow({
  scenario,
  isSelected,
  isCompleted,
  usageLimit,
  isStarting = false,
  onSelect,
  onStart,
}: ScenarioListRowProps) {
  const typeConfig = getTypeConfig(scenario.type)
  const isLocked = !!(usageLimit && usageLimit.allowed === false && scenario.type !== "dsa")

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(scenario)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(scenario)
        }
      }}
      aria-pressed={isSelected}
      className={`group focus-visible:ring-accent/50 flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none sm:gap-4 sm:px-4 ${
        isSelected
          ? "border-accent/50 bg-accent/5"
          : "border-border bg-card hover:border-accent/40 hover:bg-accent/5"
      }`}
    >
      {/* Completion status */}
      <div className="flex w-5 flex-shrink-0 justify-center">
        {isCompleted ? (
          <Check className="text-neural h-4 w-4" aria-label="Solved" />
        ) : (
          <span className="bg-border h-1.5 w-1.5 rounded-full" aria-hidden="true" />
        )}
      </div>

      {/* Type icon */}
      <span
        className="bg-muted text-muted-foreground hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg sm:flex"
        title={typeConfig.label}
      >
        <typeConfig.icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>

      {/* Title + meta (the flexible, truncating column) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-foreground truncate font-medium">{scenario.title}</span>
          {/* Same starter chip as the card view; the title truncates, the chip does not. */}
          {scenario.id === STARTER_SCENARIO_ID && !isCompleted && (
            <span className="bg-accent/10 text-accent-strong flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium">
              Start here
            </span>
          )}
        </span>
        <span className="text-muted-foreground flex items-center gap-2 truncate text-xs">
          <span className="sm:hidden">{typeConfig.label}</span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {scenario.estimatedTime} min
          </span>
          {scenario.companies.length > 0 && (
            <span className="hidden truncate md:inline">
              {scenario.companies.slice(0, 2).join(", ")}
              {scenario.companies.length > 2 && ` +${scenario.companies.length - 2}`}
            </span>
          )}
        </span>
      </div>

      {/* Tags — only on wide screens where there's room */}
      <div className="hidden max-w-[200px] flex-shrink-0 gap-1.5 lg:flex">
        {scenario.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="bg-muted text-muted-foreground truncate rounded-full px-2 py-0.5 text-[10px]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Difficulty */}
      <div className="flex w-[72px] flex-shrink-0 items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${difficultyColorClass(scenario.difficulty, "dot")}`}
          aria-hidden="true"
        />
        <span className="text-muted-foreground text-xs font-medium capitalize">
          {scenario.difficulty}
        </span>
      </div>

      {/* One action, one step — same reasoning as the card: a labeled Start beats a
          Select that swaps into Start under the cursor. */}
      <div className="flex-shrink-0">
        {isLocked ? (
          <Link href="/limit-reached" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs">
              Upgrade
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              // Select before starting so the in-flight state binds to this row.
              onSelect(scenario)
              onStart(scenario)
            }}
            disabled={isStarting}
            loading={isStarting && isSelected}
            aria-label={`Start practice: ${scenario.title}`}
            className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 h-8 rounded-full px-3 text-xs font-semibold"
          >
            {!(isStarting && isSelected) && <Play className="mr-1 h-3 w-3" aria-hidden="true" />}
            {isStarting && isSelected ? "Starting..." : "Start"}
          </Button>
        )}
      </div>
    </div>
  )
})
