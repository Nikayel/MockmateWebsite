"use client"

import { useState, type ComponentProps } from "react"
import type { Scenario } from "@/lib/scenarios/types"
import { SCENARIO_LANGUAGE_LABELS } from "@/lib/scenarios/languages"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScenarioCard } from "./ScenarioCard"
import { ScenarioListRow } from "./ScenarioListRow"

type Props = Omit<
  ComponentProps<typeof ScenarioCard>,
  "scenario" | "isSelected" | "isCompleted" | "languageChoice"
> & {
  variants: Scenario[]
  selectedScenarioId: string | null
  completedProblems: string[]
  density: "rows" | "cards"
}

/** Only the choice is local state. Start receives the complete, original language variant. */
export function ScenarioPracticeChoice({
  variants,
  selectedScenarioId,
  completedProblems,
  density,
  ...props
}: Props) {
  const [chosenId, setChosenId] = useState(selectedScenarioId)
  const scenario = variants.find(({ id }) => id === chosenId) ?? variants[0]
  const View = density === "rows" ? ScenarioListRow : ScenarioCard
  const languageChoice =
    variants.length > 1 ? (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">Language</span>
        <Select value={scenario.id} onValueChange={setChosenId} disabled={props.isStarting}>
          <SelectTrigger
            aria-label={`Practice language for ${scenario.title}`}
            className="bg-card min-h-11 w-36 text-sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {variants.map((variant) => (
              <SelectItem key={variant.id} value={variant.id} className="min-h-11">
                {variant.workspace
                  ? SCENARIO_LANGUAGE_LABELS[variant.workspace.language]
                  : variant.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : undefined
  return (
    <View
      {...props}
      scenario={scenario}
      isSelected={scenario.id === selectedScenarioId}
      isCompleted={completedProblems.includes(scenario.id)}
      languageChoice={languageChoice}
    />
  )
}
