"use client"

import { memo } from "react"
import Link from "next/link"
import { Play, Check, Clock, Cpu, Bug } from "lucide-react"
import { EXERCISE_TYPES } from "./scenario-display"
import { Button } from "@/components/ui/button"
import type { Scenario, ScenarioType } from "@/lib/scenarios"
import type { UsageLimit } from "@/lib/stores"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { getScenarioCardContext } from "./scenario-card-meta"

interface ScenarioCardProps {
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

// Derived from the shared EXERCISE_TYPES table so the card icons cannot drift from the filters.
const TYPE_ICONS = Object.fromEntries(
  EXERCISE_TYPES.map((type) => [type.id, type.icon])
) as Record<ScenarioType, typeof Bug>

export const ScenarioCard = memo(function ScenarioCard({
  scenario,
  isSelected,
  isCompleted,
  usageLimit,
  isStarting = false,
  onSelect,
  onStart,
}: ScenarioCardProps) {
  const TypeIcon = TYPE_ICONS[scenario.type] ?? Cpu
  const { typeLabel, contextLine, signal } = getScenarioCardContext(scenario)
  const isLocked = !!(usageLimit && usageLimit.allowed === false && scenario.type !== "dsa")
  const companies = scenario.companies.slice(0, 2).join(", ")
  const extraCompanies = scenario.companies.length > 2 ? ` +${scenario.companies.length - 2}` : ""

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
      className={`group focus-visible:ring-accent/60 relative flex cursor-pointer flex-col rounded-xl border p-5 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none ${
        isSelected
          ? "border-accent/40 bg-card/[0.05]"
          : "border-border/[0.07] bg-card/[0.02] hover:border-border hover:bg-card/[0.04]"
      }`}
    >
      {/* Top row: type marker + difficulty (left), status (right) */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TypeIcon className="h-3.5 w-3.5" />
            {typeLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
            <span
              className={`h-1.5 w-1.5 rounded-full ${difficultyColorClass(scenario.difficulty, "dot")}`}
            />
            {scenario.difficulty}
          </span>
        </div>
        {isCompleted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
            <Check className="h-3 w-3" />
            Solved
          </span>
        )}
      </div>

      {/* Focal point: title */}
      <h3 className="mb-1.5 line-clamp-2 text-base leading-snug font-semibold text-foreground">
        {scenario.title}
      </h3>

      {/* Context line — the differentiating signal per type */}
      {contextLine && (
        <p className="mb-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{contextLine}</p>
      )}

      {/* Quiet meta row */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {scenario.estimatedTime} min
          {companies && (
            <span className="text-muted-foreground">
              · {companies}
              {extraCompanies}
            </span>
          )}
        </span>
        {signal && <span className="truncate text-right text-muted-foreground">{signal}</span>}
      </div>

      {/* Locked upsell */}
      {isLocked && (
        <div className="mt-4 rounded-lg border border-border bg-card/[0.04] p-3">
          <p className="mb-1 text-xs font-medium text-foreground">Session limit reached</p>
          <p className="mb-2 text-xs text-muted-foreground">
            Upgrade to Pro for 35 sessions every month
          </p>
          <Link href="/limit-reached">
            <Button
              size="sm"
              className="h-7 w-full bg-card text-xs text-foreground hover:bg-muted"
            >
              Upgrade
            </Button>
          </Link>
        </div>
      )}

      {/* Single primary action */}
      <div className="mt-4">
        {isSelected ? (
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onStart(scenario)
            }}
            disabled={isLocked}
            loading={isStarting}
            className="w-full bg-card font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            {!isStarting && <Play className="mr-2 h-4 w-4" />}
            {isStarting ? "Starting..." : "Start practice"}
          </Button>
        ) : (
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(scenario)
            }}
            variant="outline"
            className="w-full border-border/[0.08] bg-transparent text-muted-foreground hover:bg-card/[0.06] hover:text-foreground"
          >
            Select
          </Button>
        )}
        {!isLocked && usageLimit && usageLimit.allowed && scenario.type !== "dsa" && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {usageLimit.limit - usageLimit.used} session
            {usageLimit.limit - usageLimit.used !== 1 ? "s" : ""} remaining
          </p>
        )}
      </div>
    </div>
  )
})
