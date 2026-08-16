"use client"

/**
 * CaseLabGallery — the filterable browse list on `/labs`.
 *
 * Scope note: this used to own the whole page, heading and intro copy included, which meant the
 * only explanation of what a case lab is lived inside a client component below a filter bar. The
 * page (`app/labs/page.tsx`) now owns the chrome and the prose as Server Components, and this is
 * back to the one thing that has to be interactive: chips, and the list they narrow.
 *
 * The lab list is authored content passed in from the server page (plain serializable objects), so
 * filtering stays on the client without a round trip. Filter state is `useState` and deliberately
 * NOT the URL: a four-lab catalog behind query-string filters would mint a couple of dozen
 * near-identical indexable URLs, which is a doorway-page generator rather than navigation.
 */

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { CaseLabRow } from "@/components/labs/CaseLabRow"
import { groupCaseLabsByRound } from "@/lib/labs/case-lab-rounds"
import { trackCaseLabListViewed } from "@/lib/labs/case-lab-analytics"
import type { BrowsableCaseLab } from "@/lib/labs/types"

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

export function CaseLabGallery({ labs }: { labs: BrowsableCaseLab[] }) {
  const [company, setCompany] = useState<string | null>(null)
  // Skills are multi-select but capped at MAX_SKILLS so the filter stays a quick
  // narrowing tool, not an unbounded query builder.
  const [skills, setSkills] = useState<string[]>([])

  // Top of the lab funnel. Fires once per mount, not per filter change: the question this answers is
  // how many people saw the catalog at all, against which starts can be read.
  const labCount = labs.length
  useEffect(() => {
    trackCaseLabListViewed({ labCount })
  }, [labCount])

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

  // Grouped by the round each lab's build milestone puts you in — the same grouping the prose above
  // the list explains, from the same constant.
  const groups = useMemo(() => groupCaseLabsByRound(filtered), [filtered])

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
    <section aria-labelledby="all-case-labs" className="flex flex-col gap-5">
      <h2 id="all-case-labs" className="text-xl font-semibold text-[var(--wb-text)] sm:text-2xl">
        All case labs
      </h2>

      {(showCompanyFilter || showSkillFilter) && (
        <div className="flex flex-col gap-3">
          {showCompanyFilter && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-[var(--wb-text-secondary)]">
                Company
              </span>
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
              <span className="mr-1 text-xs font-medium text-[var(--wb-text-secondary)]">
                Skill (max {MAX_SKILLS})
              </span>
              <FilterChip label="All" active={skills.length === 0} onClick={() => setSkills([])} />
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
        <p className="text-sm text-[var(--wb-text-secondary)]" role="status">
          No labs match these filters.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(({ group, labs: groupLabs }) => (
            <div key={group.type} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-[var(--wb-text-secondary)] uppercase">
                {group.heading}
              </h3>
              <div className="divide-y divide-[var(--wb-border)] overflow-hidden rounded-xl border border-[var(--wb-border)] bg-[var(--wb-main)]">
                {groupLabs.map((lab) => (
                  <CaseLabRow key={lab.id} lab={lab} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
