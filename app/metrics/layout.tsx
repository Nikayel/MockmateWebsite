import type { ReactNode } from "react"

import { privateRouteMetadata } from "@/lib/seo/private-route-metadata"

/**
 * Metadata-only layout. `page.tsx` here is `"use client"`, so the route could not declare a head
 * of its own and inherited the root layout's: the homepage's title, the homepage's description, and
 * `index, follow` on a client-side shell. See `lib/seo/private-route-metadata.ts` for why the
 * answer is `noindex` with `follow` left on, and for how that sits with `app/robots.ts`.
 */
export const metadata = privateRouteMetadata({
  title: "Your Metrics",
  description: "Your practice hours, scores over time, and progress by topic.",
})

export default function MetricsLayout({ children }: { children: ReactNode }) {
  return children
}
