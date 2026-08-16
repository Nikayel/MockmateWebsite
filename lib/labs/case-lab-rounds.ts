/**
 * The interview-round grouping the `/labs` browse surface is organized around.
 *
 * A lab's `buildScenarioType` already records what kind of work the Build milestone is, and that is
 * the same axis a candidate shops on: "I have a debugging round on Thursday" is a different search
 * from "I have to add a feature to their codebase". Naming the grouping here rather than in the page
 * keeps one label per round type, shared by the explanatory prose above the list and the group
 * headings inside it, so the two can never describe the same group differently.
 *
 * Written as a `Record<BuildScenarioType, …>` so adding a build type fails to compile instead of
 * quietly producing an unlabelled group of labs.
 */

import type { BuildScenarioType, CaseLab } from "./types"

export interface CaseLabRoundGroup {
  type: BuildScenarioType
  /** Heading for the group, in both the prose and the list. */
  heading: string
  /** What this kind of round actually scores. */
  blurb: string
}

const ROUND_GROUP_BY_TYPE: Record<BuildScenarioType, Omit<CaseLabRoundGroup, "type">> = {
  bugfix: {
    heading: "Debugging and re-engineering rounds",
    blurb:
      "You are handed a codebase you did not write and a bug report. The round scores how fast you build an accurate mental model and localize the real defect, past whatever merely looks wrong, rather than how much you can author from scratch.",
  },
  "add-functionality": {
    heading: "Decomposition and feature-build rounds",
    blurb:
      "The system already exists and something is missing from it. The round scores whether you pinned down the ambiguous requirement before you started typing, and whether what you added still holds once the awkward constraints show up.",
  },
  "system-design": {
    heading: "System design rounds",
    blurb:
      "You size and shape a system rather than a function, then defend the tradeoffs you picked and the failure modes you accepted.",
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
