import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Database } from "lucide-react"
import { listSqlLevels } from "@/lib/tutorials/sql/registry"
import { learnTrackMetadata } from "@/lib/seo/learn-metadata"
import { learnCourseSchemaInput } from "@/lib/seo/learn-course-schema"
import { listCourseEntries } from "@/lib/tutorials/course-catalog"
import {
  LEARN_HUB_PATH,
  levelPath,
  publicLessonPath,
  trackPath,
} from "@/lib/tutorials/lesson-routes"
import { BreadcrumbJsonLd, CourseJsonLd, LessonListJsonLd } from "@/components/seo/JsonLd"
import { firstPublishedLesson } from "@/lib/tutorials/level-path"
import { LearnPathTopBar } from "@/components/tutorials/LearnPathTopBar"

export const metadata: Metadata = learnTrackMetadata({
  courseId: "sql",
  description:
    "Learn SQL and data engineering against a live in-browser database. Read, apply, and practice the exact SQL that data engineering internship interviews test.",
})

const LOOP_PHASES = ["Read", "Apply", "Practice"]

/**
 * Screen 1 — the SQL Path. Server Component: static content from `listSqlLevels()`.
 *
 * Public, and nothing here reads auth or progress, so the page is the same clean index for a first
 * time visitor as for a returning learner. The "Start with" link gives that visitor one obvious way
 * in (and gives a crawler a deep link into the corpus instead of only level indexes).
 */
export default function LearnSqlPage() {
  const levels = listSqlLevels()
  const firstLesson = firstPublishedLesson(levels)

  return (
    <>
      {/* Standalone Course (vocabulary for answer engines; the SERP carousel lives on the hub) plus
          the full lesson ItemList and the breadcrumb. All inputs derive from the live catalog. */}
      <CourseJsonLd {...learnCourseSchemaInput("sql")} />
      <LessonListJsonLd
        name="Learn SQL lessons"
        lessons={listCourseEntries("sql").map(({ level, lesson }) => ({
          title: lesson.title,
          url: publicLessonPath("sql", level.slug, lesson.id),
        }))}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Learn", url: LEARN_HUB_PATH },
          { name: "SQL", url: trackPath("sql") },
        ]}
      />
      <LearnPathTopBar label="Learn SQL" containerClass="max-w-4xl" />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
            Learn SQL
          </p>
          <h1 className="text-foreground mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            SQL &amp; data engineering, the way a data engineer actually learns it
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-pretty">
            Pick a level, then learn every concept the same way: read it, write it, and practice it
            against a real database that runs entirely in your browser.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            {LOOP_PHASES.map((phase, i) => (
              <span key={phase} className="flex items-center gap-2">
                <span className="border-accent/30 bg-accent/10 text-accent-strong rounded-full border px-3 py-1 text-sm font-medium">
                  {phase}
                </span>
                {i < LOOP_PHASES.length - 1 && (
                  <span className="text-accent/60" aria-hidden="true">
                    →
                  </span>
                )}
              </span>
            ))}
          </div>

          {firstLesson && (
            <div className="mt-6 flex justify-center">
              <Link
                href={publicLessonPath("sql", firstLesson.levelSlug, firstLesson.lessonId)}
                className="bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-accent/50 group inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Start with {firstLesson.lessonTitle}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            </div>
          )}
        </header>

        <ol className="flex flex-col gap-4">
          {levels.map((level) => {
            const lessonCount = level.modules.reduce((total, mod) => total + mod.lessons.length, 0)
            const comingSoon = lessonCount === 0
            return (
              <li key={level.id}>
                <Link
                  href={levelPath("sql", level.slug)}
                  className="group border-border bg-card hover:border-accent/40 hover:bg-accent/[0.03] flex items-start gap-4 rounded-xl border p-5 transition-colors"
                >
                  <span
                    className="border-accent/30 text-accent-strong bg-accent/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
                    aria-hidden="true"
                  >
                    {level.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-foreground flex items-center gap-2 font-semibold">
                      <Database className="text-accent h-4 w-4 shrink-0" aria-hidden="true" />
                      {level.title}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">{level.tagline}</p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {comingSoon
                        ? "Lessons coming soon"
                        : `${lessonCount} ${lessonCount === 1 ? "lesson" : "lessons"}`}{" "}
                      · ~{level.estimatedHours}h
                    </p>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-foreground mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}
