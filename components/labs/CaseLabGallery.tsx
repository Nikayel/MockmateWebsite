"use client"

/**
 * CaseLabGallery — the browse grid on `/labs`, and the only thing on this page that has to be
 * interactive.
 *
 * ## Why there is only one filter row
 *
 * There used to be three: company, a chip per skill in the registry (eighteen of them, four rows
 * deep), and the section heading above both. Over a four-lab catalog that is a filter surface larger
 * than the thing being filtered, and it sat between the visitor and the labs. Company survives
 * because "I have a Palantir onsite" is the one narrowing a visitor actually arrives with, and it
 * sits inline with the heading so it costs no vertical space. Skills stay visible on the cards,
 * where they describe a lab instead of asking a question.
 *
 * ## Group headers carry ONE definition
 *
 * The round each group represents used to be explained twice: once here and once in a section
 * 700px further down, in different words. The second one is deleted. `blurb` is the surviving
 * definition, and it comes from the same constant the grouping does.
 *
 * The lab list is authored content passed in from the server page (plain serializable objects), so
 * filtering stays on the client without a round trip. Filter state is `useState` and deliberately
 * NOT the URL: a small catalog behind query-string filters would mint near-identical indexable URLs,
 * which is a doorway-page generator rather than navigation.
 */

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { CaseLabCard } from "@/components/labs/CaseLabCard"
import { groupCaseLabsByRound } from "@/lib/labs/case-lab-rounds"
import { getCompanyBrand } from "@/lib/labs/companies"
import { trackCaseLabListViewed } from "@/lib/labs/case-lab-analytics"
import { reportFunnelEvent } from "@/lib/metrics/funnel-client"
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
        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-[var(--wb-accent)] bg-[var(--wb-accent-soft)] text-[var(--wb-accent-strong)]"
          : "border-[var(--wb-border)] text-[var(--wb-text-secondary)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      )}
    >
      {label}
    </button>
  )
}

export function CaseLabGallery({ labs }: { labs: CaseLab[] }) {
  const [company, setCompany] = useState<string | null>(null)

  // Top of the lab funnel. Fires once per mount, not per filter change: the question this answers is
  // how many people saw the catalog at all, against which starts can be read.
  const labCount = labs.length
  useEffect(() => {
    trackCaseLabListViewed({ labCount })
    reportFunnelEvent("lab_list_view")
  }, [labCount])

  const companies = useMemo(
    () => Array.from(new Set(labs.map((lab) => lab.company))).sort(),
    [labs]
  )

  const filtered = useMemo(
    () => (company ? labs.filter((lab) => lab.company === company) : labs),
    [labs, company]
  )

  const groups = useMemo(() => groupCaseLabsByRound(filtered), [filtered])

  // A single-company catalog does not need chips.
  const showCompanyFilter = companies.length > 1

  return (
    <section aria-labelledby="pick-a-case-lab" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="pick-a-case-lab" className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl">
          Pick a case lab
        </h2>
        {showCompanyFilter && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip label="All" active={company === null} onClick={() => setCompany(null)} />
            {companies.map((value) => (
              <FilterChip
                key={value}
                label={getCompanyBrand(value).label}
                active={company === value}
                onClick={() => setCompany(value)}
              />
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--wb-text-secondary)]" role="status">
          No labs from that company yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(({ group, labs: groupLabs }) => (
            <div key={group.type} className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-semibold text-[var(--wb-text)]">
                  {group.heading}{" "}
                  <span className="font-normal text-[var(--wb-text-secondary)]">
                    · {groupLabs.length} {groupLabs.length === 1 ? "lab" : "labs"}
                  </span>
                </h3>
                <p className="text-xs text-[var(--wb-text-secondary)]">{group.blurb}</p>
              </div>
              {/* auto-fit rather than a fixed column count: two-up at 1120px, one-up the moment a
                  card would go under 400px, with no breakpoint to keep in sync. */}
              <div className="grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-3.5">
                {groupLabs.map((lab) => (
                  <CaseLabCard key={lab.id} lab={lab} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
