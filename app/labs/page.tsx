/**
 * Case Labs gallery — `/labs`.
 *
 * ## Above the fold there are exactly three things
 *
 * An `<h1>`, one line, one button. Everything else moved below the labs. The page previously opened
 * with two intro paragraphs, a five-card milestone explainer, a round-type essay and three rows of
 * filter chips: about 650 words and roughly two and a half screens before the first lab was on
 * screen, on a page whose only job is to get someone into a lab.
 *
 * ## Order
 *
 *   1. Hero            h1 + one line
 *   2. Primary CTA     one button + one qualifier line
 *   3. Pick a case lab filters + two groups of cards
 *   4. How a lab works five-step strip + shared detail panel
 *   5. SEO prose       what a decomposition interview is / who interviews this way
 *   6. Common questions FAQ disclosure
 *   7. Where to practice next
 *
 * The milestone strip below the cards answers a question the visitor now has; above them it raised
 * one they did not. Nothing was cut to make room: the explanatory copy is all still here, still
 * Server Components in the initial HTML, and it tiles instead of stacking.
 *
 * ## The h1 carries the query
 *
 * It used to be the word "Case Labs", which nobody searches for and which the nav already says. The
 * page ranks on its URL and title alone today; "decomposition interview practice" is what the labs
 * actually are and what a candidate types the week before a Palantir or Stripe loop.
 *
 * ## One entry point, not two
 *
 * The hero CTA is the only "start here". The grid briefly repeated it as an accent-bordered card
 * with a START HERE tab, which made the other three labs look like the ones you were not meant to
 * pick. The CTA resolves through `getStarterCaseLab`, so it cannot name a retired lab.
 *
 * Filters stay `useState` only. Making them URL state would mint an indexable URL per filter
 * combination over a four-lab catalog, which is a doorway-page generator, not navigation.
 */

import Link from "next/link"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CaseLabGallery } from "@/components/labs/CaseLabGallery"
import { BreadcrumbJsonLd, CourseListJsonLd } from "@/components/seo/JsonLd"
import { getStarterCaseLab, listCaseLabs } from "@/lib/labs/case-labs"
import { canonicalPageMetadata } from "@/lib/seo/page-metadata"
import { MilestoneStrip } from "./_components/MilestoneStrip"
import { CaseLabsExplainer } from "./_components/CaseLabsExplainer"
import { CaseLabsFaq } from "./_components/CaseLabsFaq"
import { CaseLabNextSteps } from "./_components/CaseLabNextSteps"

export const metadata = canonicalPageMetadata({
  path: "/labs",
  // No site name: `app/layout.tsx` sets `title.template = "%s | CodeSparring"` and appends it.
  title: "Decomposition Interview Practice: Palantir FDSE & Stripe Style Labs",
  description:
    "Practice the decomposition interview on a real multi-file codebase. Scope an underspecified problem, commit to a design, then build until the tests pass, in labs modeled on Palantir FDSE and Stripe engineering rounds.",
})

export default function CaseLabsGalleryPage() {
  const labs = listCaseLabs()
  const starter = getStarterCaseLab()

  // The global nav stays outside the workbook scope so it keeps the app's dark chrome; everything
  // below it is the light-by-default workbook surface the labs themselves use.
  return (
    <>
      <Header />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Case Labs", url: "/labs" },
        ]}
      />
      {/* `Course` per lab rather than a bare `ItemList` of links. Each lab is a self-contained,
          free, hour-shaped unit of work with an authored description, a skill list and a real
          duration, so the vocabulary fits and it carries strictly more than titles and order. The
          `isAccessibleForFree` claim inside the schema is true of what is indexed here: the brief,
          the five milestones and the Build workspace all open without an account. */}
      <CourseListJsonLd
        courses={labs.map((lab) => ({
          name: lab.title,
          description: lab.hook,
          url: `/labs/${lab.id}`,
          workloadMinutes: lab.estimatedMinutes,
          teaches: lab.skills,
        }))}
      />
      <main className="case-lab-workbook min-h-screen bg-[var(--wb-page)] text-[var(--wb-text)]">
        <div className="container mx-auto flex max-w-[1120px] flex-col gap-10 px-4 pt-20 pb-16 sm:pt-24">
          <header className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <h1 className="max-w-[760px] text-2xl leading-tight font-bold text-[var(--wb-text)] sm:text-4xl">
                Decomposition interview practice, on a real codebase
              </h1>
              <p className="max-w-[640px] text-sm leading-relaxed text-[var(--wb-text-secondary)] sm:text-base">
                The round Palantir FDSE and Stripe engineering interviews actually run: scope an
                underspecified problem, decompose it, design it, then build until the tests pass.
              </p>
            </div>
            {starter && (
              <div className="flex flex-col items-start gap-2">
                <Button asChild size="lg">
                  <Link href={`/labs/${starter.id}`}>Start with {starter.title}</Link>
                </Button>
                {/* Plain text, not a second button. Every value is read off the lab the CTA points
                    at, so it cannot claim 45 minutes for a 60-minute lab. */}
                <p className="text-xs text-[var(--wb-text-secondary)]">
                  Easiest lab · {starter.estimatedMinutes} min · no account needed
                </p>
              </div>
            )}
          </header>

          <CaseLabGallery labs={labs} />

          {/* Everything below is explanation and ranking surface. It is deliberately after the
              catalog: a visitor who already knows what a case lab is never scrolls past it again. */}
          <div className="flex flex-col gap-10 border-t border-[var(--wb-border)] pt-10">
            <MilestoneStrip />
            <CaseLabsExplainer />
            <CaseLabsFaq />
            <CaseLabNextSteps />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
