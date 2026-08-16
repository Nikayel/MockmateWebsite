import type { Metadata } from "next"
import type { ReactNode } from "react"
import { notFound } from "next/navigation"

import { BreadcrumbJsonLd } from "@/components/seo/JsonLd"
import { getCaseLabById, listCaseLabs } from "@/lib/labs/case-labs"
import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { canonicalPageMetadata } from "@/lib/seo/page-metadata"

type Props = { params: Promise<{ labId: string }> }

/**
 * The lab registry is the complete, compile-time list of valid ids, so it is also the complete list
 * of URLs this segment may answer. Declaring them prerenders the four real pages and, paired with
 * `dynamicParams = false`, turns every other `/labs/<anything>` into a routing-layer 404 before
 * metadata or the page component runs.
 */
export function generateStaticParams() {
  return listCaseLabs().map((lab) => ({ labId: lab.id }))
}

/**
 * Any id outside `generateStaticParams` is a 404, not a page.
 *
 * This segment used to answer HTTP 200 for every string on earth: `/labs/nope-lab-probe-xyz`
 * returned a "Lab not found" panel with `index,follow` and a self-referencing canonical, which is
 * the textbook soft 404. Google treats a site that returns 200 for invented URLs as having infinite
 * low-quality pages, and it spends crawl budget proving it.
 */
export const dynamicParams = false

/**
 * Metadata-only layout for a Case Lab detail page.
 *
 * These are four real, public, linked URLs, and `page.tsx` is `"use client"`, so they were serving
 * the root layout's default title with no canonical at all — four copies of the homepage's `<title>`
 * as far as a crawler could tell. The lab registry already holds a title, a company, a role, and an
 * authored situation paragraph, so the head can be derived rather than hand-written per lab and
 * cannot drift when a lab is renamed.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { labId } = await params
  const lab = getCaseLabById(labId)

  // Unreachable while `dynamicParams` is false, and deliberately non-indexable rather than a second
  // copy of the gallery's head: the one thing this must never do again is hand a crawler an
  // indexable, self-canonical head for a lab that does not exist.
  if (!lab) {
    return { title: "Case Lab", robots: { index: false, follow: false } }
  }

  // `company` is a lowercase slug in the registry ("palantir"), but a <title> is prose.
  const company = lab.company.charAt(0).toUpperCase() + lab.company.slice(1)

  return canonicalPageMetadata({
    path: `/labs/${lab.id}`,
    title: `${lab.title}: ${company} ${lab.role} Case Lab`,
    description: truncateForDescription(lab.brief.situation),
  })
}

export default async function CaseLabDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ labId: string }>
}) {
  const { labId } = await params
  const lab = getCaseLabById(labId)

  // The explicit guard, mirroring `app/interview-prep/[company]`. `dynamicParams = false` already
  // rejects unknown ids at the router, but that is a config flag one refactor away from being lost,
  // and the failure it prevents is silent.
  if (!lab) notFound()

  return (
    <>
      {/* Three real levels: the gallery at /labs is an indexable page of its own, so unlike the
          two-level landing-page trail this one can name the middle crumb without pointing at a 404. */}
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Case Labs", url: "/labs" },
          { name: lab.title, url: `/labs/${lab.id}` },
        ]}
      />
      {children}
    </>
  )
}
