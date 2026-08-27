/**
 * ArchMapDelta — "what changed in the system" since last sprint (UX-SPEC.md §1.8, §4).
 *
 * "Three labelled lists (added / changed / broke) rendered from `SprintView.archMapDelta`."
 * `lib/sprint-labs/types.ts`'s `archMapDeltaSchema` carries a fourth optional list, `invariants`
 * (Ruling R10: a deliberate hedge between two spec drafts — WORKBOOK-SPEC.md authors
 * `archMapDelta.invariants[]`, this UX spec's component only names three). Rendered here as a fourth
 * "Always true" section, present only when authored: hiding content the compiler emitted (fixture-demo
 * authors a real invariant) would contradict this spec's own "never synthesize, never hide authored
 * content" spirit elsewhere (S1). Recorded as a deviation from the component's literal three-list
 * contract rather than silently dropped or silently added with no note (UX-SPEC.md §15's convention).
 *
 * Sprint 1 (§4 States): "no `changed` or `broke` lists... described as inherited." No `seedStats`-style
 * file/test counts exist on `WorkbookSummary` to build the exact authored sentence from, so when every
 * list is empty on sprint 1 this renders a generic, honest inherited-seed line instead of a fabricated
 * count.
 */

import type { ArchMapDelta as ArchMapDeltaValue } from "@/lib/sprint-labs/types"

export interface ArchMapDeltaProps {
  delta: ArchMapDeltaValue
  sprintNumber: number
}

const SECTION_LABELS: Array<{ key: keyof ArchMapDeltaValue; label: string }> = [
  { key: "added", label: "Added" },
  { key: "changed", label: "Changed" },
  { key: "broke", label: "Broke" },
  { key: "invariants", label: "Always true" },
]

export function ArchMapDelta({ delta, sprintNumber }: ArchMapDeltaProps) {
  const sections = SECTION_LABELS.map(({ key, label }) => ({ label, items: delta[key] })).filter(
    (section) => section.items.length > 0
  )

  if (sections.length === 0) {
    return (
      <p className="text-sm text-[var(--wb-text-secondary)]">
        {sprintNumber === 1
          ? "This is where you start. Everything in the repo right now is what you inherit."
          : "No architecture changes recorded for this sprint."}
      </p>
    )
  }

  return (
    <dl className="flex flex-col gap-3">
      {sections.map((section) => (
        <div key={section.label}>
          <dt className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
            {section.label}
          </dt>
          <dd>
            <ul className="mt-1 flex list-none flex-col gap-1">
              {section.items.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">
                  {item}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  )
}
