import type { ReactNode } from "react"

import { canonicalPageMetadata } from "@/lib/seo/page-metadata"

/**
 * This layout exists only to carry metadata.
 *
 * `app/samples/layout.tsx` declares `canonical: "/samples"`, and metadata inheritance in the App
 * Router is wholesale: a route that declares nothing adopts its parent's canonical verbatim. So this
 * page was submitted to Google in `app/sitemap.ts` under its own URL while telling Google the real
 * page was `/samples` — a self-cancelling pair that guarantees it is never indexed. The canonical
 * below is self-referencing, which is the whole fix.
 *
 * It has to be a layout rather than `export const metadata` on the page because `page.tsx` is
 * `"use client"`, and a client module cannot export metadata.
 */
export const metadata = canonicalPageMetadata({
  path: "/samples/two-sum-excellent",
  title: "Two Sum: A+ Sample Feedback Report",
  description:
    "A graded Two Sum mock interview, start to finish: the hash map solution, the complexity discussion, and the A+ feedback report the AI interviewer produced.",
})

export default function TwoSumSampleLayout({ children }: { children: ReactNode }) {
  return children
}
