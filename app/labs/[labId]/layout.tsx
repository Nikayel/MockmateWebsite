import type { Metadata } from "next"
import type { ReactNode } from "react"

import { getCaseLabById } from "@/lib/labs/case-labs"
import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { canonicalPageMetadata } from "@/lib/seo/page-metadata"

type Props = { params: Promise<{ labId: string }> }

/**
 * Metadata-only layout for a Case Lab detail page.
 *
 * These are four real, public, linked URLs, and `page.tsx` is `"use client"`, so they were serving
 * the root layout's default title with no canonical at all — four copies of the homepage's `<title>`
 * as far as a crawler could tell. The lab registry already holds a title, a company, a role, and an
 * authored situation paragraph, so the head can be derived rather than hand-written per lab and
 * cannot drift when a lab is renamed.
 *
 * An unknown `labId` still renders (the page shows its own not-found state), so the fallback below
 * only shapes the head of that state.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { labId } = await params
  const lab = getCaseLabById(labId)

  if (!lab) {
    return canonicalPageMetadata({
      path: `/labs/${labId}`,
      title: "Case Lab",
      description:
        "Company-style, end-to-end engineering case labs: scope, design, and build inside a real codebase.",
    })
  }

  // `company` is a lowercase slug in the registry ("palantir"), but a <title> is prose.
  const company = lab.company.charAt(0).toUpperCase() + lab.company.slice(1)

  return canonicalPageMetadata({
    path: `/labs/${lab.id}`,
    title: `${lab.title}: ${company} ${lab.role} Case Lab`,
    description: truncateForDescription(lab.brief.situation),
  })
}

export default function CaseLabDetailLayout({ children }: { children: ReactNode }) {
  return children
}
