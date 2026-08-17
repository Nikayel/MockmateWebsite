/**
 * System Design course sections — the five arcs the twelve levels are shown under.
 *
 * Twelve levels as one flat run of cards is a list, not a path: nothing on the page says that L0 is
 * about running the conversation while L10 is the "design X" canon, so a visitor cannot tell where
 * they belong without opening several levels. The arcs answer that before the first click.
 *
 * Presentation only. Level ids, lesson ids, URLs and stored progress are untouched by grouping, and
 * the shared rule in `lib/tutorials/course-sections.ts` drops an arc whose levels are not authored
 * yet and appends any unclaimed level rather than losing it.
 */
import {
  groupLevelsBySection,
  type CourseSection,
  type ResolvedCourseSection,
} from "@/lib/tutorials/course-sections"
import type { TutorialLevel } from "@/lib/tutorials/types"

/** The five arcs of the System Design course, in curriculum order. */
export const SYSTEM_DESIGN_SECTIONS: readonly CourseSection[] = [
  {
    id: "method",
    title: "The method",
    blurb:
      "Before any component: how to scope a vague prompt, size it with back-of-the-envelope math, structure the walkthrough against the clock, and argue a tradeoff at the level you are being interviewed for.",
    levelIds: [0],
  },
  {
    id: "fundamentals",
    title: "Fundamentals",
    blurb:
      "The two things every later answer assumes you already hold: how requests actually travel and what an API contract commits you to, then how to pick a datastore and model data for the way it will be read.",
    levelIds: [1, 2],
  },
  {
    id: "scale",
    title: "Scaling",
    blurb:
      "What changes when one machine stops being enough. Replication, sharding and caching on the data tier, load balancing and overload protection on the compute tier, then the distributed and event-driven reasoning that ties them together.",
    levelIds: [3, 4, 5, 6],
  },
  {
    id: "production",
    title: "Running it in production",
    blurb:
      "The half of the round that separates a diagram from a system: SLOs and observability, failure and multi-region recovery, authentication, tenancy and privacy, and the architecture and delivery choices behind them.",
    levelIds: [7, 8, 9],
  },
  {
    id: "applied",
    title: "Applied",
    blurb:
      "Every prior level, used at once. The full-length 'design X' problems interviewers actually ask, then the frontier systems that are showing up in rounds now: ML platforms, LLM infrastructure, real-time analytics, and edge.",
    levelIds: [10, 11],
  },
]

/** Group the System Design levels under their arcs. See {@link groupLevelsBySection}. */
export function groupSystemDesignLevels<L extends Pick<TutorialLevel<unknown>, "id">>(
  levels: readonly L[]
): ResolvedCourseSection<L>[] {
  return groupLevelsBySection(SYSTEM_DESIGN_SECTIONS, levels)
}
