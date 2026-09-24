import { Code2 } from "lucide-react"
import { getScenarioLanguages, SCENARIO_LANGUAGE_LABELS, type Scenario } from "@/lib/scenarios"
import { cn } from "@/lib/utils"

interface ScenarioLanguageTagsProps {
  scenario: Scenario
  className?: string
  compact?: boolean
}

export function ScenarioLanguageTags({
  scenario,
  className,
  compact = false,
}: ScenarioLanguageTagsProps) {
  const languages = getScenarioLanguages(scenario)
  if (languages.length === 0) return null
  const visibleLanguages = compact ? languages.slice(0, 1) : languages

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {visibleLanguages.map((language) => (
        <span
          key={language}
          className="border-border bg-muted/70 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        >
          {!compact && <Code2 className="h-3 w-3" aria-hidden="true" />}
          {SCENARIO_LANGUAGE_LABELS[language]}
        </span>
      ))}
      {compact && languages.length > 1 && (
        <span className="text-muted-foreground text-[10px] font-medium">
          +{languages.length - 1}
        </span>
      )}
    </span>
  )
}
