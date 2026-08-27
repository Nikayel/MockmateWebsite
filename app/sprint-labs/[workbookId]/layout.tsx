import type { Metadata } from "next"
import type { ReactNode } from "react"
import { notFound } from "next/navigation"

import { BreadcrumbJsonLd, CourseJsonLd } from "@/components/seo/JsonLd"
import { getFlagAsync } from "@/lib/feature-flags"
import { getWorkbookSummary, workbookIds } from "@/lib/sprint-labs/content/registry"
import { canonicalPageMetadata } from "@/lib/seo/page-metadata"

type Props = { params: Promise<{ workbookId: string }> }

/**
 * The public/secret content registry (lib/sprint-labs/content/registry.ts) is the complete,
 * compile-time list of valid workbook ids, so it is also the complete list of URLs this segment may
 * answer. Mirrors `app/labs/[labId]/layout.tsx`'s `dynamicParams = false` precedent: every other
 * `/sprint-labs/<anything>` is a routing-layer 404 before metadata or the page component runs. The
 * `sbx` catalog placeholder (components/sprint-labs/catalog/sbx-placeholder.ts) is deliberately NOT
 * in this list — it is not compiled content and has no page.
 */
export function generateStaticParams() {
  return workbookIds().map((workbookId) => ({ workbookId }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Mirror the layout's flag gate below: with the flag off this segment 404s, so its <head> must not
  // advertise a workbook title/pitch either. Falls back to the same non-indexable head as an unknown
  // id, keeping flag-off invisibility total (metadata included).
  const enabled = await getFlagAsync("SPRINT_LABS_ENABLED")
  if (!enabled) {
    return { title: "Sprint Lab", robots: { index: false, follow: false } }
  }

  const { workbookId } = await params
  const summary = getWorkbookSummary(workbookId)

  // Unreachable while `dynamicParams` is false; deliberately non-indexable rather than a second
  // copy of the catalog's head, per the `/labs/[labId]` precedent.
  if (!summary) {
    return { title: "Sprint Lab", robots: { index: false, follow: false } }
  }

  return canonicalPageMetadata({
    path: `/sprint-labs/${summary.id}`,
    title: `${summary.title}: Sprint Labs Workbook`,
    description: summary.pitch,
  })
}

export default async function SprintLabWorkbookLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ workbookId: string }>
}) {
  // UX-SPEC.md §1.2(b): the flag's authoritative layer is Firestore; this page is static (see
  // page.tsx's `revalidate = 300`), so the owner's flip lands within five minutes here, same as
  // `/labs`. Checked before the id lookup so an unknown id and a flag-off id both 404 the same way.
  const enabled = await getFlagAsync("SPRINT_LABS_ENABLED")
  if (!enabled) notFound()

  const { workbookId } = await params
  const summary = getWorkbookSummary(workbookId)

  // The explicit guard. `dynamicParams = false` already rejects unknown ids at the router, but that
  // is a config flag one refactor away from being lost, and the failure it prevents is silent.
  if (!summary) notFound()

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Labs", url: "/labs" },
          { name: summary.title, url: `/sprint-labs/${summary.id}` },
        ]}
      />
      <CourseJsonLd
        name={summary.title}
        description={summary.pitch}
        url={`/sprint-labs/${summary.id}`}
        workloadMinutes={summary.estimatedHours * 60}
        teaches={summary.topics}
      />
      {children}
    </>
  )
}
