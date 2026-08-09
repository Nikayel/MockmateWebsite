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
const TYPE_ICONS = Object.fromEntries(EXERCISE_TYPES.map((type) => [type.id, type.icon])) as Record<
  ScenarioType,
  typeof Bug
>

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
  // Debugging-track scenarios open with a reported symptom, not a task statement. The quote
  // bar marks the line as an incoming report — the visual language of a ticket, which is the
  // fiction those tracks sell.
  const contextIsReport = scenario.type === "bugfix" || scenario.type === "add-functionality"

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
      className={`group focus-visible:ring-accent/50 relative flex cursor-pointer flex-col rounded-xl border p-5 shadow-xs transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none ${
        isSelected
          ? "border-accent/50 bg-accent/5"
          : "border-border bg-card hover:border-accent/40 hover:bg-accent/5"
      }`}
    >
      {/* Top row: type marker + difficulty (left), status (right) */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
            <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {typeLabel}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${difficultyColorClass(scenario.difficulty, "badgeOnLight")}`}
          >
            {scenario.difficulty}
          </span>
        </div>
        {isCompleted && (
          <span className="bg-neural/10 text-neural inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
            <Check className="h-3 w-3" aria-hidden="true" />
            Solved
          </span>
        )}
      </div>

      {/* Focal point: title */}
      <h3 className="text-foreground mb-1.5 line-clamp-2 text-base leading-snug font-semibold">
        {scenario.title}
      </h3>

      {/* Context line — the differentiating signal per type. Debugging scenarios render it as a
          reported symptom (quote bar); DSA renders it as a plain pattern line. */}
      {contextLine &&
        (contextIsReport ? (
          <p className="border-accent/40 text-muted-foreground mb-4 line-clamp-2 border-l-2 pl-2.5 text-sm leading-6">
            {contextLine}
          </p>
        ) : (
          <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-6">{contextLine}</p>
        ))}

      {/* Quiet meta row */}
      <div className="text-muted-foreground mt-auto flex items-center justify-between gap-2 pt-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {scenario.estimatedTime} min
          {companies && (
            <span>
              · {companies}
              {extraCompanies}
            </span>
          )}
        </span>
        {signal && <span className="truncate text-right">{signal}</span>}
      </div>

      {/* Locked upsell */}
      {isLocked && (
        <div className="border-border bg-muted/50 mt-4 rounded-lg border p-3">
          <p className="text-foreground mb-1 text-xs font-medium">Session limit reached</p>
          <p className="text-muted-foreground mb-2 text-xs">
            Upgrade to Pro for 35 sessions every month
          </p>
          <Link href="/limit-reached">
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 h-7 w-full text-xs"
            >
              Upgrade
            </Button>
          </Link>
        </div>
      )}

      {/* One action, one step. The old Select-then-Start pair swapped the label under the
          cursor, which read as two controls and double-fired for double-clickers. A button
          that says what it does is both fewer clicks and harder to hit by accident. */}
      {!isLocked && (
        <div className="mt-4">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              // Select before starting so the in-flight state binds to this card.
              onSelect(scenario)
              onStart(scenario)
            }}
            disabled={isStarting}
            loading={isStarting && isSelected}
            aria-label={`Start practice: ${scenario.title}`}
            className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 w-full font-semibold"
          >
            {!(isStarting && isSelected) && <Play className="mr-2 h-4 w-4" aria-hidden="true" />}
            {isStarting && isSelected ? "Starting..." : "Start practice"}
          </Button>
          {usageLimit && usageLimit.allowed && scenario.type !== "dsa" && (
            <p className="text-muted-foreground mt-2 text-center text-[11px]">
              {usageLimit.limit - usageLimit.used} session
              {usageLimit.limit - usageLimit.used !== 1 ? "s" : ""} remaining
            </p>
          )}
        </div>
      )}
    </div>
  )
})
