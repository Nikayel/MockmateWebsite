import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"

import { LEARN_HUB_PATH } from "@/lib/tutorials/lesson-routes"
import type { CompanyLearnLink } from "@/lib/interview-prep/company-learn-routes"

/**
 * The bridge from a company guide into the free Learn corpus.
 *
 * Deliberately a Server Component with no auth awareness. Every link it renders points at a public,
 * statically generated reading page, so the whole block ships inside the company page's static HTML:
 * a signed-out visitor can click straight through, and a crawler sees 38 company pages linking into
 * the curriculum instead of 38 dead ends. Nothing here is gated and nothing here needs to be.
 *
 * The lists come from `lib/interview-prep/company-learn-routes.ts`, which resolves them against the
 * live catalog at build time. Both can legitimately be empty (a company with no aliased pattern, or
 * a corpus that moved), and in that case this renders nothing at all rather than an empty heading.
 */
interface CompanyLearnPathsProps {
  companyName: string
  patternLinks: CompanyLearnLink[]
  systemDesignLinks: CompanyLearnLink[]
}

function LessonCard({ link }: { link: CompanyLearnLink }) {
  return (
    <li>
      <Link
        href={link.href}
        className="group border-border bg-card hover:border-border hover:bg-muted focus-visible:ring-ring block h-full rounded-lg border p-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <span className="text-muted-foreground mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-muted text-foreground rounded px-1.5 py-0.5 font-medium">
            {link.because}
          </span>
          <span>{link.courseLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{link.estimatedMinutes} min read</span>
        </span>
        <span className="text-foreground block font-medium group-hover:text-emerald-400">
          {link.title}
        </span>
        <span className="text-muted-foreground mt-1 block text-sm">{link.summary}</span>
      </Link>
    </li>
  )
}

export function CompanyLearnPaths({
  companyName,
  patternLinks,
  systemDesignLinks,
}: CompanyLearnPathsProps) {
  if (patternLinks.length === 0 && systemDesignLinks.length === 0) return null

  return (
    <section aria-labelledby="company-learn-heading" className="border-border border-t py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-start gap-3">
            <BookOpen className="text-muted-foreground mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2
                id="company-learn-heading"
                className="text-foreground text-xl font-medium sm:text-2xl"
              >
                Start studying now, without an account
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Every lesson below is a free public reading page. No sign-up, no install, and the
                worked examples run in the tab.
              </p>
            </div>
          </div>

          {patternLinks.length > 0 && (
            <div className="mb-8">
              <h3 className="text-foreground mb-1 text-sm font-medium">
                The Python behind {companyName}&apos;s top patterns
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                These lessons do not teach the patterns themselves. They teach the language
                mechanics each pattern is built from, which is the part you have to have in your
                hands before the pattern is worth practicing.
              </p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {patternLinks.map((link) => (
                  <LessonCard key={link.lessonId} link={link} />
                ))}
              </ul>
            </div>
          )}

          {systemDesignLinks.length > 0 && (
            <div className="mb-8">
              <h3 className="text-foreground mb-1 text-sm font-medium">
                {companyName} runs a system design round
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                The System Design course opens with the method itself: how to scope a vague prompt,
                turn it into requirements you can defend, and budget the clock. You write your own
                answer first, then reveal a model answer to compare against.
              </p>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {systemDesignLinks.map((link) => (
                  <LessonCard key={link.lessonId} link={link} />
                ))}
              </ul>
            </div>
          )}

          <Link
            href={LEARN_HUB_PATH}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Browse the full curriculum
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
