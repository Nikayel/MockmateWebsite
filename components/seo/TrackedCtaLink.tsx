"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"

interface TrackedCtaLinkProps {
  href: string
  location: "seo_landing_hero" | "seo_landing_footer"
  keyword: string
  children: ReactNode
  className?: string
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
}: TrackedCtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackEvent("cta_click", { location, destination: href, keyword })}
    >
      {children}
    </Link>
  )
}
