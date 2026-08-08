import type { Metadata } from "next"
import Link from "next/link"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { LEARN_TRACKS, type LearnTrack } from "@/components/learn/learn-tracks"
import { BreadcrumbJsonLd, CourseListJsonLd } from "@/components/seo/JsonLd"
import { learnCourseSchemaInput } from "@/lib/seo/learn-course-schema"
import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { COURSE_IDS, listCourseLevels } from "@/lib/tutorials/course-catalog"
import {
  LEARN_COURSE_LABEL,
  LEARN_HUB_PATH,
  levelPath,
  trackPath,
} from "@/lib/tutorials/lesson-routes"
import type { CourseId } from "@/lib/tutorials/types"

/**
 * The Learn hub — the landing page for the whole free curriculum.
 *
 * This used to be three cards over a one-line subtitle, which was fine as an in-product switcher and
 * useless as a landing page: nothing on it explained what the curriculum is, and nothing linked past
 * the three track roots, so every level and every lesson sat several unlinked hops away. It is now a
 * real page with substantive copy plus a link to every level of every course, which is what puts the
 * whole corpus inside a crawler's reach and inside a reader's.
 *
 * Server Component. The level list is derived from `course-catalog` at build time, never authored
 * here, because a concurrent authoring loop keeps adding lessons: any count or list written into
 * this file by hand would be wrong within the week.
 */

const LEARN_ALL_LESSONS_PATH = "/learn/all"

export const metadata: Metadata = {
  // No brand here: the root layout's `title.template` appends " | CodeSparring" already.
  title: "Learn Python, Data Engineering, and System Design",
  // Every other Learn page's description already runs through `truncateForDescription`; the hub was
  // the one that hand-wrote its own and overran the budget.
  description: truncateForDescription(
    "Free interactive courses that run in your browser. Read a concept, apply it on a guided exercise, then practice it on an interview-shaped problem."
  ),
  alternates: {
    canonical: "/learn",
  },
}

/** One phase of the lesson loop, explained once here so every track page can stay short. */
interface LoopPhase {
  name: string
  detail: string
}

const LESSON_LOOP: LoopPhase[] = [
  {
    name: "Read",
    detail:
      "One idea, explained in full, with a runnable example you can edit and re-run. No video, no local setup, nothing to install.",
  },
  {
    name: "Apply",
    detail:
      "A guided exercise on the concept you just read. Hints are there if you stall, and automated checks tell you the moment your answer is right.",
  },
  {
    name: "Practice",
    detail:
      "The same idea on a harder, interview-shaped problem with the guidance removed. This is the rep that shows whether it actually stuck.",
  },
]

const AUDIENCE: string[] = [
  "Students preparing for internship and new-grad software or data engineering interviews.",
  "Career switchers who can follow a tutorial but freeze in front of an empty editor.",
  "Working engineers who write one language all day and need SQL or system design back in working memory.",
  "Anyone who wants to read the material first and decide later whether the interview practice is worth paying for.",
]

/** Per-course positioning copy. Keyed by `CourseId`, so a fourth course fails to compile here. */
const COURSE_PITCH: Record<CourseId, { headline: string; body: string }> = {
  python: {
    headline: "The Python that interviews actually test",
    body: "Not a language tour. Each lesson takes one behaviour that trips people up under pressure, such as mutable default arguments, integer division, truthiness, or the GIL, explains why it works that way, and then makes you write it. Every exercise runs in your browser and is graded against real test cases.",
  },
  "data-engineering": {
    headline: "A real database, running in the tab",
    body: "The course starts where every data engineering interview starts, with SQL: you write queries against seeded tables and see the rows come back, from your first SELECT through joins, aggregation, and window functions. Later sections keep the same graded editor and point it at the rest of the job, querying a simulated cloud platform's own metadata to reason about storage, file formats, partitioning, pipelines, and cost. Because the database is real, a wrong query fails the way it would in production rather than the way a quiz says it should.",
  },
  "system-design": {
    headline: "Write the answer, then compare it",
    body: "System design is not multiple choice, so these lessons are free response. You read the concept, write your own design answer, and only then reveal a model answer to compare against. The comparison is where the learning is, and it is the closest thing to a design round you can do alone.",
  },
}

/** One level, projected to exactly what this page renders. */
interface HubLevel {
  slug: string
  title: string
  tagline: string
  href: string
  lessonCount: number
  estimatedHours: number
}

/** One course, with its levels and derived totals. */
interface HubTrack {
  courseId: CourseId
  label: string
  Mark: LearnTrack["Mark"] | undefined
  levels: HubLevel[]
  lessonCount: number
}

/**
 * Read one course out of the catalog and reduce it to the hub's view.
 *
 * The brand mark comes from `LEARN_TRACKS`, the same registry the header picker renders, so a track
 * looks identical on both surfaces. That registry is keyed by a plain string id rather than
 * `CourseId`, hence the lookup and the optional mark: a course present in the catalog but missing
 * from the track registry still renders, just without its logo.
 */
function buildHubTrack(courseId: CourseId): HubTrack {
  const track = LEARN_TRACKS.find((candidate) => candidate.id === courseId)
  const levels = listCourseLevels(courseId).map((level) => ({
    slug: level.slug,
    title: level.title,
    tagline: level.tagline,
    href: levelPath(courseId, level.slug),
    lessonCount: level.modules.reduce((total, mod) => total + mod.lessons.length, 0),
    estimatedHours: level.estimatedHours,
  }))

  return {
    courseId,
    label: LEARN_COURSE_LABEL[courseId],
    Mark: track?.Mark,
    levels,
    lessonCount: levels.reduce((total, level) => total + level.lessonCount, 0),
  }
}

