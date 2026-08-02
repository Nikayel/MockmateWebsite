/**
 * Data Engineering course sections — the named groups the course's levels are shown in.
 *
 * The course grew out of the SQL track: SQL is now the first section (levels 1-5) rather than the
 * whole course, and the cloud, pipeline, operations, and AI-era sections sit after it. Grouping is
 * PRESENTATION ONLY. Levels keep their numeric ids, lessons keep their ids and URLs, and progress is
 * keyed by lesson id, so re-grouping a level never touches stored state or breaks a link.
 *
 * `levelIds` is an allowlist rather than a range so a level can be reassigned without renumbering,
 * and {@link groupLevelsIntoSections} drops sections whose levels are not authored yet: the sections
 * for unwritten levels simply do not render until their content lands.
 */
import type { TutorialLevel, TutorialLevelId } from "@/lib/tutorials/types"

export interface CourseSection {
  /** Stable slug, used as a React key and as an anchor target. */
  id: string
  title: string
  /** One line on what this section covers, shown under the section heading. */
  blurb: string
  /** Which level ids belong to this section, in display order. */
  levelIds: readonly TutorialLevelId[]
}

/** The five sections of the Data Engineering course, in curriculum order. */
export const DATA_ENGINEERING_SECTIONS: readonly CourseSection[] = [
  {
    id: "sql",
    title: "SQL",
    blurb:
      "The query language every data engineering interview opens with, from your first SELECT through joins, aggregation, window functions, and the patterns companies actually ask for.",
    levelIds: [1, 2, 3, 4, 5],
  },
  {
    id: "cloud-platforms",
    title: "Cloud and Data Platforms",
    blurb:
      "The platform the SQL runs on: object storage, file formats, partitioning, warehouses, and the lakehouse, each taught by querying a simulated platform's own metadata.",
    levelIds: [6, 7],
  },
  {
    id: "pipelines",
    title: "Pipelines and Reliability",
    blurb:
      "Moving data on a schedule without corrupting it: orchestration, idempotency, incremental loads and backfills, streaming, and change data capture.",
    levelIds: [8, 9],
  },
  {
    id: "compute-operations",
    title: "Compute and Operations",
    blurb:
      "Distributed execution and the operational half of the job: diagnosing slow jobs, data quality monitoring, incident triage, cost, and access governance.",
    levelIds: [10],
  },
  {
    id: "ai-era",
    title: "Data Engineering in the AI Era",
    blurb:
      "The pipelines AI systems run on: retrieval indexes, embedding freshness, curation and deduplication, and the semantic layer that makes generated SQL trustworthy.",
    levelIds: [11],
  },
]

/** One section, resolved against the levels that are actually authored. */
export interface ResolvedCourseSection<L> {
  section: CourseSection
  levels: L[]
}

/**
 * Group authored levels under their sections, in section order, dropping sections that have no
 * authored levels yet. Levels whose id is in no section are appended under a trailing catch-all so a
 * newly registered level can never silently disappear from the page.
 */
export function groupLevelsIntoSections<L extends Pick<TutorialLevel<unknown>, "id">>(
  levels: readonly L[]
): ResolvedCourseSection<L>[] {
  const claimed = new Set<TutorialLevelId>()
  const grouped: ResolvedCourseSection<L>[] = []

  for (const section of DATA_ENGINEERING_SECTIONS) {
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
