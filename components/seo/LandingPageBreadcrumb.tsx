"use client"

import { usePathname } from "next/navigation"

import { BreadcrumbJsonLd } from "@/components/seo/JsonLd"

/**
 * The BreadcrumbList trail for a page rendered through {@link LandingPageTemplate}.
 *
 * ## Why this is a separate client component
 *
 * BreadcrumbList is one of the few schema types Google still renders a rich result for: the trail
 * replaces the raw URL in the result, which is the difference between a searcher seeing
 * `codesparring.dev/new-grad-coding-interview-practice` and seeing
 * `CodeSparring > New Grad Coding Interview Practice`. It was mounted on Learn, blog posts and
 * interview-prep, and on none of the fourteen marketing landing, comparison and guide pages.
 *
 * The trail needs the page's own URL, and `LandingPageTemplate` is handed a title but never a path.
 * Adding a required `path` prop would mean editing all fourteen callers to repeat a string the
 * router already knows, and every future landing page would be one forgotten prop away from a
 * breadcrumb naming the wrong URL. `usePathname` reads it from the one authority that cannot drift.
 *
 * That forces a client component, which costs nothing here: Next renders it on the server, so the
 * `<script type="application/ld+json">` is present in the initial HTML that a crawler receives, and
 * the component ships no interactive behaviour beyond reading the current path.
 *
 * ## Why the trail is two levels
 *
 * `Home > {title}`, even for the `/guides/*` pages. There is no `/guides` index route, and Google
 * validates breadcrumb `item` URLs. A middle "Guides" crumb would point at a 404 and disqualify the
 * whole trail, which is worse than the shorter but honest one. The same two-level shape is what
 * `/interview-prep` and `/roadmap/preview` already publish.
 */
export function LandingPageBreadcrumb({ title }: { title: string }) {
  const pathname = usePathname()

  // Defensive: outside a router context `usePathname` yields null, and a breadcrumb whose leaf is
  // the site root would describe the homepage on every landing page. Emitting nothing is correct.
  if (!pathname || pathname === "/") return null

  return (
    <BreadcrumbJsonLd
      items={[
        { name: "Home", url: "/" },
        { name: title, url: pathname },
      ]}
    />
  )
}
