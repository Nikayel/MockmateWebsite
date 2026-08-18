/**
 * The interview-round grouping the `/labs` browse surface is organized around.
 *
 * A lab's `buildScenarioType` already records what kind of work the Build milestone is, and that is
 * the same axis a candidate shops on: "I have a debugging round on Thursday" is a different search
 * from "I have to add a feature to their codebase". Naming the grouping here rather than in the page
 * keeps one label per round type, shared by the explanatory prose and the group headings inside the
 * list, so the two can never describe the same group differently.
 *
 * Each group carries exactly ONE definition. There used to be two, a one-liner under the group
 * heading and a paragraph in a section 700px below it, and a reader who noticed both had to diff
 * them to find out whether they meant different things. The paragraph version and the section that
 * held it are deleted; `blurb` is what survived, and it sits directly under the heading, where every
 * line of prose is a line between the visitor and the thing they came for.
 *
 * Written as a `Record<BuildScenarioType, …>` so adding a build type fails to compile instead of
 * quietly producing an unlabelled group of labs.
 */

import type { BuildScenarioType, CaseLab } from "./types"

export interface CaseLabRoundGroup {
  type: BuildScenarioType
  /**
   * Heading for the group. The word "rounds" is NOT in it: the header renders
   * `{heading} · {n} labs`, and "Debugging and re-engineering rounds · 2 labs" reads as two
   * competing counts of the same thing.
   */
  heading: string
  /** The group's one definition, shown under the heading. Keep it under ~16 words. */
  blurb: string
}

const ROUND_GROUP_BY_TYPE: Record<BuildScenarioType, Omit<CaseLabRoundGroup, "type">> = {
  bugfix: {
    heading: "Debugging and re-engineering",
    blurb:
      "Code you did not write, plus a bug report. Find the real defect, not the one that looks wrong.",
  },
  "add-functionality": {
    heading: "Decomposition and feature-build",
    blurb: "The system exists and something is missing. Pin the ambiguity down before you type.",
  },
  "system-design": {
    heading: "System design",
    blurb: "Size and shape a system rather than a function, then defend what you traded away.",
  },
}

/** Display order. Debugging first: it is the round candidates most often walk in cold on. */
const ROUND_ORDER: BuildScenarioType[] = ["bugfix", "add-functionality", "system-design"]

export const CASE_LAB_ROUND_GROUPS: readonly CaseLabRoundGroup[] = ROUND_ORDER.map((type) => ({
  type,
  ...ROUND_GROUP_BY_TYPE[type],
}))

export interface GroupedCaseLabs<T extends CaseLab> {
  group: CaseLabRoundGroup
  labs: T[]
}

/**
 * Bucket labs into the round groups, dropping any group nothing is authored for. A heading over an
 * empty list reads as a broken filter, and `system-design` currently has no lab behind it.
 */
export function groupCaseLabsByRound<T extends CaseLab>(labs: T[]): GroupedCaseLabs<T>[] {
  return CASE_LAB_ROUND_GROUPS.map((group) => ({
    group,
    labs: labs.filter((lab) => lab.buildScenarioType === group.type),
  })).filter((entry) => entry.labs.length > 0)
}
