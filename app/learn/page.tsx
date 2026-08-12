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
 *
 * Layout rules this page is built on, all of them reactions to the version that came before:
 *
 * 1. The reader picks a course exactly once. The old hero offered four identical pills and then the
 *    same three courses again as full sections further down, so the same decision was posed twice
 *    with different weight and no ranking between the options. The pills are gone; `Choose a course`
 *    is the one place the choice is made, and it sits directly under the hero.
 * 2. "Free" is shown, not asserted. It used to be a clause in the middle of a grey paragraph, which
 *    is the weakest place on a page to put the single strongest fact about the product. It is now a
 *    fact strip under the headline.
 * 3. Levels are links, not cards. There are 28 of them across the three courses; as bordered
 *    three-line cards they were the bulk of the page's height and the source of the clutter. The
 *    taglines they carried are duplicated verbatim on each track page, so dropping them here costs
 *    nothing and removes 28 paragraphs.
 * 4. The goods come before the qualification. `Who it is for` used to sit above the courses, asking
 *    the reader to audition for a free page before seeing what was on it.
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

/**
 * Who the curriculum is for.
 *
 * Each entry is a two-part line: `who` is the label the reader scans for to find themselves, `need`
 * is what that person gets. Split rather than one sentence because a disc list of four full
 * sentences is unscannable, and self-identification is the entire job of this section.
 */
const AUDIENCE: { who: string; need: string }[] = [
  {
    who: "Students",
    need: "preparing for internship and new-grad software or data engineering interviews.",
  },
  {
    who: "Career switchers",
    need: "who can follow a tutorial but freeze in front of an empty editor.",
  },
  {
    who: "Working engineers",
    need: "who write one language all day and need SQL or system design back in working memory.",
  },
  {
    who: "The undecided",
    need: "who want to read the material first and judge later whether the interview practice is worth paying for.",
  },
]

/**
 * Per-course positioning copy. Keyed by `CourseId`, so a fourth course fails to compile here.
 *
 * `headline` and `hook` are what the course card in `Choose a course` renders, and they are the only
 * course copy most readers will read: the card grid is where the decision is made. `body` is the
 * long form, deliberately held back until `What is in each course`, where the reader has already
 * chosen and is looking for confirmation rather than orientation.
 */
const COURSE_PITCH: Record<CourseId, { headline: string; hook: string; body: string }> = {
  python: {
    headline: "The Python that interviews actually test",
    hook: "One behaviour per lesson, graded against real test cases.",
    body: "Not a language tour. Each lesson takes one behaviour that trips people up under pressure, such as mutable default arguments, integer division, truthiness, or the GIL, explains why it works that way, and then makes you write it. Every exercise runs in your browser and is graded against real test cases.",
  },
  "data-engineering": {
    headline: "A real database, running in the tab",
    hook: "Write SQL against seeded tables and watch the rows come back.",
    body: "The course starts where every data engineering interview starts, with SQL: you write queries against seeded tables and see the rows come back, from your first SELECT through joins, aggregation, and window functions. Later sections keep the same graded editor and point it at the rest of the job, querying a simulated cloud platform's own metadata to reason about storage, file formats, partitioning, pipelines, and cost. Because the database is real, a wrong query fails the way it would in production rather than the way a quiz says it should.",
  },
  "system-design": {
    headline: "Write the answer, then compare it",
    hook: "Free response, then a model answer to measure yourself against.",
    body: "System design is not multiple choice, so these lessons are free response. You read the concept, write your own design answer, and only then reveal a model answer to compare against. The comparison is where the learning is. When the concepts hold, the course ends in drills: open-ended briefs, each one a full timed round with an AI interviewer who questions your design while you build it.",
  },
}

/**
 * One level, projected to exactly what this page renders.
 *
 * No tagline: the hub lists levels as one-line links, and every tagline it used to print is already
 * on the course's own track page, where it has room to be read.
 */
interface HubLevel {
  slug: string
  title: string
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
          {/* One sentence. The version before this ran two paragraphs here, the second of them
              answering an objection ("do I need an account?") the reader has not had yet. That
              answer now lives beside the Apply step, which is the first moment it is true. */}
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg text-pretty">
            Every lesson takes one concept, explains it properly, and then makes you write it
            yourself while automated checks grade the result.
          </p>
          {/* The fact strip. These three facts were previously buried mid-paragraph in body grey,
              which is the weakest place on the page for the strongest thing about it. */}
          <ul className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
            <li className="border-accent/30 bg-accent/10 text-accent-strong rounded-full border px-3 py-1 font-medium">
              Free to read
            </li>
            <li className="border-border rounded-full border px-3 py-1">Runs in your browser</li>
            <li className="border-border rounded-full border px-3 py-1">Nothing to install</li>
            <li className="border-border rounded-full border px-3 py-1">{totalLessons} lessons</li>
          </ul>
        </header>

