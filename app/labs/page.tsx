/**
 * Case Labs gallery — `/labs`. Lists the available labs to browse and launch.
 */

import { listCaseLabs } from "@/lib/labs/case-labs"
import { CaseLabGallery } from "@/components/labs/CaseLabGallery"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { canonicalPageMetadata } from "@/lib/seo/page-metadata"

// The canonical is new: this page is now submitted in `app/sitemap.ts`, and a submitted URL that
// declares no canonical of its own is the defect this SEO pass exists to close.
export const metadata = canonicalPageMetadata({
  path: "/labs",
  title: "Case Labs",
  description:
    "Company-style, end-to-end engineering case labs — scope, design, and build inside a real codebase.",
})

export default function CaseLabsGalleryPage() {
  const labs = listCaseLabs()

  // The global nav stays outside the workbook scope (keeps the app's dark
  // chrome); CaseLabGallery owns the light-by-default themed surface + heading.
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <CaseLabGallery labs={labs} />
      </main>
      <Footer />
    </>
  )
}
