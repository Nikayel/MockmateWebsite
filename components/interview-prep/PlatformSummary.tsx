import Link from "next/link"
import { ArrowRight, MessageSquare, Terminal, ClipboardCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LEARN_HUB_PATH } from "@/lib/tutorials/lesson-routes"
import type { LearnCorpusSummary } from "@/lib/interview-prep/company-learn-routes"

/**
 * What CodeSparring actually is, for a visitor who arrived on a company guide from search.
 *
 * `/interview-prep` and its 38 company pages are the most-crawled surface on the site and, until
 * now, the least representative: a signed-out reader saw pattern tables and lock icons and left with
 * no idea that the product is an AI interview simulator with a live code runtime, or that several
 * hundred lessons are readable without an account. This is the section that says so.
 *
 * Every claim below is either a shipped product surface (`/interview`, the in-browser runner, the
 * post-session rubric) or a number counted from the live curriculum registries via
 * `summarizeLearnCorpus()`. No figure is written by hand, because the corpus grows weekly and a
 * hardcoded total would be stale within days.
 *
 * Server Component on purpose: it renders identically for everyone, so it stays in the static HTML.
 */
interface PlatformSummaryProps {
  corpus: LearnCorpusSummary
  /** Set on a company page so the copy names what the visitor came for. Omit on the hub. */
  companyName?: string
}

/** One shipped capability. Kept as data so the three cards cannot drift apart in markup. */
const CAPABILITIES: { name: string; detail: string; Icon: typeof MessageSquare }[] = [
  {
    name: "An interviewer that reacts",
    detail:
      "Carry one problem from clarifying questions through to working code while an AI interviewer responds to what you say and what you type, by voice or by text.",
    Icon: MessageSquare,
  },
  {
    name: "Code that actually runs",
    detail:
      "An editor in the page with a real runtime and real test cases. You run your solution and read the output, the same way you would in a shared editor on the day.",
    Icon: Terminal,
  },
  {
    name: "A scored round, not a vibe",
    detail:
      "Every session ends with a rubric covering problem solving, communication, and code quality, so you can see which part of the round is costing you the offer.",
    Icon: ClipboardCheck,
  },
]

export function PlatformSummary({ corpus, companyName }: PlatformSummaryProps) {
  const heading = companyName
    ? `Reading the guide is the easy part. ${companyName} will ask you to perform.`
    : "A guide tells you what they ask. Practice tells you whether you can answer."

  return (
    <section aria-labelledby="platform-summary-heading" className="border-border border-t py-14">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <h2
            id="platform-summary-heading"
            className="text-foreground mb-2 text-2xl font-semibold sm:text-3xl"
          >
            {heading}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            CodeSparring is a practice environment, not a question bank. You sit a full round
            against an AI interviewer, in an editor that runs your code, and you leave with a score
            and a specific next rep.
          </p>

          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CAPABILITIES.map(({ name, detail, Icon }) => (
              <div key={name} className="border-border bg-card rounded-lg border p-4">
                <Icon className="text-muted-foreground mb-3 h-5 w-5" aria-hidden="true" />
                <h3 className="text-foreground mb-1 font-medium">{name}</h3>
                <p className="text-muted-foreground text-sm">{detail}</p>
              </div>
            ))}
          </div>

          <div className="border-border bg-card mb-8 rounded-lg border p-5">
            <h3 className="text-foreground mb-1 font-medium">
              And {corpus.lessonCount} lessons you can read right now, free
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              The whole curriculum is public. Read the concept, run the worked example in the tab,
              and only sign in when you want the graded exercise at the end of a lesson.
            </p>
            <ul className="flex flex-wrap gap-2">
              {corpus.courses.map((course) => (
                <li key={course.courseId}>
                  <Link
                    href={course.href}
                    className="border-border bg-background text-foreground hover:bg-muted focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span className="font-medium">{course.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {course.lessonCount} lessons
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={LEARN_HUB_PATH}
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  All courses
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>

          <Button asChild className="bg-white text-black hover:bg-zinc-200">
            <Link href="/interview">
              Start a practice round
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
