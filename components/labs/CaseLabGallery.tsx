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
 * ## Group headers carry ONE definition, inside a real container
 *
 * The round each group represents used to be explained twice: once here and once in a section
 * 700px further down, in different words. The second one is deleted. `blurb` is the surviving
 * definition, and it comes from the same constant the grouping does.
 *
 * The group is a bordered, tinted container with a 3px category rule across its top, a category
 * icon, a 17px heading and a count pill. Before, it was a 14px bold line and a grey sentence
 * floating above a card grid: two pixels SMALLER than the card titles it governed, and the same
 * size and weight as a FAQ row, so the page was telling the eye that a category and a FAQ question
 * were the same kind of thing. Groups now sit 48px apart against 14px from a header to its own
 * cards, a 3.4:1 proximity ratio, which is what makes two clusters parse as two clusters instead
 * of one field of four.
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
import { roundGroupVisual } from "@/components/labs/round-group-visuals"
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
        // 44px tall. These were 26px, under the touch-target floor, on the one control that
        // narrows the catalog.
        "inline-flex min-h-[44px] cursor-pointer items-center rounded-[10px] border px-3.5 text-xs font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]",
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
        <div className="flex flex-col gap-12">
          {groups.map(({ group, labs: groupLabs }) => {
            const visual = roundGroupVisual(group.type)
            const Icon = visual.icon
            return (
              <section
                key={group.type}
                aria-labelledby={`round-${group.type}`}
                className={cn(
                  // Square top corners so the 3px rule reads as a tab edge rather than a pill.
                  "flex flex-col rounded-t rounded-b-2xl border-x border-t-[3px] border-b p-4 sm:p-5",
                  visual.container,
                  visual.rule
                )}
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      visual.tile
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <h3
                    id={`round-${group.type}`}
                    className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--wb-text)] sm:text-lg"
                  >
                    {group.heading}
                  </h3>
                  {/* Outside the heading on purpose: inside it, the accessible name became
                      "Debugging and re-engineering, 2 labs". */}
                  <span
                    className={cn(
                      "rounded-full px-2 py-[3px] text-[11px] font-semibold tracking-[0.04em] uppercase",
                      visual.pill
                    )}
                  >
                    {groupLabs.length} {groupLabs.length === 1 ? "lab" : "labs"}
                  </span>
                </div>
                <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">
                  {group.blurb}
                </p>
                {/* auto-fit rather than a fixed column count: two-up at 1120px, one-up the moment a
                    card would go under 400px, with no breakpoint to keep in sync. */}
                <div className="mt-3.5 grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-3.5">
                  {groupLabs.map((lab) => (
                    <CaseLabCard key={lab.id} lab={lab} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
