/**
 * Data Engineering course sections — the named groups the course's levels are shown in.
 *
 * The course grew out of the SQL track: SQL is now the first section (levels 1-5) rather than the
 * whole course, and the cloud, pipeline, operations, and AI-era sections sit after it.
 *
 * The shape (`CourseSection`) and the grouping rule live in `lib/tutorials/course-sections.ts`,
 * shared with the System Design track. Only this course's list is authored here.
 */
import {
  groupLevelsBySection,
  type CourseSection,
  type ResolvedCourseSection,
} from "@/lib/tutorials/course-sections"
import type { TutorialLevel } from "@/lib/tutorials/types"

export type { CourseSection, ResolvedCourseSection }

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

/** Group the Data Engineering levels under their sections. See {@link groupLevelsBySection}. */
export function groupLevelsIntoSections<L extends Pick<TutorialLevel<unknown>, "id">>(
  levels: readonly L[]
): ResolvedCourseSection<L>[] {
  return groupLevelsBySection(DATA_ENGINEERING_SECTIONS, levels)
}
