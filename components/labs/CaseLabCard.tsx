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
 * ## Difficulty is a meter, not a hue
 *
 * It used to be an emerald/amber/red mark in the top-right corner, the highest-salience position on
 * the card after the title. That spent the three loudest colours on the page on the least
 * decision-relevant attribute: on the Palantir bugfix card, "Hard" in red outcompeted the lab's own
 * name, and it put three foreign hues into a two-hue system. Difficulty is ORDINAL data and colour
 * cannot express order (nothing about red says "more than amber" except learned convention), so it
 * is three filled-or-empty segments, which can. The word stays beside it and carries the accessible
 * meaning, so the bars are `aria-hidden` and colour is never the only channel.
 *
 * `lib/ui/difficulty-colors.ts` is deliberately untouched: it has ten other call sites and this is
 * a /labs decision, not a platform one.
 *
 * The longer "why this company" pitch still lives on the detail page, not here.
 */

import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { CompanyLogo } from "@/components/labs/CompanyLogo"
import { getCompanyBrand } from "@/lib/labs/companies"
import { workspaceLanguageLabel } from "@/lib/ui/language-labels"
import type { CaseLab } from "@/lib/labs/types"

/** Filled segments per level. Ordinal, which is the whole point of the meter. */
const DIFFICULTY_STEPS: Record<string, number> = { easy: 1, medium: 2, hard: 3 }
const DIFFICULTY_SEGMENTS = 3

function DifficultyMeter({ difficulty }: { difficulty: string }) {
  const filled = DIFFICULTY_STEPS[difficulty] ?? 0
  return (
    <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
      <span aria-hidden className="flex items-end gap-[2px]">
        {Array.from({ length: DIFFICULTY_SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-2.5 w-1 rounded-[1px]",
              index < filled ? "bg-[var(--wb-text-secondary)]" : "bg-[var(--wb-track)]"
            )}
          />
        ))}
      </span>
      <span className="text-[11px] font-medium text-[var(--wb-text-secondary)] capitalize">
        {difficulty}
      </span>
    </span>
  )
}

export function CaseLabCard({ lab }: { lab: CaseLab }) {
  const brand = getCompanyBrand(lab.company)

  return (
    <Link
      href={`/labs/${lab.id}`}
      className={cn(
        "group flex h-full cursor-pointer flex-col gap-3 rounded-xl border border-[var(--wb-border)] bg-[var(--wb-card)] p-4 transition-all duration-200 sm:p-5",
        // Hover lift. `motion-reduce` drops the transform, not the colour change: the border and
        // shadow still say "this is the one under the cursor" without moving anything.
        "hover:-translate-y-[3px] hover:border-[var(--wb-accent)] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
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
        <DifficultyMeter difficulty={lab.difficulty} />
      </div>

      <p className="text-sm leading-relaxed text-[var(--wb-text-secondary)]">{lab.hook}</p>

      {/* Keywords, not affordances. Five grey pills per card was the largest block of low-value
          texture in the grid and read at nearly body weight; as middot-separated text they still
          say what the lab is about and stop competing with the title. The demotion comes from
          removing the fill, NOT from lowering the contrast: `--wb-muted` measures 2.48:1 on the
          card, which is not a legible way to make something quiet. */}
      <p className="text-[11px] leading-relaxed text-[var(--wb-text-secondary)]">
        {lab.skills.join(" · ")}
      </p>

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
