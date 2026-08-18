/**
 * How each round-type group is dressed on `/labs`.
 *
 * `lib/labs/case-lab-rounds.ts` owns what a group MEANS (its heading and its one definition); this
 * owns what it LOOKS like. Splitting them keeps the copy module free of presentation and keeps the
 * class strings in one place where Tailwind's scanner can see them.
 *
 * ## Why the group needed an identity at all
 *
 * The group heading rendered at 14px/600, which is two pixels SMALLER than the card title it
 * governs and identical to a FAQ accordion row, so Gestalt similarity was telling the eye that a
 * category and a FAQ question were the same kind of thing. The groups also had no container: 24px
 * between groups against 12px from a heading to its own cards is a 2:1 proximity ratio, inside the
 * noise floor, so four cards read as one undifferentiated field. Scale, containment and hue fix
 * those three failures respectively.
 *
 * ## The colour rule
 *
 * Warm against cool is the most legible two-way split available on a warm neutral page. Clay is
 * also the page's interaction colour, so the rule that keeps the two meanings apart is positional:
 *
 *   Clay is INTERACTIVE when it is a filled control, a focus ring, or text inside a link.
 *   Clay is CATEGORICAL when it is a fill behind an icon, a section rule, or a static count pill.
 *   No single element is ever both.
 *
 * Every categorical use below is non-interactive and lives inside the group header.
 *
 * IMPORTANT: Tailwind only sees class names that appear as literal strings in source. Every class
 * here is spelled out in full. Never build one by interpolation, or it is purged from the build.
 */

import { Blocks, Bug, Network } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { BuildScenarioType } from "@/lib/labs/types"

export interface RoundGroupVisual {
  /** Redundant coding for the heading beside it, so it is `aria-hidden` at the call site. */
  icon: LucideIcon
  /** The 3px top rule. Reads at full chroma; held to the 3:1 non-text bar in both themes. */
  rule: string
  /** Group container fill and edge. */
  container: string
  /** Tile behind the icon, plus the icon's own colour. */
  tile: string
  /** Static count pill. */
  pill: string
}

const ROUND_GROUP_VISUALS: Record<BuildScenarioType, RoundGroupVisual> = {
  bugfix: {
    icon: Bug,
    rule: "border-t-[var(--wb-cat-bugfix-ink)]",
    container: "border-[var(--wb-cat-bugfix-edge)] bg-[var(--wb-cat-bugfix-field)]",
    tile: "bg-[var(--wb-cat-bugfix-soft)] text-[var(--wb-cat-bugfix-ink)]",
    pill: "bg-[var(--wb-cat-bugfix-soft)] text-[var(--wb-cat-bugfix-ink)]",
  },
  "add-functionality": {
    icon: Blocks,
    // Full-chroma accent for the rule, `-ink` for anything carrying text: the accent measures
    // 3.45:1 in light, which is a boundary colour, not a text colour.
    rule: "border-t-[var(--wb-accent)]",
    container: "border-[var(--wb-cat-build-edge)] bg-[var(--wb-cat-build-field)]",
    tile: "bg-[var(--wb-cat-build-soft)] text-[var(--wb-cat-build-ink)]",
    pill: "bg-[var(--wb-cat-build-soft)] text-[var(--wb-cat-build-ink)]",
  },
  // No lab is authored for this yet, so it never renders. It is here because the Record makes a new
  // build type a compile error rather than an unstyled group, and it reuses the bugfix ramp
  // deliberately: a third hue ships the day a third category has labs in it, not before.
  "system-design": {
    icon: Network,
    rule: "border-t-[var(--wb-cat-bugfix-ink)]",
    container: "border-[var(--wb-cat-bugfix-edge)] bg-[var(--wb-cat-bugfix-field)]",
    tile: "bg-[var(--wb-cat-bugfix-soft)] text-[var(--wb-cat-bugfix-ink)]",
    pill: "bg-[var(--wb-cat-bugfix-soft)] text-[var(--wb-cat-bugfix-ink)]",
  },
}

export function roundGroupVisual(type: BuildScenarioType): RoundGroupVisual {
  return ROUND_GROUP_VISUALS[type]
}
