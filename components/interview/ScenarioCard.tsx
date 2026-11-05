"use client"

import { memo, type ReactNode } from "react"
import Link from "next/link"
import { Play, Check, Clock, ListTree } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Scenario } from "@/lib/scenarios"
import type { UsageLimit } from "@/lib/stores"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { getScenarioLabLink } from "@/lib/labs/lab-links"
import { getTypeConfig } from "./scenario-display"
import { getScenarioDiscoveryLabel } from "./scenario-discovery"
import { GuidedLabPreview } from "./GuidedLabPreview"
import { ScenarioLanguageTags } from "./ScenarioLanguageTags"
import { ScenarioPrerequisites } from "./ScenarioPrerequisites"
import { ScenarioCompanyAlignment } from "./ScenarioCompanyAlignment"

interface ScenarioCardProps {
  scenario: Scenario
  isSelected: boolean
  isCompleted: boolean
  usageLimit: UsageLimit | null
  isStarting?: boolean
  onSelect: (scenario: Scenario) => void
  onStart: (scenario: Scenario) => void
  languageChoice?: ReactNode
}

export const ScenarioCard = memo(function ScenarioCard({
  scenario,
  isSelected,
  isCompleted,
  usageLimit,
  isStarting = false,
  onSelect,
  onStart,
  languageChoice,
}: ScenarioCardProps) {
  const guidedLab = scenario.type === "bugfix" ? scenario.guidedLab : undefined
  const typeConfig = getTypeConfig(scenario.type)
  const TypeIcon = guidedLab ? ListTree : typeConfig.icon
  const typeLabel = guidedLab ? "Guided lab" : (typeConfig.cardLabel ?? typeConfig.label)
  const labLink = getScenarioLabLink(scenario.id)
  const discoveryLabel = getScenarioDiscoveryLabel(scenario, isCompleted)
  const isLocked = !!(usageLimit && usageLimit.allowed === false && scenario.type !== "dsa")

  return (
    <article
      className={`border-border bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-xs ${guidedLab ? "md:col-span-2 lg:col-span-3" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
          <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {typeLabel}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {discoveryLabel && (
            <span className="bg-accent/10 text-accent-strong rounded-full px-2 py-0.5 text-xs font-medium">
              {discoveryLabel}
            </span>
          )}
          {isCompleted && (
            <span className="bg-neural/10 text-neural inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
              <Check className="h-3 w-3" aria-hidden="true" />
              Solved
            </span>
          )}
        </div>
      </div>

      <h3 className="text-foreground text-base leading-6 font-semibold">{scenario.title}</h3>

      <ScenarioCompanyAlignment scenario={scenario} />

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        {!guidedLab && (
          <span
            className={`rounded-full px-2 py-0.5 font-medium capitalize ${difficultyColorClass(scenario.difficulty, "badgeOnLight")}`}
          >
            {scenario.difficulty}
          </span>
        )}
        {languageChoice ? null : <ScenarioLanguageTags scenario={scenario} />}
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {scenario.estimatedTime} min
        </span>
      </div>

      {guidedLab && <GuidedLabPreview config={guidedLab} />}
      {languageChoice}

      {labLink && (
        <Link
          href={`/labs/${labLink.labId}`}
          className="text-accent-strong focus-visible:ring-ring w-fit rounded-sm text-xs font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
        >
          Guided version: {labLink.labTitle}
        </Link>
      )}

      <div className="mt-auto pt-1">
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
              {isStarting && isSelected ? "Starting..." : "Start practice"}
            </Button>
          )}
        </ScenarioPrerequisites>
      </div>
    </article>
  )
})
