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
import { ArrowRight, Clock, LockKeyhole } from "lucide-react"
import { cn } from "@/lib/utils"
import { CompanyLogo } from "@/components/labs/CompanyLogo"
import { getCompanyBrand } from "@/lib/labs/companies"
import { workspaceLanguageLabel } from "@/lib/ui/language-labels"
import type { CaseLab } from "@/lib/labs/types"
import { isLabsPathComingSoon } from "@/components/labs/labs-tracks"

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
  const comingSoon = isLabsPathComingSoon(`/labs/${lab.id}`)

  const content = (
    <>
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

      <p className="text-[11px] leading-relaxed text-[var(--wb-text-secondary)]">
        {lab.skills.join(" · ")}
      </p>

      <div className="mt-auto flex items-center gap-3 border-t border-[var(--wb-border)] pt-3 text-xs text-[var(--wb-text-secondary)]">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {lab.estimatedMinutes} min
        </span>
        <span>{workspaceLanguageLabel(lab.buildLanguage)}</span>
        {comingSoon ? (
          <button
            type="button"
            disabled
            className="ml-auto inline-flex cursor-not-allowed items-center gap-1 font-medium text-[var(--wb-text-secondary)] disabled:opacity-100"
          >
            Coming soon
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <span
            aria-hidden
            className="ml-auto flex items-center gap-1 font-medium text-[var(--wb-accent-strong)]"
          >
            Open
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-[3px] motion-reduce:transform-none" />
          </span>
        )}
      </div>
    </>
  )

  const cardClassName = cn(
    "group flex h-full flex-col gap-3 rounded-2xl border border-[var(--wb-border)] bg-[var(--wb-card)] p-4 transition-all duration-200 sm:p-5",
    // Hover lift. `motion-reduce` drops the transform, not the colour change: the border and
    // shadow still say "this is the one under the cursor" without moving anything.
    !comingSoon &&
      "cursor-pointer hover:-translate-y-[3px] hover:border-[var(--wb-accent)] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none",
    !comingSoon &&
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
  )

  return comingSoon ? (
    <article className={cn(cardClassName, "cursor-not-allowed opacity-75")}>{content}</article>
  ) : (
    <Link href={`/labs/${lab.id}`} className={cardClassName}>
      {content}
    </Link>
  )
}
