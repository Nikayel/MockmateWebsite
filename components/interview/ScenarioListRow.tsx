"use client"

import { memo } from "react"
import Link from "next/link"
import { Play, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Scenario } from "@/lib/scenarios"
import type { UsageLimit } from "@/lib/stores"
import { getDifficultyDot, getTypeConfig } from "./scenario-display"

interface ScenarioListRowProps {
  scenario: Scenario
  isSelected: boolean
  isCompleted: boolean
  usageLimit: UsageLimit | null
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
      className={`group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-200 sm:gap-4 sm:px-4 ${
        isSelected
          ? "border-border bg-card/[0.06]"
          : "border-border/[0.06] bg-card/[0.02] hover:border-border hover:bg-card/[0.045]"
      }`}
    >
      {/* Completion status */}
      <div className="flex w-5 flex-shrink-0 justify-center">
        {isCompleted ? (
          <Check className="h-4 w-4 text-emerald-300" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-muted" aria-hidden="true" />
        )}
      </div>

      {/* Type icon */}
      <span
        className="hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-card/[0.05] text-muted-foreground sm:flex"
        title={typeConfig.label}
      >
        <typeConfig.icon className="h-3.5 w-3.5" />
      </span>

      {/* Title + meta (the flexible, truncating column) */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-foreground">{scenario.title}</span>
        <span className="flex items-center gap-2 truncate text-xs text-muted-foreground">
          <span className="sm:hidden">{typeConfig.label}</span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <Clock className="h-3 w-3" />
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
            className="truncate rounded-full bg-card/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Difficulty */}
      <div className="flex w-[72px] flex-shrink-0 items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${getDifficultyDot(scenario.difficulty)}`}
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-muted-foreground capitalize">{scenario.difficulty}</span>
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        {isLocked ? (
          <Link href="/limit-reached" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-full border-border/[0.08] bg-card/[0.02] px-3 text-xs text-muted-foreground hover:bg-card/[0.08] hover:text-foreground"
            >
              Upgrade
            </Button>
          </Link>
        ) : isSelected ? (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onStart(scenario)
            }}
            className="h-8 rounded-full bg-card px-3 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
          >
            <Play className="mr-1 h-3 w-3" />
            Start
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(scenario)
            }}
            className="h-8 rounded-full border-border/[0.08] bg-card/[0.02] px-3 text-xs text-muted-foreground hover:bg-card/[0.08] hover:text-foreground"
          >
            Select
          </Button>
        )}
      </div>
    </div>
  )
})
