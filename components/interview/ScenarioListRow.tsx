"use client"

import { memo, type ReactNode } from "react"
import Link from "next/link"
import { Play, Check, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Scenario } from "@/lib/scenarios"
import type { UsageLimit } from "@/lib/stores"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { getTypeConfig } from "./scenario-display"
import { getScenarioDiscoveryLabel } from "./scenario-discovery"
import { ScenarioLanguageTags } from "./ScenarioLanguageTags"
import { ScenarioPrerequisites } from "./ScenarioPrerequisites"
import { ScenarioCompanyAlignment } from "./ScenarioCompanyAlignment"

interface ScenarioListRowProps {
  scenario: Scenario
  isSelected: boolean
  isCompleted: boolean
  usageLimit: UsageLimit | null
  isStarting?: boolean
  onSelect: (scenario: Scenario) => void
  onStart: (scenario: Scenario) => void
  languageChoice?: ReactNode
}

export const ScenarioListRow = memo(function ScenarioListRow({
  scenario,
  isSelected,
  isCompleted,
  usageLimit,
  isStarting = false,
  onSelect,
  onStart,
  languageChoice,
}: ScenarioListRowProps) {
  const typeConfig = getTypeConfig(scenario.type)
  const discoveryLabel = getScenarioDiscoveryLabel(scenario, isCompleted)
  const isLocked = !!(usageLimit && usageLimit.allowed === false && scenario.type !== "dsa")
  const isDebugging = scenario.type === "bugfix" || scenario.type === "add-functionality"

  return (
    <article className="border-border bg-card grid min-w-0 gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6">
      <div className="min-w-0 space-y-2">
        <h3 className="text-foreground text-sm leading-6 font-semibold">{scenario.title}</h3>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1">
            <typeConfig.icon className="h-3.5 w-3.5" aria-hidden="true" />
            {typeConfig.cardLabel ?? typeConfig.label}
          </span>
          <span className={difficultyColorClass(scenario.difficulty, "textOnLight")}>
            <span className="capitalize">{scenario.difficulty}</span>
          </span>
          {languageChoice ? null : <ScenarioLanguageTags scenario={scenario} compact />}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {scenario.estimatedTime} min
          </span>
          {discoveryLabel && (
            <span className="text-accent-strong font-medium">{discoveryLabel}</span>
          )}
          {isCompleted && (
            <span className="text-neural inline-flex items-center gap-1">
              <Check className="h-3 w-3" aria-hidden="true" />
              Solved
            </span>
          )}
        </div>
        <ScenarioCompanyAlignment scenario={scenario} />
      </div>

      <div className={isDebugging ? "min-w-0 sm:w-72" : "sm:w-24"}>
        {languageChoice && <div className="mb-3">{languageChoice}</div>}
        <ScenarioPrerequisites scenario={scenario}>
          {isLocked ? (
            <Button asChild variant="outline" className="min-h-11 w-full">
              <Link href="/limit-reached">Upgrade</Link>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                onSelect(scenario)
                onStart(scenario)
              }}
              disabled={isStarting}
              loading={isStarting && isSelected}
              aria-label={`Start practice: ${scenario.title}`}
              className="bg-accent text-accent-foreground hover:bg-accent/90 min-h-11 w-full font-semibold"
            >
              {!(isStarting && isSelected) && <Play className="h-4 w-4" aria-hidden="true" />}
              {isStarting && isSelected ? "Starting..." : "Start"}
            </Button>
          )}
        </ScenarioPrerequisites>
      </div>
    </article>
  )
})
