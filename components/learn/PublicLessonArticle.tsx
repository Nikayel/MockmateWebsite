import Link from "next/link"
import { ArrowLeft, ArrowRight, ChevronRight, Clock } from "lucide-react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { LessonUnlockCard } from "./LessonUnlockCard"
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd"
import { LessonJsonLd } from "@/components/seo/LessonJsonLd"
import { truncateForDescription } from "@/lib/seo/learn-metadata"
import {
  LEARN_COURSE_LABEL,
  LEARN_HUB_PATH,
  levelPath,
  publicLessonPath,
  trackPath,
} from "@/lib/tutorials/lesson-routes"
import { levelLabel } from "@/lib/tutorials/level-title"
import type { PublicExercisePreview, PublicLessonPreview } from "@/lib/tutorials/public-preview"
import type { DifficultyLevel } from "@/lib/scenarios/types"

/**
 * The public reading page for one lesson.
 *
 * ## Why this is not the workspace
 *
 * The interactive player is a `h-[100dvh]` three-column tool with `min-w-[1080px]`, which is the
 * right shape for someone who came to write code and the wrong shape for someone who arrived from a
 * search result on a phone. This component is the reading shape of the same content: the marketing
 * `Header` and `Footer` (so a search visitor lands inside the real site and can go anywhere), a
 * breadcrumb, one `h1`, and a single column of prose capped near 68 characters, which is the measure
 * long-form reading actually wants.
 *
 * ## What it may render
 *
 * It takes a {@link PublicLessonPreview}, never an authored lesson. That type is the allowlist
 * projection from `lib/tutorials/public-preview.ts`, so there is no way for a reference solution, a
 * test case, a hint, or a model answer to reach this file even by accident. The counts it prints
 * (hints, graded checks, bonus drills) come from array lengths, never contents.
 *
 * The whole `teach.markdown` renders at once. `SegmentedTeachPanel` is deliberately NOT reused: it
 * shows the first segment and reveals the rest on click, which on a public page would publish a
 * fraction of each lesson to a crawler and read as a teaser wall to a human.
 */

/** One neighbouring lesson in the course's reading order. */
export interface PublicLessonLink {
  title: string
  href: string
}

/** Prev/next links, resolved server-side from the course catalog so they cross level boundaries. */
export interface PublicLessonArticleNav {
  previous: PublicLessonLink | null
  next: PublicLessonLink | null
}

/**
 * Difficulty as an ordered traffic light. The light-mode shades are the 800s, not the 600s: the
 * contrast reasoning is recorded once on `components/tutorials/LessonHeader.tsx`, and these match it
 * so the same lesson reads the same in the reading page and in the workspace.
 */
const DIFFICULTY_CLASS: Record<DifficultyLevel, string> = {
  easy: "border-emerald-500/30 text-emerald-800 dark:text-emerald-400",
  medium: "border-amber-500/30 text-amber-800 dark:text-amber-400",
  hard: "border-rose-500/30 text-rose-800 dark:text-rose-400",
}

/** Fence language for the worked example, by course. System Design lessons carry no demo code. */
const DEMO_LANGUAGE: Record<PublicLessonPreview["courseId"], string> = {
  python: "Python",
  "data-engineering": "SQL",
  "system-design": "",
}

/**
 * The honest one-liner about what is waiting behind sign-in for this exercise.
 *
 * Both counts are omitted when zero rather than printed as "0 hints", because a free-response
 * System Design exercise genuinely has neither, and claiming otherwise on 208 pages would be the
 * kind of small lie that makes the rest of the page untrustworthy. Returns null when there is
 * nothing true to say.
 */
function workspaceContentsLine(exercise: PublicExercisePreview): string | null {
  const parts: string[] = []
  if (exercise.hintCount > 0) {
    parts.push(`${exercise.hintCount} ${exercise.hintCount === 1 ? "hint" : "hints"}`)
  }
  if (exercise.gradedCheckCount > 0) {
    parts.push(
      `${exercise.gradedCheckCount} automated ${exercise.gradedCheckCount === 1 ? "check" : "checks"}`
    )
  }
  if (parts.length === 0) return null

  const singular = parts.length === 1 && exercise.hintCount + exercise.gradedCheckCount === 1
  return `${parts.join(" and ")} ${singular ? "is" : "are"} waiting in the workspace.`
}

