import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Network, Timer } from "lucide-react"
import { listSystemDesignLevels } from "@/lib/tutorials/system-design/registry"
import { learnTrackMetadata } from "@/lib/seo/learn-metadata"
import { learnCourseSchemaInput } from "@/lib/seo/learn-course-schema"
import { findCatalogEntry, listCourseEntries } from "@/lib/tutorials/course-catalog"
import {
  LEARN_HUB_PATH,
  levelPath,
  publicLessonPath,
  trackPath,
} from "@/lib/tutorials/lesson-routes"
import { BreadcrumbJsonLd, CourseJsonLd, LessonListJsonLd } from "@/components/seo/JsonLd"
import { firstPublishedLesson } from "@/lib/tutorials/level-path"
import { LearnPathTopBar } from "@/components/tutorials/LearnPathTopBar"
import { SystemDesignDrills } from "@/components/tutorials/SystemDesignDrills"

export const metadata: Metadata = learnTrackMetadata({
  courseId: "system-design",
  // Kept under the 155-character budget `truncateForDescription` enforces, so the drills survive
  // instead of being the part Google cuts off.
  description:
    "Free system design course taught the way interviews test it: read a concept, write your own design answer, then drill a timed round with an AI interviewer.",
})

const LOOP_PHASES = ["Read", "Design"]

/**
 * The hand-picked demo tour (docs/system-design-curriculum/DEMO-PLAYLIST.md), the one place in Learn
 * that names specific lessons. They are curated for a pitch, so they cannot be derived.
 *
 * Each stop is verified against the catalog before it renders. That check is new and load-bearing:
 * the lesson routes are statically generated with `dynamicParams = false`, so a stop whose lesson
 * has since been renamed by the authoring loop would now be a hard 404 on the landing page rather
 * than the soft "lesson not found" card it used to reach. A stale stop simply disappears instead.
 */
const DEMO_TOUR = [
  {
    levelSlug: "interview-method",
    lessonId: "sd-l0-fermi-estimation",
    label: "Drive the QPS math",
  },
  { levelSlug: "interview-method", lessonId: "sd-l0-clarify-scope", label: "Predict, then reveal" },
  { levelSlug: "scaling-data", lessonId: "sd-l3-consistent-hashing", label: "Break a hash ring" },
] as const

/**
 * Screen 1 — the System-Design Path. Server Component: static content from `listSystemDesignLevels()`.
 *
 * Public, and nothing here reads auth or progress, so the page is the same clean index for a first
 * time visitor as for a returning learner. The "Start with" link gives that visitor one obvious way
 * in (and gives a crawler a deep link into the corpus instead of only level indexes).
 */
export default function LearnSystemDesignPage() {
  const levels = listSystemDesignLevels()
  const firstLesson = firstPublishedLesson(levels)
  const tourStops = DEMO_TOUR.filter((stop) =>
    Boolean(findCatalogEntry("system-design", stop.levelSlug, stop.lessonId))
  )

  return (
    <>
      {/* Standalone Course (vocabulary for answer engines; the SERP carousel lives on the hub) plus
          the full lesson ItemList and the breadcrumb. All inputs derive from the live catalog. */}
      <CourseJsonLd {...learnCourseSchemaInput("system-design")} />
      <LessonListJsonLd
        name="Learn System Design lessons"
        lessons={listCourseEntries("system-design").map(({ level, lesson }) => ({
          title: lesson.title,
          url: publicLessonPath("system-design", level.slug, lesson.id),
        }))}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Learn", url: LEARN_HUB_PATH },
          { name: "System Design", url: trackPath("system-design") },
        ]}
      />
      <LearnPathTopBar label="Learn System Design" containerClass="max-w-4xl" />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
            Learn System Design
          </p>
          <h1 className="text-foreground mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            System design, the way real interviews test it
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-pretty">
            Pick a level, then learn every concept the same way: read it, then write your own design
            answer and self-compare against a model answer. No code to run, just the reasoning that
            wins rounds.
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
                href={publicLessonPath(
                  "system-design",
                  firstLesson.levelSlug,
                  firstLesson.lessonId
                )}
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

          {/* Drills live at the foot of the page because they are the applied end of the course, not
              a shortcut past it. This pill is the one concession to that placement: the same
              secondary-link treatment `/learn/python` uses for the executor, so a returning learner
              who came back to drill is not made to scroll the whole level list to find them. */}
          <div className="mt-4 flex justify-center">
            <Link
              href="#drills"
              className="border-border text-muted-foreground hover:border-accent/30 hover:text-foreground focus-visible:ring-accent/50 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              Already know this? Jump to the interview drills
            </Link>
          </div>
        </header>

        {/* 60-second demo tour: one tap into each interactive kind (see
            docs/system-design-curriculum/DEMO-PLAYLIST.md). These land on the PUBLIC reading page,
            which is what makes the tour work at all now: the widgets live in the teach markdown, so
            a visitor can drive them without an account. */}
        {tourStops.length > 0 && (
          <nav
            aria-label="Demo tour"
            className="border-accent/30 bg-accent/[0.05] mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3"
          >
            <span className="text-accent-strong text-xs font-semibold tracking-wide uppercase">
              60-second tour
            </span>
            {tourStops.map((stop) => (
              <Link
                key={stop.lessonId}
                href={publicLessonPath("system-design", stop.levelSlug, stop.lessonId)}
                className="text-foreground/90 hover:text-accent-strong inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
              >
                {stop.label}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        )}

        <ol className="flex flex-col gap-4">
          {levels.map((level) => {
            const lessonCount = level.modules.reduce((total, mod) => total + mod.lessons.length, 0)
            const comingSoon = lessonCount === 0
            return (
              <li key={level.id}>
                <Link
                  href={levelPath("system-design", level.slug)}
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
                      <Network className="text-accent h-4 w-4 shrink-0" aria-hidden="true" />
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

        {/* Below the levels on purpose. The levels are the course; a drill is the round you take
            once you can hold the concepts, so it reads as the end of the page rather than a rival
            entry point. The section derives its own list from the scenario registry, so nothing
            here needs to know how many drills exist. */}
        <SystemDesignDrills />
      </div>
    </>
  )
}
