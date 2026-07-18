"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"

interface TrackedCtaLinkProps {
  href: string
  location: "seo_landing_hero" | "seo_landing_footer"
  keyword: string
  children: ReactNode
}

/**
 * Client wrapper around next/link for the SEO landing template (a Server
 * Component with no analytics of its own). Renders markup identical to a bare
 * Link; its only job is firing cta_click with the page's primary keyword so
 * the 14 acquisition pages join the funnel.
 */
export function TrackedCtaLink({ href, location, keyword, children }: TrackedCtaLinkProps) {
  return (
    <Link
      href={href}
      onClick={() => trackEvent("cta_click", { location, destination: href, keyword })}
    >
      {children}
    </Link>
  )
}
