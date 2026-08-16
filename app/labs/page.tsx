/**
 * Case Labs gallery — `/labs`.
 *
 * This is the strongest-ranking product page on the site and, until this pass, its thinnest: about
 * 250 words, no `<h2>` at all, and every word of explanation living inside the client component that
 * owns the filter chips. A page that ranks on the strength of its URL and title alone has nothing to
 * hold a position with, so the explanatory copy is now Server Components (`HowCaseLabsWork`,
 * `CaseLabRoundsExplainer`, `CaseLabNextSteps`) that land in the initial HTML, and `CaseLabGallery`
 * shrank to what actually needs to be interactive: the chips and the list they filter.
 *
 * The filters stay `useState` only. Making them URL state would mint an indexable URL per filter
 * combination over a four-lab catalog, which is a doorway-page generator, not navigation.
 */

import Link from "next/link"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { CaseLabGallery } from "@/components/labs/CaseLabGallery"
import { ThemeToggle } from "@/components/ThemeToggle"
import { BreadcrumbJsonLd, LessonListJsonLd } from "@/components/seo/JsonLd"
import { getStarterCaseLab, listCaseLabs } from "@/lib/labs/case-labs"
import type { BrowsableCaseLab } from "@/lib/labs/types"
import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { canonicalPageMetadata } from "@/lib/seo/page-metadata"
import { HowCaseLabsWork } from "./_components/HowCaseLabsWork"
import { CaseLabRoundsExplainer } from "./_components/CaseLabRoundsExplainer"
import { CaseLabNextSteps } from "./_components/CaseLabNextSteps"

/** Long enough to carry the situation, short enough that four of them still scan as a list. */
const SUMMARY_MAX_CHARS = 190

const LAB_COUNT = listCaseLabs().length

export const metadata = canonicalPageMetadata({
  path: "/labs",
  title: "Case Labs: Interview Practice in a Real Codebase",
  description: `Work a company-style engineering problem end to end: clarify, decompose, design, then build inside a real multi-file codebase until the tests pass. ${LAB_COUNT} labs.`,
})

export default function CaseLabsGalleryPage() {
  // The row summary is derived here, on the server, so `truncateForDescription` and the SEO module
  // behind it never reach the browse bundle. `brief.situation` is the authored scene-setting
  // paragraph, which is the closest thing a lab has to a pitch.
  const labs: BrowsableCaseLab[] = listCaseLabs().map((lab) => ({
    ...lab,
    summary: truncateForDescription(lab.brief.situation, SUMMARY_MAX_CHARS),
  }))
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
      {/* The list this page visibly renders, stated as an ItemList so a crawler gets the titles and
          the order without inferring both from link markup. `LessonListJsonLd` is a generic
          ItemList emitter; "Lesson" in its name is where it was first mounted, not a constraint on
          its shape. */}
      <LessonListJsonLd
        name="CodeSparring case labs"
        lessons={labs.map((lab) => ({ title: lab.title, url: `/labs/${lab.id}` }))}
      />
      <main className="case-lab-workbook min-h-screen bg-[var(--wb-page)] text-[var(--wb-text)]">
        <div className="container mx-auto flex max-w-3xl flex-col gap-10 px-4 pt-24 pb-16 sm:pt-28">
          <header className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-[var(--wb-text)] sm:text-3xl">Case Labs</h1>
              <ThemeToggle className="mt-1 shrink-0" />
            </div>
            <p className="text-[var(--wb-text-secondary)]">
              A case lab is one company-style engineering problem you carry end to end. You scope
              it, decompose it, commit to a design, then open a real multi-file codebase and work
              until the tests pass. There is no blank editor and no single function to fill in: the
              build step drops you into an existing project with files you may edit, files you may
              only read, and a test suite you run in the browser.
            </p>
            <p className="text-[var(--wb-text-secondary)]">
              That end-to-end shape is what an onsite round looks like once you are past the phone
              screen, and it is the part a timed algorithm drill cannot rehearse. Today there are{" "}
              {LAB_COUNT} labs, each framed on a real company round. Most also name the rounds of
              that loop they do not cover and where to prepare those, because finishing one lab is
              not the same as being ready for the interview.
            </p>
            {starter && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Button asChild className="self-start">
                  <Link href={`/labs/${starter.id}`}>Start with {starter.title}</Link>
                </Button>
                <span className="text-xs text-[var(--wb-text-secondary)]">
                  <span className="capitalize">{starter.difficulty}</span> ·{" "}
                  {starter.estimatedMinutes} min ·{" "}
                  <span className="capitalize">{starter.buildLanguage}</span>
                </span>
              </div>
            )}
          </header>

          <HowCaseLabsWork />

          <CaseLabRoundsExplainer labs={labs} />

          <CaseLabGallery labs={labs} />

          <CaseLabNextSteps />
        </div>
      </main>
      <Footer />
    </>
  )
}
