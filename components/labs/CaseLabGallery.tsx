"use client"

/**
 * CaseLabGallery — client-side browse surface for `/labs`. Renders the lab grid
 * plus company/skill filter chips. The lab list is authored content passed in
 * from the server page (plain serializable objects), so filtering stays on the
 * client without a round trip.
 */

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { CaseLabCard } from "@/components/labs/CaseLabCard"
import type { CaseLab } from "@/lib/labs/types"

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  )
}

export function CaseLabGallery({ labs }: { labs: CaseLab[] }) {
  const [company, setCompany] = useState<string | null>(null)
  const [skill, setSkill] = useState<string | null>(null)

  const companies = useMemo(
    () => Array.from(new Set(labs.map((lab) => lab.company))).sort(),
    [labs]
  )
  const skills = useMemo(
    () => Array.from(new Set(labs.flatMap((lab) => lab.skills))).sort(),
    [labs]
  )

  const filtered = useMemo(
    () =>
      labs.filter(
        (lab) => (!company || lab.company === company) && (!skill || lab.skills.includes(skill))
      ),
    [labs, company, skill]
  )

  // Only show a filter row when there's more than one value to choose from —
  // a single-company / single-skill catalog doesn't need chips.
  const showCompanyFilter = companies.length > 1
  const showSkillFilter = skills.length > 1

  return (
    <div className="flex flex-col gap-5">
      {(showCompanyFilter || showSkillFilter) && (
        <div className="flex flex-col gap-3">
          {showCompanyFilter && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground mr-1 text-xs font-medium">Company</span>
              <FilterChip label="All" active={company === null} onClick={() => setCompany(null)} />
              {companies.map((value) => (
                <FilterChip
                  key={value}
                  label={value}
                  active={company === value}
                  onClick={() => setCompany(value)}
                />
              ))}
            </div>
          )}
          {showSkillFilter && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground mr-1 text-xs font-medium">Skill</span>
              <FilterChip label="All" active={skill === null} onClick={() => setSkill(null)} />
              {skills.map((value) => (
                <FilterChip
                  key={value}
                  label={value}
                  active={skill === value}
                  onClick={() => setSkill(value)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm">No labs match these filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lab) => (
            <CaseLabCard key={lab.id} lab={lab} />
          ))}
        </div>
      )}
    </div>
  )
}
