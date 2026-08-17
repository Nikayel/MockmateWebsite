import type { Metadata } from "next"
import Link from "next/link"
import { Timer } from "lucide-react"
import { listSystemDesignLevels } from "@/lib/tutorials/system-design/registry"
import { learnTrackMetadata } from "@/lib/seo/learn-metadata"
import { learnCourseSchemaInput } from "@/lib/seo/learn-course-schema"
import { Footer } from "@/components/footer"
import { listCourseEntries } from "@/lib/tutorials/course-catalog"
import { LEARN_HUB_PATH, publicLessonPath, trackPath } from "@/lib/tutorials/lesson-routes"
import { BreadcrumbJsonLd, CourseJsonLd, LessonListJsonLd } from "@/components/seo/JsonLd"
import { toPathLevelSummary } from "@/lib/tutorials/level-path"
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

/**
 * Screen 1 — the System-Design Path. Server Component: static content from `listSystemDesignLevels()`.
 *
 * Public, and nothing here reads auth or progress, so the page is the same clean index for a first
 * time visitor as for a returning learner. The way in is the path itself: the first arc renders
 * open, so the first level is on screen without a second CTA pointing at it.
 */
export default function LearnSystemDesignPage() {
  const levels = listSystemDesignLevels()
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
          {/* One quiet link, no pill chrome.

              The "Read -> Design" phase row that used to sit above this is gone, and so is the
              "Start with <first lesson>" hint. Both were saying something the page already said
              better: the row was a lossy compression of the sentence directly above it (and at two
              chips it is a label, not a process, unlike the three-phase row its sibling tracks
              earn), and the first lesson is the first card inside the first arc, so pointing at it
              from the hero was a second route to somewhere already on screen.

              What is left is the one hint a visitor cannot infer, aimed at the one visitor it is
              for. It sheds the border and padding as well as the emphasis, because the request was
              for less weight AND less space, and a bordered pill spends both. */}
          <div className="mt-5 flex justify-center">
            <Link
              href="#drills"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 inline-flex items-center gap-1.5 rounded-sm text-xs underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