/** One exercise, shown as its task statement plus an honest description of the gated half. */
function ExerciseSection({
  eyebrow,
  heading,
  blurb,
  exercise,
}: {
  eyebrow: string
  heading: string
  blurb: string
  exercise: PublicExercisePreview
}) {
  const contents = workspaceContentsLine(exercise)

  return (
    <section className="border-border mt-10 border-t pt-8">
      <p className="text-accent-strong text-xs font-semibold tracking-[0.18em] uppercase">
        {eyebrow}
      </p>
      <h2 className="text-foreground mt-2 text-xl font-semibold tracking-tight text-balance">
        {heading}
      </h2>
      <p className="text-muted-foreground mt-1.5 text-sm text-pretty">{blurb}</p>

      <div className="prose dark:prose-invert mt-4 max-w-none">
        <MarkdownRenderer content={exercise.prompt} />
      </div>

      {exercise.thinkAbout && exercise.thinkAbout.length > 0 && (
        <div className="border-border bg-muted/30 mt-5 rounded-xl border p-4">
          <h3 className="text-foreground text-sm font-semibold">Think about</h3>
          <ol className="text-muted-foreground mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm">
            {exercise.thinkAbout.map((question) => (
              <li key={question} className="text-pretty">
                {question}
              </li>
            ))}
          </ol>
        </div>
      )}

      {contents && <p className="text-muted-foreground mt-4 text-sm">{contents}</p>}
    </section>
  )
}

