import type { Metadata } from "next"
import type { ReactNode } from "react"

/**
 * Metadata-only layout for the live interview surface.
 *
 * `/interview` is the most linked URL on the site (the footer and the homepage hero both point at
 * it), it is not in `PRIVATE_PATHS` in `app/robots.ts`, and `page.tsx` is `"use client"` so it could
 * never declare metadata of its own. The result: a crawler indexed the pre-session shell under the
 * root layout's default title, byte-identical to the homepage's, and the two competed for the same
 * query.
 *
 * `index: false` with `follow: true` is the deliberate pair. The page itself is an application
 * surface with nothing to rank, but it links onward to scenarios and Learn, and those links should
 * still carry. A `robots.txt` disallow would be the wrong tool for the same reason it is wrong for
 * lesson workspaces: a blocked crawler never reads the noindex, and the URL stays eligible for
 * URL-only indexing off its inbound links. Pick one; this picks noindex.
 */
export const metadata: Metadata = {
  title: "Interview Session",
  description:
    "Run a live AI-led technical interview: pick a scenario, talk through your approach, and get graded feedback when you finish.",
  robots: { index: false, follow: true },
}

export default function InterviewLayout({ children }: { children: ReactNode }) {
  return children
}
