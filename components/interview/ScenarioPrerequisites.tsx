import { BookOpen, ChevronDown } from "lucide-react"
import type { Scenario } from "@/lib/scenarios/types"
import { getScenarioLanguages, SCENARIO_LANGUAGE_LABELS } from "@/lib/scenarios/languages"
import { getScenarioPrerequisites } from "@/lib/scenarios/prerequisites"

/** The browser owns disclosure state; changing questions starts the preview collapsed. */
export function ScenarioPrerequisites({ scenario }: { scenario: Scenario }) {
  const topics = getScenarioPrerequisites(scenario)
  if (topics.length === 0) return null

  const languages = getScenarioLanguages(scenario)
    .map((language) => SCENARIO_LANGUAGE_LABELS[language])
    .join(" or ")

  return (
    <details key={scenario.id} className="group/prerequisites border-border/60 border-t">
      <summary className="text-foreground hover:text-accent-strong focus-visible:ring-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <BookOpen className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        Prerequisites
        <span className="text-muted-foreground text-xs font-normal">{topics.length} topics</span>
        <ChevronDown
          className="text-muted-foreground ml-auto h-4 w-4 shrink-0 transition-transform group-open/prerequisites:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <p className="text-muted-foreground mb-3 text-sm leading-6">
        Basic {languages ? `${languages} ` : "coding "}syntax, functions, and familiarity with:
      </p>
      <ul aria-label="Prerequisite topics" className="mb-3 space-y-2.5 text-sm leading-6">
        {topics.map((topic) => (
          <li key={topic.id}>
            <span className="text-foreground font-medium">{topic.label}</span>
            <p className="text-muted-foreground">{topic.description}</p>
          </li>
        ))}
      </ul>
    </details>
  )
}
