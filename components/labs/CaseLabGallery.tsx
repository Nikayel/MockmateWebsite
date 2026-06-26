"use client"

/**
 * CaseLabGallery — client-side browse surface for `/labs`. Renders the lab grid
 * plus company/skill filter chips. The lab list is authored content passed in
 * from the server page (plain serializable objects), so filtering stays on the
 * client without a round trip.
 */

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { CaseLabRow } from "@/components/labs/CaseLabRow"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { CaseLab } from "@/lib/labs/types"

/** A user can narrow by at most this many skills at once. */
const MAX_SKILLS = 2

function FilterChip({
  label,
  active,
  onClick,
  disabled = false,
}: {
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-[var(--wb-accent)] bg-[var(--wb-accent-soft)] text-[var(--wb-accent-strong)]"
          : "border-[var(--wb-border)] text-[var(--wb-text-secondary)] hover:bg-black/[0.03]",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
      )}
    >
      {label}
    </button>
  )
}

export function CaseLabGallery({ labs }: { labs: CaseLab[] }) {
  const [company, setCompany] = useState<string | null>(null)
  // Skills are multi-select but capped at MAX_SKILLS so the filter stays a quick
  // narrowing tool, not an unbounded query builder.
  const [skills, setSkills] = useState<string[]>([])

  const companies = useMemo(
    () => Array.from(new Set(labs.map((lab) => lab.company))).sort(),
    [labs]
  )
  const allSkills = useMemo(
    () => Array.from(new Set(labs.flatMap((lab) => lab.skills))).sort(),
    [labs]
  )

  const filtered = useMemo(
    () =>
      labs.filter(
        (lab) =>
          (!company || lab.company === company) &&
          skills.every((skill) => lab.skills.includes(skill))
      ),
    [labs, company, skills]
  )

  const toggleSkill = (value: string) => {
    setSkills((current) => {
      if (current.includes(value)) return current.filter((s) => s !== value)
      if (current.length >= MAX_SKILLS) return current // cap reached — ignore
      return [...current, value]
    })
  }

  // Only show a filter row when there's more than one value to choose from —
  // a single-company / single-skill catalog doesn't need chips.
  const showCompanyFilter = companies.length > 1
  const showSkillFilter = allSkills.length > 1
  const skillCapReached = skills.length >= MAX_SKILLS

  return (
    <div className="case-lab-workbook min-h-screen bg-[var(--wb-page)] text-[var(--wb-text)]">
      <div className="container mx-auto max-w-5xl px-4 pt-24 pb-16 sm:pt-28">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-[var(--wb-text)]">Case Labs</h1>
            <p className="text-sm text-[var(--wb-text-secondary)]">
              Company-style problems you carry end to end — clarify, decompose, design, then build
              the fix inside a real codebase.
            </p>
          </div>
          <ThemeToggle className="mt-1 shrink-0" />
        </header>

        <div className="flex flex-col gap-5">
          {(showCompanyFilter || showSkillFilter) && (
            <div className="flex flex-col gap-3">
              {showCompanyFilter && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-medium text-[var(--wb-muted)]">Company</span>
                  <FilterChip
                    label="All"
                    active={company === null}
                    onClick={() => setCompany(null)}
                  />
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
                  <span className="mr-1 text-xs font-medium text-[var(--wb-muted)]">
                    Skill <span className="text-[var(--wb-faint)]">(max {MAX_SKILLS})</span>
                  </span>
                  <FilterChip
                    label="All"
                    active={skills.length === 0}
                    onClick={() => setSkills([])}
                  />
                  {allSkills.map((value) => {
                    const active = skills.includes(value)
                    return (
                      <FilterChip
                        key={value}
                        label={value}
                        active={active}
                        disabled={!active && skillCapReached}
                        onClick={() => toggleSkill(value)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--wb-text-secondary)]">No labs match these filters.</p>
          ) : (
            <div className="divide-y divide-[var(--wb-border)] overflow-hidden rounded-xl border border-[var(--wb-border)] bg-[var(--wb-main)]">
              {filtered.map((lab) => (
                <CaseLabRow key={lab.id} lab={lab} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
