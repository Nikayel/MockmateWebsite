/**
 * Course sections — the named arcs a course's levels are displayed under.
 *
 * A track page that lists more than a handful of levels is unreadable as a flat run of cards: the
 * Data Engineering course has 11 and System Design has 12, and in both the shape of the course (what
 * comes before what, and why) is the thing a visitor is actually trying to read off the page.
 *
 * Grouping is PRESENTATION ONLY. Levels keep their numeric ids, lessons keep their ids and URLs, and
 * progress is keyed by lesson id, so re-grouping a level never touches stored state or breaks a link.
 *
 * The per-course section lists live beside their curricula (`sql/sections.ts`,
 * `system-design/sections.ts`); only the shape and the grouping rule are shared here.
 */
import type { TutorialLevel, TutorialLevelId } from "./types"

export interface CourseSection {
  /** Stable slug, used as a React key and as an anchor target. */
  id: string
  title: string
  /** One line on what this section covers, shown under the section heading. */
  blurb: string
  /** Which level ids belong to this section, in display order. */
  levelIds: readonly TutorialLevelId[]
}

/** One section, resolved against the levels that are actually authored. */
export interface ResolvedCourseSection<L> {
  section: CourseSection
  levels: L[]
}

/**
 * Group authored levels under their sections, in section order, dropping sections that have no
 * authored levels yet. Levels whose id is in no section are appended under a trailing catch-all so a
 * newly registered level can never silently disappear from the page.
 *
 * `levelIds` is an allowlist rather than a range so a level can be reassigned without renumbering.
 */
export function groupLevelsBySection<L extends Pick<TutorialLevel<unknown>, "id">>(
  sections: readonly CourseSection[],
  levels: readonly L[]
): ResolvedCourseSection<L>[] {
  const claimed = new Set<TutorialLevelId>()
  const grouped: ResolvedCourseSection<L>[] = []

  for (const section of sections) {
    const sectionLevels = section.levelIds.flatMap((levelId) => {
      const found = levels.filter((level) => level.id === levelId)
      found.forEach(() => claimed.add(levelId))
      return found
    })
    if (sectionLevels.length > 0) grouped.push({ section, levels: sectionLevels })
  }

  const unclaimed = levels.filter((level) => !claimed.has(level.id))
  if (unclaimed.length > 0) {
    grouped.push({
      section: {
        id: "more",
        title: "More levels",
        blurb: "Levels that are not assigned to a section yet.",
        levelIds: unclaimed.map((level) => level.id),
      },
      levels: unclaimed,
    })
  }

  return grouped
}