export default function LearnHubPage() {
  const tracks = COURSE_IDS.map(buildHubTrack)
  const totalLessons = tracks.reduce((total, track) => total + track.lessonCount, 0)

  return (
    <>
      {/* The `Course list` carousel (ItemList of >=3 Courses from one provider) is the only Course
          rich result Google still awards, and the hub is the one page that can carry it: it is the
          single page that lists all three courses. Inputs come from the shared builder so this and
          each track page's standalone Course can never drift apart. */}
      <CourseListJsonLd courses={COURSE_IDS.map(learnCourseSchemaInput)} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Learn", url: LEARN_HUB_PATH },
        ]}
      />
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12 pt-28 sm:py-16 sm:pt-32">
        <header className="text-center">
          <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
            Learn
          </p>
          <h1 className="text-foreground mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Learn the fundamentals, then prove you can use them
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-pretty">
            CodeSparring&apos;s courses are free to read and run entirely in your browser. Every
            lesson takes one concept, explains it properly, and then makes you write it yourself
            while automated checks grade the result. There is nothing to install and no sample
            project to clone.
          </p>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm text-pretty">
            Reading is open to everyone. Sign in when you want to run the exercises and keep your
            progress.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {tracks.map((track) => (
              <Link
                key={track.courseId}
                href={trackPath(track.courseId)}
                className="border-accent/30 bg-accent/10 text-accent-strong hover:border-accent/60 hover:bg-accent/15 focus-visible:ring-accent/50 inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {track.label}
              </Link>
            ))}
            <Link
              href={LEARN_ALL_LESSONS_PATH}
              className="border-border text-muted-foreground hover:border-accent/40 hover:text-foreground focus-visible:ring-accent/50 inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Every lesson
            </Link>
          </div>
        </header>

        <section aria-labelledby="lesson-loop-heading" className="mt-16">
          <h2
            id="lesson-loop-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            How a lesson works
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
            Every lesson in every course follows the same three steps, so once you have done one you
            know how to do all of them.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {LESSON_LOOP.map((phase, index) => (
              <li
                key={phase.name}
                className="border-border bg-card rounded-2xl border p-5 text-left"
              >
                <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
                  Step {index + 1}
                </p>
                <h3 className="text-foreground mt-2 text-base font-semibold">{phase.name}</h3>
                <p className="text-muted-foreground mt-2 text-sm text-pretty">{phase.detail}</p>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm text-pretty">
            System Design works the same way with one substitution: instead of running code you
            write your own design answer, save it, and then reveal a model answer to compare
            against.
          </p>
        </section>

        <section aria-labelledby="audience-heading" className="mt-16">
          <h2
            id="audience-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Who it is for
          </h2>
          <ul className="text-muted-foreground mt-4 grid list-disc gap-2 pl-5 sm:grid-cols-2">
            {AUDIENCE.map((line) => (
              <li key={line} className="text-pretty">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="courses-heading" className="mt-16">
          <h2
            id="courses-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            The courses
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
            Three tracks, each broken into levels you can start from wherever you already are. No
            level is locked, so if you only need window functions you can go straight there.
          </p>

          <div className="mt-8 space-y-12">
            {tracks.map((track) => {
              const pitch = COURSE_PITCH[track.courseId]
              const headingId = `${track.courseId}-heading`
              const Mark = track.Mark
              return (
                <article key={track.courseId} aria-labelledby={headingId}>
                  <div className="flex items-start gap-4">
                    {Mark ? <Mark className="mt-1 h-10 w-10 shrink-0" /> : null}
                    <div>
                      <h3
                        id={headingId}
                        className="text-foreground text-lg font-semibold tracking-tight"
                      >
                        <Link
                          href={trackPath(track.courseId)}
                          className="hover:text-accent-strong focus-visible:ring-accent/50 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {track.label}
                        </Link>
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {pitch.headline}. {track.levels.length} levels, {track.lessonCount} lessons.
                      </p>
                    </div>
                  </div>

                  <p className="text-muted-foreground mt-4 max-w-3xl text-pretty">{pitch.body}</p>

                  <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                    {track.levels.map((level) => (
                      <li key={level.slug}>
                        <Link
                          href={level.href}
                          className="border-border hover:border-accent/40 focus-visible:ring-accent/50 block h-full rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <span className="text-foreground block text-sm font-semibold">
                            {level.title}
                          </span>
                          <span className="text-muted-foreground mt-1 block text-sm text-pretty">
                            {level.tagline}
                          </span>
                          <span className="text-muted-foreground mt-2 block text-xs">
                            {level.lessonCount} lessons, about {level.estimatedHours} hours
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </article>
              )
            })}
          </div>
        </section>

        <section
          aria-labelledby="index-heading"
          className="border-border bg-card mt-16 rounded-2xl border p-6 sm:p-8"
        >
          <h2
            id="index-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Prefer to see everything at once?
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
            The lesson index lists all {totalLessons} lessons, grouped by course and level, on a
            single page. It is the fastest way to find the one concept you came for.
          </p>
          <Link
            href={LEARN_ALL_LESSONS_PATH}
            className="border-accent/30 bg-accent/10 text-accent-strong hover:border-accent/60 hover:bg-accent/15 focus-visible:ring-accent/50 mt-5 inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Browse the full lesson index
          </Link>
        </section>
      </main>
      <Footer />
    </>
  )
}
