/**
 * Case Labs gallery — `/labs`.
 *
 * ## Above the fold
 *
 * An `<h1>`, one line, one button, then a 64px band naming the five milestones. Everything else is
 * below the labs. The page previously opened
 * with two intro paragraphs, a five-card milestone explainer, a round-type essay and three rows of
 * filter chips: about 650 words and roughly two and a half screens before the first lab was on
 * screen, on a page whose only job is to get someone into a lab.
 *
 * ## Order
 *
 *   1. Hero            h1 + one line
 *   2. Primary CTA     one button + one qualifier line
 *   3. Pipeline band   five milestone names, 64px, anchored to section 5
 *   4. Pick a case lab filters + two categorised groups of cards
 *   5. How a lab works the same five milestones in full
 *   5. SEO prose       what a decomposition interview is / who interviews this way
 *   6. Common questions FAQ disclosure
 *   7. Where to practice next
 *
 * The milestone SECTION stays below the cards, where it answers a question the visitor now has
 * rather than raising one they did not. Only its five names come up into the hero, as a band.
 * Moving the whole section instead lands the first lab card around 757px, which clears a 900px
 * viewport by nothing and fails an 800px one: that is the 1733px regression this page was rebuilt
 * to fix, starting over with better intentions. The band costs about 24px net.
 *
 * Nothing was cut to make room: the explanatory copy is all still here, still Server Components in
 * the initial HTML, and it tiles instead of stacking.
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
import { MilestonePipelineBand } from "./_components/MilestonePipelineBand"
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
              {/* One line, and the same 760px measure as the h1 so the hero reads as one aligned
                  block. It used to be 27 words over two lines, 165px of a 390x844 first screen, and
                  its second half listed the process. The band below shows the process better, so
                  that half is gone; both entity terms, which are the page's highest-intent query
                  words, stay. */}
              <p className="max-w-[760px] text-sm leading-relaxed text-[var(--wb-text-secondary)] sm:text-base">
                The round Palantir FDSE and Stripe engineering interviews actually run.
              </p>
            </div>
            {starter && (
              <div className="flex flex-col items-start gap-2">
                {/* The page's one large accent element. Bound to `--wb-accent-fill`/`--wb-accent-on`
                    rather than the global `bg-primary`, which renders cream in dark and was the
                    loudest off-system thing on an otherwise fully tokenised page. h-11 because 40px
                    is under the touch-target floor, on the primary action. */}
                <Button
                  asChild
                  size="lg"
                  className="h-11 bg-[var(--wb-accent-fill)] text-[var(--wb-accent-on)] hover:bg-[var(--wb-accent-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]"
                >
                  <Link href={`/labs/${starter.id}`}>Start with {starter.title}</Link>
                </Button>
                {/* Plain text, not a second button. Every value is read off the lab the CTA points
                    at, so it cannot claim 45 minutes for a 60-minute lab. */}
                <p className="text-xs text-[var(--wb-text-secondary)]">
                  Easiest lab · {starter.estimatedMinutes} min · no account needed
                </p>
              </div>
            )}
            <MilestonePipelineBand />
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
