/**
 * Case Labs gallery — `/labs`. Lists the available labs to browse and launch.
 */

import type { Metadata } from "next"
import { listCaseLabs } from "@/lib/labs/case-labs"
import { CaseLabGallery } from "@/components/labs/CaseLabGallery"

export const metadata: Metadata = {
  title: "Case Labs",
  description:
    "Company-style, end-to-end engineering case labs — scope, design, and build inside a real codebase.",
}

export default function CaseLabsGalleryPage() {
  const labs = listCaseLabs()

  return (
    <main className="mx-auto max-w-5xl p-6">
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
    </main>
  )
}
