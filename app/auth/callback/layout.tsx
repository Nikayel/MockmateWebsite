import type { ReactNode } from "react"

import { privateRouteMetadata } from "@/lib/seo/private-route-metadata"

/**
 * Metadata-only layout. `page.tsx` here is `"use client"`, so the route could not declare a head
 * of its own and inherited the root layout's: the homepage's title, the homepage's description, and
 * `index, follow` on a client-side shell. See `lib/seo/private-route-metadata.ts` for why the
 * answer is `noindex` with `follow` left on, and for how that sits with `app/robots.ts`.
 */
export const metadata = privateRouteMetadata({
  title: "Signing You In",
  description:
    "Finishing sign-in. This page hands you back to the app as soon as your provider answers.",
})

export default function AuthCallbackLayout({ children }: { children: ReactNode }) {
  return children
}
