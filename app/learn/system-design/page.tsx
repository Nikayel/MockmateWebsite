import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, Timer } from "lucide-react"
import { listSystemDesignLevels } from "@/lib/tutorials/system-design/registry"
import { learnTrackMetadata } from "@/lib/seo/learn-metadata"
import { learnCourseSchemaInput } from "@/lib/seo/learn-course-schema"
import { Footer } from "@/components/footer"
import { listCourseEntries } from "@/lib/tutorials/course-catalog"
import { LEARN_HUB_PATH, publicLessonPath, trackPath } from "@/lib/tutorials/lesson-routes"
import { BreadcrumbJsonLd, CourseJsonLd, LessonListJsonLd } from "@/components/seo/JsonLd"
import { firstPublishedLesson, toPathLevelSummary } from "@/lib/tutorials/level-path"
import { LearnPathTopBar } from "@/components/tutorials/LearnPathTopBar"
import { SystemDesignDrills } from "@/components/tutorials/SystemDesignDrills"
import { SystemDesignPath } from "@/components/tutorials/SystemDesignPath"

export const metadata: Metadata = learnTrackMetadata({
  courseId: "system-design",
  // Kept under the 155-character budget `truncateForDescription` enforces, so the drills survive
  // instead of being the part Google cuts off.
  description:
    "Free system design course taught the way interviews test it: read a concept, write your own design answer, then drill a timed round with an AI interviewer.",
})

const LOOP_PHASES = ["Read", "Design"]

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
  // Project to the lean Path summary so the authored 208-lesson corpus (teach markdown, model
  // answers, rubrics) never serializes into the client bundle — the Path only needs ids, headings,
  // and counts.
  const pathLevels = levels.map((level) => toPathLevelSummary(level))

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
      <LearnPathTopBar label="Learn System Design" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <header className="mb-12 text-center">
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

          {/* Two quiet entry hints rather than one loud button.
              The filled accent CTA that used to sit here answered "where should I start?" at the
              volume of a signup button, which is the wrong weight for a course whose actual entry
              point is the level you pick below: it pulled the eye past twelve levels to a single
              lesson chosen for you. Both routes are now the same secondary-pill treatment
              `/learn/python` uses, so they read as hints for the two visitors who want one (never
              done this; done it and want the timed round) and the path stays the page. */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {firstLesson && (
              <Link
                href={publicLessonPath(
                  "system-design",
                  firstLesson.levelSlug,
                  firstLesson.lessonId
                )}
                className="border-accent/30 text-accent-strong hover:bg-accent/10 focus-visible:ring-accent/50 group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                New to this? Start with {firstLesson.lessonTitle}
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
            )}

            {/* Drills live at the foot of the page because they are the applied end of the course,
                not a shortcut past it. This pill is the one concession to that placement, so a
                returning learner who came back to drill is not made to scroll the whole level list
                to find them. */}
            <Link
              href="#drills"
              className="border-border text-muted-foreground hover:border-accent/30 hover:text-foreground focus-visible:ring-accent/50 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              Already know this? Jump to the interview drills
            </Link>
          </div>
        </header>

        <SystemDesignPath levels={pathLevels} />

        {/* Below the levels on purpose. The levels are the course; a drill is the round you take
            once you can hold the concepts, so it reads as the end of the page rather than a rival
            entry point. The section derives its own list from the scenario registry, so nothing
            here needs to know how many drills exist. */}
        <SystemDesignDrills />
      </div>
      <Footer />
    </>
  )
}
