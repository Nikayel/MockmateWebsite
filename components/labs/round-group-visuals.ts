/**
 * How each round-type group is dressed on `/labs`.
 *
 * `lib/labs/case-lab-rounds.ts` owns what a group MEANS (its heading and its one definition); this
 * owns what it LOOKS like.
 *
 * ## Why the group needed a container at all
 *
 * The group heading rendered at 14px/600, two pixels SMALLER than the card title it governs and
 * identical to a FAQ accordion row, so similarity was telling the eye that a category and a FAQ
 * question were the same kind of thing. The groups also had no container: 24px between groups
 * against 12px from a heading to its own cards is a 2:1 proximity ratio, inside the noise floor, so
 * four cards read as one undifferentiated field.
 *
 * ## Why there is no per-category colour
 *
 * There was, briefly: a cool verdigris for debugging against warm clay for feature-build. It
 * separated the two beautifully and it was the only cool hue anywhere on the platform, which made
 * one section of one page read as a different product. The site is clay on warm neutrals, so the
 * categories are told apart the way `/learn` tells its three courses apart: one neutral container
 * each, a distinct icon, a distinct heading. Only the icon differs here, and that is deliberate.
 *
 * If the two ever need stronger separation, add the hue back as a pair of `--wb-cat-*` tokens
 * rather than a literal, and check it against the rest of the site first.
 *
 * IMPORTANT: Tailwind only sees class names that appear as literal strings in source. Never build
 * one by interpolation, or it is purged from the build.
 */

import { Blocks, Bug, Network } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { BuildScenarioType } from "@/lib/labs/types"

export interface RoundGroupVisual {
  /** Redundant coding for the heading beside it, so it is `aria-hidden` at the call site. */
  icon: LucideIcon
}

/**
 * A Record rather than a lookup with a default, so adding a build scenario type is a compile error
 * instead of a group that renders with no mark.
 */
const ROUND_GROUP_VISUALS: Record<BuildScenarioType, RoundGroupVisual> = {
  bugfix: { icon: Bug },
  "add-functionality": { icon: Blocks },
  // No lab is authored for this yet, so it never renders.
  "system-design": { icon: Network },
}

export function roundGroupVisual(type: BuildScenarioType): RoundGroupVisual {
  return ROUND_GROUP_VISUALS[type]
}
