import type { ReactElement } from "react"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Scenario } from "@/lib/scenarios/types"
import { getScenarioLanguages, SCENARIO_LANGUAGE_LABELS } from "@/lib/scenarios/languages"
import { getScenarioPrerequisites } from "@/lib/scenarios/prerequisites"

/** Optional adjacent action keeps preparation and Start together in both catalog layouts. */
export function ScenarioPrerequisites({
  scenario,
  children,
}: {
  scenario: Scenario
  children?: ReactElement
}) {
  const topics = getScenarioPrerequisites(scenario)
  if (topics.length === 0) return children ?? null

  const languages = getScenarioLanguages(scenario)
    .map((language) => SCENARIO_LANGUAGE_LABELS[language])
    .join(" or ")

  return (
    <Collapsible key={scenario.id} className={children ? "flex flex-wrap gap-2" : "space-y-3"}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Prerequisites for ${scenario.title}`}
          className={`border-foreground/25 text-foreground hover:bg-muted hover:text-foreground min-h-11 font-medium ${children ? "flex-1 basis-32" : "w-full"}`}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Prerequisites
        </Button>
      </CollapsibleTrigger>
      {children && <div className="flex-1 basis-32">{children}</div>}
      <CollapsibleContent
        role="region"
        aria-label={`Prerequisites for ${scenario.title}`}
        className="border-border bg-muted/40 basis-full rounded-lg border p-4"
      >
        <p className="text-foreground mb-1 text-sm font-semibold">Before you start</p>
        <p className="text-muted-foreground mb-3 text-sm leading-6">
          Basic {languages ? `${languages} ` : "coding "}syntax, functions, and familiarity with:
        </p>
        <ul aria-label="Prerequisite topics" className="space-y-2.5 text-sm leading-6">
          {topics.map((topic) => (
            <li key={topic.id}>
              <span className="text-foreground font-medium">{topic.label}</span>
              <p className="text-muted-foreground">{topic.description}</p>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