        {/* The one place the reader chooses a course. Three cards, equal weight, each carrying the
            single line that distinguishes it plus the size of the commitment. */}
        <section aria-labelledby="choose-heading" className="mt-14 sm:mt-16">
          <h2 id="choose-heading" className="sr-only">
            Choose a course
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {tracks.map((track) => {
              const pitch = COURSE_PITCH[track.courseId]
              const Mark = track.Mark
              return (
                <li key={track.courseId}>
                  <Link
                    href={trackPath(track.courseId)}
                    className="border-border bg-card hover:border-accent/50 focus-visible:ring-accent/50 flex h-full flex-col rounded-2xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {Mark ? <Mark className="h-9 w-9" aria-hidden="true" /> : null}
                    <span className="text-foreground mt-4 block text-base font-semibold tracking-tight">
                      {track.label}
                    </span>
                    <span className="text-muted-foreground mt-1.5 block text-sm text-pretty">
                      {pitch.hook}
                    </span>
                    <span className="text-muted-foreground border-border mt-4 block border-t pt-3 text-xs">
                      {track.levels.length} levels &middot; {track.lessonCount} lessons
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section aria-labelledby="lesson-loop-heading" className="mt-20">
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
          <div className="text-muted-foreground mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <p className="text-pretty">
              <span className="text-foreground font-medium">Reading needs no account.</span> Sign in
              when you want to run the exercises and keep your progress.
            </p>
            <p className="text-pretty">
              <span className="text-foreground font-medium">
                System Design substitutes one step.
              </span>{" "}
              Instead of running code you write your own design answer, save it, and reveal a model
              answer to compare against. It adds a fourth step at the end of the course, a drill,
              which is the whole interview rather than one concept from it.
            </p>
          </div>
        </section>

        <section aria-labelledby="courses-heading" className="mt-20">
          <h2
            id="courses-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            What is in each course
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-pretty">
            No level is locked, so if you only need window functions you can go straight there.
          </p>

          {/* Levels render as one-line links rather than cards. There are 28 of them; as bordered
              three-line cards they were most of this page's height. */}
          <div className="divide-border mt-8 divide-y">
            {tracks.map((track) => {
              const pitch = COURSE_PITCH[track.courseId]
              const headingId = `${track.courseId}-heading`
              const Mark = track.Mark
              return (
                <article
                  key={track.courseId}
                  aria-labelledby={headingId}
                  className="grid gap-x-10 gap-y-6 py-10 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,20rem)_1fr]"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      {Mark ? <Mark className="h-8 w-8 shrink-0" aria-hidden="true" /> : null}
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
                    </div>
                    <p className="text-foreground mt-3 font-medium text-pretty">{pitch.headline}</p>
                    <p className="text-muted-foreground mt-2 text-sm text-pretty">{pitch.body}</p>
                  </div>

                  <ol className="self-start">
                    {track.levels.map((level) => (
                      <li key={level.slug}>
                        <Link
                          href={level.href}
                          className="group border-border hover:border-accent/40 focus-visible:ring-accent/50 flex items-baseline justify-between gap-4 border-b py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <span className="text-foreground group-hover:text-accent-strong text-sm font-medium transition-colors">
                            {level.title}
                          </span>
                          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                            {level.lessonCount} lessons &middot; ~{level.estimatedHours}h
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

        {/* Qualification comes after the goods, not before them. */}
        <section aria-labelledby="audience-heading" className="mt-20">
          <h2
            id="audience-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Who it is for
          </h2>
          <ul className="text-muted-foreground mt-5 grid gap-3 sm:grid-cols-2">
            {AUDIENCE.map((entry) => (
              <li key={entry.who} className="border-border border-l-2 pl-4 text-sm text-pretty">
                <span className="text-foreground font-semibold">{entry.who}</span> {entry.need}
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="index-heading"
          className="border-border bg-card mt-20 rounded-2xl border p-6 text-center sm:p-8"
        >
          <h2
            id="index-heading"
            className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl"
          >
            Prefer to see everything at once?
          </h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-pretty">
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
