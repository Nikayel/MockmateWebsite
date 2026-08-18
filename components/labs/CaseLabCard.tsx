/**
 * CaseLabCard — one Case Lab in the `/labs` browse grid.
 *
 * ## The whole card is the click target
 *
 * There are no nested buttons and no second control. `Open →` is an affordance, not a link: it
 * nudges right on card hover and does nothing on its own. The resume badge that used to sit in the
 * footer is gone, because it fetched a run per card to render "Resume · Review (0/5)", which is a
 * second thing to click and a sentence that says a lab is in progress when nothing is done.
 *
 * ## Nothing on this card truncates
 *
 * The summary used to be `brief.situation` cut to 190 characters and clamped to three lines, so
 * every card ended mid-sentence, and the skill list collapsed into "+2 more". Both are gone: the
 * card renders `lab.hook` and every skill in full. That is only safe while the authored copy fits,
 * so the fit is enforced in `case-labs-registry.test.ts` rather than by a `line-clamp` here. If a
 * hook does not fit, rewrite the hook.
 *
 * ## Every card looks the same
 *
 * There is no "recommended" variant. One card briefly carried an accent border, a tinted fill and a
 * START HERE tab, which made the other three read as the ones you were not supposed to pick. The
 * hero CTA already answers "where do I begin", and it only has to be answered once.
 *
 * The longer "why this company" pitch still lives on the detail page, not here.
 */

import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import { CompanyLogo } from "@/components/labs/CompanyLogo"
import { getCompanyBrand } from "@/lib/labs/companies"
import { workspaceLanguageLabel } from "@/lib/ui/language-labels"
import type { CaseLab } from "@/lib/labs/types"

export function CaseLabCard({ lab }: { lab: CaseLab }) {
  const brand = getCompanyBrand(lab.company)

  return (
    <Link
      href={`/labs/${lab.id}`}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border border-[var(--wb-border)] bg-[var(--wb-main)] p-4 transition-all duration-200",
        // Hover lift. `motion-reduce` drops the transform, not the colour change: the border and
        // shadow still say "this is the one under the cursor" without moving anything.
        "hover:-translate-y-[3px] hover:border-[var(--wb-accent)] hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none"
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyLogo company={lab.company} size="md" className="mt-0.5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h4 className="text-base leading-snug font-semibold text-[var(--wb-text)]">
            {lab.title}
          </h4>
          <p className="text-xs text-[var(--wb-text-secondary)]">
            {brand.label} · {lab.role}
          </p>
        </div>
        {/* A dot plus the word, not a filled pill: four pills of four colours turned the grid into a
            row of badges competing with the titles. */}
        <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <span
            aria-hidden
            className={cn("h-2 w-2 rounded-full", difficultyColorClass(lab.difficulty, "dot"))}
          />
          <span
            className={cn(
              "text-xs font-medium capitalize",
              difficultyColorClass(lab.difficulty, "textOnLight")
            )}
          >
            {lab.difficulty}
          </span>
        </span>
      </div>

      <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">{lab.hook}</p>

      <ul className="flex flex-wrap items-center gap-1">
        {lab.skills.map((skill) => (
          <li
            key={skill}
            className="rounded bg-[var(--wb-panel)] px-1.5 py-0.5 text-[11px] text-[var(--wb-text-secondary)]"
          >
            {skill}
          </li>
        ))}
      </ul>

      {/* `mt-auto` pins the footer so cards of unequal hook length still align across the grid. */}
      <div className="mt-auto flex items-center gap-3 border-t border-[var(--wb-border)] pt-3 text-xs text-[var(--wb-text-secondary)]">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {lab.estimatedMinutes} min
        </span>
        {/* The build milestone's language. Test-pinned against the workspace it opens, so this
            cannot promise Python and hand over JavaScript. */}
        <span>{workspaceLanguageLabel(lab.buildLanguage)}</span>
        <span
          aria-hidden
          className="ml-auto flex items-center gap-1 font-medium text-[var(--wb-accent-strong)]"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-[3px] motion-reduce:transform-none" />
        </span>
      </div>
    </Link>
  )
}
