import type { Scenario } from "@/lib/scenarios/types"
import {
  getBugfixCompanyProfile,
  type BugfixCompanyAlignment,
} from "@/lib/scenarios/company-alignment"

export function ScenarioCompanyAlignment({
  scenario,
}: {
  scenario: { type: Scenario["type"]; companyAlignment?: BugfixCompanyAlignment }
}) {
  if (scenario.type !== "bugfix") return null
  const profile = getBugfixCompanyProfile(scenario.companyAlignment ?? "generic")
  if (!profile) return <span className="text-muted-foreground text-xs">Generic debugging</span>

  return (
    <details className="text-muted-foreground text-xs leading-5">
      <summary className="focus-visible:ring-ring w-fit cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:outline-none">
        {profile.label} · {profile.round}
      </summary>
      <p className="mt-2">{profile.description}</p>
      <a
        href={profile.source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-strong focus-visible:ring-ring rounded-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
      >
        {profile.source.title}
      </a>
    </details>
  )
}
