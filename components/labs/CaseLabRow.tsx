/**
 * CaseLabRow — a Case Lab in the `/labs` browse list.
 *
 * Built for deciding, not just scanning: the title and company anchor the row, a one-paragraph
 * summary says what the problem actually is, and the decision attributes (difficulty, duration,
 * build language, skills) sit under it. Rows used to carry the title and badges alone, which meant
 * the only way to learn what a lab was about was to open it, and the only text a crawler saw for
 * four labs was four titles.
 *
 * The longer "why this company" pitch still lives on the detail page, not here.
 */

import Link from "next/link"
import { ChevronRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { CaseLabProgressBadge } from "@/components/labs/CaseLabProgressBadge"
import { CompanyLogo } from "@/components/labs/CompanyLogo"
import type { BrowsableCaseLab } from "@/lib/labs/types"

export function CaseLabRow({ lab }: { lab: BrowsableCaseLab }) {
  return (
    <Link
      href={`/labs/${lab.id}`}
      className="group flex items-start gap-4 px-3 py-4 transition-colors hover:bg-black/[0.03] sm:px-4"
    >
      {/* Company logo anchors the row visually. */}
      <CompanyLogo company={lab.company} size="md" className="mt-0.5 shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h4 className="text-foreground text-sm font-semibold sm:text-base">{lab.title}</h4>
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize",
              difficultyColorClass(lab.difficulty, "softBadge")
            )}
          >
            {lab.difficulty}
          </span>
          <CaseLabProgressBadge labId={lab.id} />
        </div>

        <p className="text-muted-foreground text-xs sm:text-sm">{lab.summary}</p>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="capitalize">
            {lab.company} · {lab.role}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {lab.estimatedMinutes} min
          </span>
          {/* The build milestone's language. Test-pinned against the workspace it opens, so this
              cannot promise Python and hand over JavaScript. */}
          <span className="capitalize">{lab.buildLanguage}</span>
        </div>

        <ul className="flex flex-wrap items-center gap-1">
          {lab.skills.map((skill) => (
            <li
              key={skill}
              className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[11px]"
            >
              {skill}
            </li>
          ))}
        </ul>
      </div>

      <ChevronRight
        className="text-muted-foreground group-hover:text-primary mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}
