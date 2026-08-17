/**
 * System Design course sections, the three arcs the twelve levels are shown under.
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

/**
 * The three arcs of the System Design course, in curriculum order.
 *
 * Three rather than the five this started as, because three tell a story a visitor can hold:
 * learn the ground rules, learn to design, then use it on real problems. The cost is that
 * `core-design` carries seven of the twelve levels and half the lessons, which is unavoidable at
 * this granularity: reliability, security and delivery are not fundamentals and they are not case
 * studies, so there is no third home for them. The arcs collapse, so the size shows up as a count
 * on a closed header rather than as a wall of cards.
 */
export const SYSTEM_DESIGN_SECTIONS: readonly CourseSection[] = [
  {
    id: "fundamentals",
    title: "Fundamentals",
    blurb:
      "How to run the round itself, then the two things every later answer assumes you already hold: how a request actually travels and what an API contract commits you to, and how to pick a datastore and model data for the way it will be read.",
    levelIds: [0, 1, 2],
  },
  {
    id: "core-design",
    title: "Core design",
    blurb:
      "The body of the discipline, and most of the course. Scaling the data and compute tiers, the distributed and event-driven reasoning that ties them together, then the reliability, security and delivery decisions that separate a diagram from a system somebody could actually run.",
    levelIds: [3, 4, 5, 6, 7, 8, 9],
  },
  {
    id: "applied-frontier-ai",
    title: "Applied and frontier AI",
    blurb:
      "Every prior level, used at once. The full-length 'design X' problems interviewers actually ask, then the systems turning up in rounds now: ML platforms, LLM and retrieval infrastructure, agent boundaries, and the real-time and edge data behind them.",
    levelIds: [10, 11],
  },
]

/** Group the System Design levels under their arcs. See {@link groupLevelsBySection}. */
export function groupSystemDesignLevels<L extends Pick<TutorialLevel<unknown>, "id">>(
  levels: readonly L[]
): ResolvedCourseSection<L>[] {
  return groupLevelsBySection(SYSTEM_DESIGN_SECTIONS, levels)
}