/** A static, readable rendering of an authored code sample. Matches the markdown code-fence chrome. */
function SampleBlock({ label, code }: { label: string; code: string }) {
  return (
    <figure className="mt-6">
      <figcaption className="text-muted-foreground mb-1.5 text-xs font-medium">{label}</figcaption>
      {/* Theme tokens, matching the markdown fence. This carried the same hardcoded grays with
          no dark: variant, so a worked example rendered a dark box on a light page. */}
      <pre className="border-border bg-card/40 text-foreground/90 overflow-x-auto rounded-lg border p-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  )
}

export function PublicLessonArticle({
  preview,
  nav,
}: {
  preview: PublicLessonPreview
  nav: PublicLessonArticleNav
}) {
  const courseLabel = LEARN_COURSE_LABEL[preview.courseId]
  const coursePath = trackPath(preview.courseId)
  const levelHref = levelPath(preview.courseId, preview.levelSlug)
  const lessonPath = publicLessonPath(preview.courseId, preview.levelSlug, preview.id)
  const demoLanguage = DEMO_LANGUAGE[preview.courseId]

  return (
    <>
      <Header />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-16 sm:px-6 sm:pt-32">
        {/* The BreadcrumbList JSON-LD and the visible breadcrumb are built side by side from the
            same five values, so the structured data always describes links a human can actually
            see and click on this exact page.

            The trail starts at Home. Every other breadcrumb on the site does - the level pages, the
            Learn hub, blog posts, interview-prep - and a lesson trail that began at "Learn" made the
            deepest pages on the site the only ones claiming no parent above their section. In a
            rendered rich result that is the difference between "CodeSparring > Learn > Python > ..."
            and a trail that starts mid-site. */}
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "/" },
            { name: "Learn", url: LEARN_HUB_PATH },
            { name: courseLabel, url: coursePath },
            { name: preview.levelTitle, url: levelHref },
            {
              name: preview.title,
              url: lessonPath,
            },
          ]}
        />
        {/* Structured data describing THE LESSON. Until this landed, the only JSON-LD on a lesson
            page was the four site-level blocks, every one of which describes CodeSparring the
            product, so a page about fencing tokens told Google it was software priced at $25 a
            month. The description is the same string the meta tag carries, built by the same
            truncation, so the two cannot drift. */}
        <LessonJsonLd
          preview={preview}
          path={lessonPath}
          description={truncateForDescription(preview.summary)}
        />
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
            <li>
              <Link
                href="/"
                className="hover:text-foreground focus-visible:ring-accent/50 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Home
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
            <li>
              <Link
                href={LEARN_HUB_PATH}
                className="hover:text-foreground focus-visible:ring-accent/50 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Learn
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
            <li>
              <Link
                href={coursePath}
                className="hover:text-foreground focus-visible:ring-accent/50 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {courseLabel}
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
            <li>
              <Link
                href={levelHref}
                className="hover:text-foreground focus-visible:ring-accent/50 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {preview.levelTitle}
              </Link>
            </li>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
            <li className="text-foreground min-w-0 font-medium" aria-current="page">
              {preview.title}
            </li>
          </ol>
        </nav>

        <article>
          <header className="border-border border-b pb-6">
            <h1 className="text-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {preview.title}
            </h1>

            <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="border-border bg-muted/40 rounded-full border px-2 py-0.5 font-medium">
                {levelLabel(preview.levelId, preview.levelTitle)}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 font-medium capitalize ${DIFFICULTY_CLASS[preview.difficulty]}`}
              >
                {preview.difficulty}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {preview.estimatedMinutes} min
              </span>
              {preview.skills.map((skill) => (
                <span
                  key={skill}
                  className="border-border bg-muted/40 rounded-full border px-2 py-0.5 font-mono"
                >
                  {skill}
                </span>
              ))}
            </div>

            <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-pretty">
              {preview.summary}
            </p>
          </header>

          {/* The reading measure. `max-w-[68ch]` is the cap; the container above is already narrow,
              so on a phone this is a no-op and on a desktop it stops the prose going full bleed. */}
          <div className="prose dark:prose-invert mt-8 max-w-[68ch]">
            <MarkdownRenderer content={preview.teach.markdown} />
          </div>

          {preview.teach.demoSeedSql && (
            <SampleBlock label="Sample data for this example" code={preview.teach.demoSeedSql} />
          )}
          {preview.teach.demoCode && (
            <SampleBlock
              label={demoLanguage ? `Worked example (${demoLanguage})` : "Worked example"}
              code={preview.teach.demoCode}
            />
          )}

          <ExerciseSection
            eyebrow="Apply"
            heading="Your turn"
            blurb="The task this lesson builds to."
            exercise={preview.apply}
          />

          <ExerciseSection
            eyebrow="Practice"
            heading="Make it stick"
            blurb={
              preview.extraPracticeCount > 0
                ? `A second problem on the same idea, plus ${preview.extraPracticeCount} bonus ${preview.extraPracticeCount === 1 ? "drill" : "drills"}.`
                : "A second problem on the same idea, so it survives past today."
            }
            exercise={preview.practice}
          />

          <LessonUnlockCard
            courseId={preview.courseId}
            levelSlug={preview.levelSlug}
            lessonId={preview.id}
            lessonTitle={preview.title}
          />
        </article>

        {/* Prev/next keeps the corpus shallow for a crawler and gives a reader somewhere to go that
            is not the back button. Neighbours are resolved across level boundaries by the caller. */}
        <nav aria-label="Lesson navigation" className="border-border mt-12 border-t pt-8">
          <div className="grid gap-3 sm:grid-cols-2">
            {nav.previous ? (
              <Link
                href={nav.previous.href}
                rel="prev"
                className="border-border hover:border-accent/50 focus-visible:ring-accent/50 group flex flex-col gap-1 rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Previous lesson
                </span>
                <span className="text-foreground text-sm font-medium text-pretty">
                  {nav.previous.title}
                </span>
              </Link>
            ) : (
              <span aria-hidden="true" className="hidden sm:block" />
            )}

            {nav.next && (
              <Link
                href={nav.next.href}
                rel="next"
                className="border-border hover:border-accent/50 focus-visible:ring-accent/50 group flex flex-col gap-1 rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none sm:text-right"
              >
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium sm:justify-end">
                  Next lesson
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-foreground text-sm font-medium text-pretty">
                  {nav.next.title}
                </span>
              </Link>
            )}
          </div>

          <p className="mt-6 text-sm">
            <Link
              href={levelHref}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 inline-flex items-center gap-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All lessons in {preview.levelTitle}
            </Link>
          </p>
        </nav>
      </div>
      <Footer />
    </>
  )
}
