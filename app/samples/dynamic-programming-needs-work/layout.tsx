import type { ReactNode } from "react"

import { canonicalPageMetadata } from "@/lib/seo/page-metadata"

/**
 * Metadata-only layout. See `app/samples/two-sum-excellent/layout.tsx` for why the canonical has to
 * be declared here and why it cannot live on the page.
 */
export const metadata = canonicalPageMetadata({
  path: "/samples/dynamic-programming-needs-work",
  title: "Longest Increasing Subsequence: C Sample Report",
  description:
    "A dynamic programming mock interview that went wrong, kept intact: the missed subproblem, the brute-force dead end, and the C-grade feedback on both.",
})

export default function DynamicProgrammingSampleLayout({ children }: { children: ReactNode }) {
  return children
}
