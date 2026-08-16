/**
 * The round-type explainer that sits above the browse list on `/labs`.
 *
 * A candidate shops for labs by the round they have coming up, so the page has to say what each
 * round type is before it shows a grouped list of them. The headings come from
 * `CASE_LAB_ROUND_GROUPS`, the same constant the list groups by, so prose and list can never
 * describe a group differently. Counts and skills are derived from the registry rather than typed
 * out, which is what keeps this paragraph true when a fifth lab lands.
 */

import { groupCaseLabsByRound } from "@/lib/labs/case-lab-rounds"
import type { CaseLab } from "@/lib/labs/types"

/** "a, b and c" — an Oxford-comma-free join, because this is prose, not a list. */
function joinPhrases(values: string[]): string {
  if (values.length <= 1) return values[0] ?? ""
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`
}

export function CaseLabRoundsExplainer({ labs }: { labs: CaseLab[] }) {
  const groups = groupCaseLabsByRound(labs)
  const skills = Array.from(new Set(labs.flatMap((lab) => lab.skills))).sort()

  return (
    <section aria-labelledby="interview-rounds" className="flex flex-col gap-4">
      <h2 id="interview-rounds" className="text-xl font-semibold text-[var(--wb-text)] sm:text-2xl">
        The interview rounds these labs rehearse
      </h2>

      <p className="text-sm text-[var(--wb-text-secondary)]">
        The list below is grouped by the kind of round each lab puts you in, because that is usually
        what you know about the interview you are preparing for. You can narrow it further by
        company or by skill.
      </p>

      <dl className="flex flex-col gap-3">
        {groups.map(({ group, labs: groupLabs }) => (
          <div key={group.type} className="flex flex-col gap-1">
            <dt className="text-sm font-semibold text-[var(--wb-text)]">
              {group.heading}{" "}
              <span className="font-normal text-[var(--wb-text-secondary)]">
                ({groupLabs.length} {groupLabs.length === 1 ? "lab" : "labs"})
              </span>
            </dt>
            <dd className="text-sm text-[var(--wb-text-secondary)]">{group.blurb}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-[var(--wb-text-secondary)]">
        Across the {labs.length} labs the skills on the table are {joinPhrases(skills)}.
      </p>
    </section>
  )
}
