import type { Metadata } from "next"
import Link from "next/link"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { COURSE_IDS, listCourseLevels } from "@/lib/tutorials/course-catalog"
import {
  LEARN_COURSE_LABEL,
  LEARN_HUB_PATH,
  levelPath,
  publicLessonPath,
  trackPath,
} from "@/lib/tutorials/lesson-routes"
import type { CourseId } from "@/lib/tutorials/types"

/**
 * The complete lesson index — one static page that links every public lesson in every course.
 *
 * ## Why this page exists
 *
 * The curriculum is several hundred lessons deep and its natural shape is a tree: hub, track, level,
 * lesson. That puts a lesson four hops from the homepage, and the deepest tier of a tree that wide is
 * exactly what crawlers discover last and re-crawl least. This page flattens the tree into a single
 * hop: the footer links here from every page on the site, and from here every lesson is one click
 * away. It also gives a returning reader the one thing a tree navigation cannot, which is the
 * ability to scan the whole curriculum and find the single concept they came for.
 *
 * ## How it stays correct
 *
 * Everything below is derived from `course-catalog` at build time. Nothing about the corpus is
 * written by hand, because a concurrent authoring loop keeps committing lessons: any list or count
 * hardcoded here would be stale almost immediately. Adding a lesson to a curriculum file adds it to
 * this page on the next build, with no edit here.
 *
 * Server Component with no request-time input, so Next.js prerenders it. Every link is a real
 * `<a href>` to the canonical public lesson URL, never the auth-gated workspace URL.
 */

export const metadata: Metadata = {
  // No brand here: the root layout's `title.template` appends " | CodeSparring" already.
  title: "All Learn lessons",
  description:
    "The complete index of every free CodeSparring lesson, grouped by course and level. Python, SQL, and System Design, all readable in the browser.",
  alternates: {
    canonical: "/learn/all",
  },
}

/** One lesson row. */
interface IndexLesson {
  id: string
  title: string
  href: string
  estimatedMinutes: number
}

/** One module of lessons inside a level. Modules are kept because they are the author's grouping. */
interface IndexModule {
  id: string
  title: string
  lessons: IndexLesson[]
}

/** One level, with its own landing link and the modules under it. */
interface IndexLevel {
  slug: string
  title: string
  tagline: string
  href: string
  modules: IndexModule[]
  lessonCount: number
}

/** One course section of the index. */
interface IndexCourse {
  courseId: CourseId
  label: string
  href: string
  levels: IndexLevel[]
  lessonCount: number
}

/** Project one course out of the catalog into the flat shape this page renders. */
function buildIndexCourse(courseId: CourseId): IndexCourse {
  const levels: IndexLevel[] = listCourseLevels(courseId).map((level) => {
    const modules: IndexModule[] = level.modules.map((mod) => ({
      id: mod.id,
      title: mod.title,
      lessons: mod.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        href: publicLessonPath(courseId, level.slug, lesson.id),
        estimatedMinutes: lesson.estimatedMinutes,
      })),
    }))

    return {
      slug: level.slug,
      title: level.title,
      tagline: level.tagline,
      href: levelPath(courseId, level.slug),
      modules,
      lessonCount: modules.reduce((total, mod) => total + mod.lessons.length, 0),
    }
  })

  return {
    courseId,
    label: LEARN_COURSE_LABEL[courseId],
    href: trackPath(courseId),
    levels,
    lessonCount: levels.reduce((total, level) => total + level.lessonCount, 0),
  }
}

export default function AllLessonsPage() {
  const courses = COURSE_IDS.map(buildIndexCourse)
  const totalLessons = courses.reduce((total, course) => total + course.lessonCount, 0)

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12 pt-28 sm:py-16 sm:pt-32">
        <header>
          <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
            <Link
              href={LEARN_HUB_PATH}
              className="hover:text-foreground focus-visible:ring-accent/50 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Learn
            </Link>
          </p>
          <h1 className="text-foreground mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Every lesson, on one page
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-pretty">
            All {totalLessons} CodeSparring lessons, grouped by course and level. Each one is free
            to read: the explanation, the worked example, and both exercise prompts are open to
            everyone. Sign in when you want to run your answer and have it graded.
          </p>

          <nav aria-label="Jump to a course" className="mt-6 flex flex-wrap gap-2">
            {courses.map((course) => (
              <a
                key={course.courseId}
                href={`#${course.courseId}`}
                className="border-border text-muted-foreground hover:border-accent/40 hover:text-foreground focus-visible:ring-accent/50 inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {course.label} ({course.lessonCount})
              </a>
            ))}
          </nav>
        </header>

        <div className="mt-14 space-y-16">
          {courses.map((course) => (
            <section
              key={course.courseId}
              id={course.courseId}
              aria-labelledby={`${course.courseId}-heading`}
              className="scroll-mt-24"
            >
              <div className="border-border border-b pb-4">
                <h2
                  id={`${course.courseId}-heading`}
                  className="text-foreground text-2xl font-semibold tracking-tight"
                >
                  <Link
                    href={course.href}
                    className="hover:text-accent-strong focus-visible:ring-accent/50 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {course.label}
                  </Link>
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {course.levels.length} levels, {course.lessonCount} lessons
                </p>
              </div>

              <div className="mt-8 space-y-10">
                {course.levels.map((level) => (
                  <section
                    key={level.slug}
                    aria-labelledby={`${course.courseId}-${level.slug}-heading`}
                  >
                    <h3
                      id={`${course.courseId}-${level.slug}-heading`}
                      className="text-foreground text-base font-semibold tracking-tight"
                    >
                      <Link
                        href={level.href}
                        className="hover:text-accent-strong focus-visible:ring-accent/50 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {level.title}
                      </Link>
                    </h3>
                    <p className="text-muted-foreground mt-1 max-w-3xl text-sm text-pretty">
                      {level.tagline}
                    </p>

                    <div className="mt-4 space-y-6">
                      {level.modules.map((mod) => (
                        <div key={mod.id}>
                          <h4 className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
                            {mod.title}
                          </h4>
                          <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                            {mod.lessons.map((lesson) => (
                              <li key={lesson.id} className="flex items-baseline gap-2">
                                <Link
                                  href={lesson.href}
                                  className="text-foreground hover:text-accent-strong focus-visible:ring-accent/50 rounded-sm text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                >
                                  {lesson.title}
                                </Link>
                                <span className="text-muted-foreground shrink-0 text-xs">
                                  {lesson.estimatedMinutes} min
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
