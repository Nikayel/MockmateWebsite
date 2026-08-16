"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"

interface TrackedCtaLinkProps {
  href: string
  /**
   * Where on the site the click happened. `learn_lesson_practice` is the one contextual practice
   * CTA a Learn lesson may carry (see `lib/tutorials/related-concepts.ts`); it reports against the
   * lesson id rather than a keyword, because a lesson has no single primary query.
   */
  location: "seo_landing_hero" | "seo_landing_footer" | "learn_lesson_practice"
  keyword: string
  children: ReactNode
  className?: string
  prefetch?: boolean
}

/**
 * Client wrapper around next/link for the SEO landing template (a Server
 * Component with no analytics of its own). Renders markup identical to a bare
 * Link; its only job is firing cta_click with the page's primary keyword so
 * the 14 acquisition pages join the funnel. Styling rides on the Link itself
 * (className) so the CTA is a single anchor, not a button nested in one.
 */
export function TrackedCtaLink({
  href,
  location,
  keyword,
  children,
  className,
  prefetch,
}: TrackedCtaLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={className}
      onClick={() => trackEvent("cta_click", { location, destination: href, keyword })}
    >
      {children}
    </Link>
  )
}
