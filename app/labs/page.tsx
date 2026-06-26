/**
 * Case Labs gallery — `/labs`. Lists the available labs to browse and launch.
 */

import type { Metadata } from "next"
import { listCaseLabs } from "@/lib/labs/case-labs"
import { CaseLabGallery } from "@/components/labs/CaseLabGallery"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Case Labs",
  description:
    "Company-style, end-to-end engineering case labs — scope, design, and build inside a real codebase.",
}

export default function CaseLabsGalleryPage() {
  const labs = listCaseLabs()

  return (
    <main className="bg-background min-h-screen">
      <Header />
      <div className="container mx-auto max-w-5xl px-4 pt-24 pb-16 sm:pt-28">
        <header className="mb-6 flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">Case Labs</h1>
          <p className="text-muted-foreground text-sm">
            Company-style problems you carry end to end — clarify, decompose, design, then build the
            fix inside a real codebase.
          </p>
        </header>

        {labs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No labs yet — check back soon.</p>
        ) : (
          <CaseLabGallery labs={labs} />
        )}
      </div>
      <Footer />
    </main>
  )
}
