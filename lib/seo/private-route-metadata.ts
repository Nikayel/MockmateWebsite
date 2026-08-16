/**
 * The head block for a signed-in app surface: a real title, and an explicit `noindex`.
 *
 * ## What this fixes
 *
 * Fourteen routes (`/login`, `/upgrade`, `/limit-reached`, `/install`, `/auth/callback`,
 * `/dashboard`, `/account`, `/profile`, `/practice`, `/sessions`, `/roadmap`, `/roadmap/new`,
 * `/knowledge`, `/metrics`) answer a crawler with HTTP 200 and a client-side shell: the auth
 * redirect happens in the browser, so the bytes on the wire are an empty container. Every one of
 * them was a `"use client"` page with no layout, so it could not declare metadata at all and
 * inherited the root layout's head wholesale. Measured 2026-08-16, that meant all fourteen shipped:
 *
 *  - the same 95-character title, byte-identical to the homepage's,
 *  - the same 298-character description,
 *  - no canonical, and
 *  - `index, follow`, because that is Next.js's default when nothing says otherwise.
 *
 * A shell that says "index me" under the homepage's own title is a page competing with the homepage
 * for the homepage's query, on a domain with one homepage.
 *
 * ## Why `index: false, follow: true`, and not a canonical
 *
 * `follow: true` is deliberate, and it is the same pair `app/interview/layout.tsx` picked for the
 * live interview shell. These pages have nothing to rank, but they link onward into Learn and into
 * the product, and those links should still carry.
 *
 * No canonical, also deliberate. A canonical is a hint about which of several URLs holds a piece of
 * content; these hold none. `noindex` is the statement that fits, and pairing the two sends a
 * crawler contradictory instructions ("do not index this" plus "this is the preferred version of
 * itself"). None of these routes is in `app/sitemap.ts`, so nothing is submitting them either.
 *
 * ## The interaction with robots.txt, which is the part worth reading twice
 *
 * All fourteen paths are also `Disallow`ed via `PRIVATE_PATHS` in `app/robots.ts`, and that file
 * argues at length that `Disallow` plus `noindex` on one path is self-defeating: a blocked crawler
 * never fetches the page, so it never reads the `noindex`, and the URL stays eligible for URL-only
 * indexing off its inbound links. That reasoning is correct and it is why `/learn` workspaces rely
 * on `noindex` alone.
 *
 * The `noindex` here is still worth having, for three reasons. It is what a crawler that fetches
 * anyway will read, and several of the AI crawlers `app/robots.ts` deliberately welcomes do. It
 * removes the `index, follow` these pages currently assert, which is the wrong thing to say
 * regardless of who is listening. And it is the precondition for ever lifting a `Disallow`: the
 * Search Console warning on `/login`, `/upgrade` and `/roadmap` (SEO-32) is a standing invitation to
 * do exactly that, and the right order is noindex first, un-disallow second, never the reverse.
 *
 * Do not remove entries from `PRIVATE_PATHS` on the strength of this file. That is a separate,
 * deliberate decision recorded in SEO-32.
 */
import type { Metadata } from "next"

/**
 * The root layout's `title.template`, restated.
 *
 * It has to be restated, and getting this wrong is a live regression rather than a style point.
 * Next.js normalises a plain-string `title` on a segment to `{ absolute, template: null }`, and that
 * null is what its CHILDREN inherit. So a layout that sets `title: "Your Roadmap"` silently strips
 * the brand from every route beneath it: `/roadmap/preview`, a public page in the sitemap, rendered
 * as "Preview Your Interview Roadmap" with no site name the moment `app/roadmap/layout.tsx` existed.
 *
 * Declaring the template here keeps the chain intact for child segments while the segment's own
 * `default` still runs through the root's template, so nothing renders the brand twice.
 *
 * `siteConfig` in `app/layout.tsx` is a module-local const rather than an export, so this cannot
 * import the real one. `lib/seo/learn-metadata.ts` restates the same brand string for the same
 * reason. If the site is ever renamed, grep for "CodeSparring" in `lib/seo/`.
 */
const BRAND_TITLE_TEMPLATE = "%s | CodeSparring"

export interface PrivateRouteMetadataArgs {
  /** The page's own identity, WITHOUT the site name. The root `title.template` appends it. */
  title: string
  /**
   * What the surface is for. Not a ranking asset, since the page is noindexed. It is what a link
   * preview shows when someone pastes the URL into Slack, and it is the one-line description of
   * the route for whoever reads this next.
   */
  description: string
}

export function privateRouteMetadata(args: PrivateRouteMetadataArgs): Metadata {
  return {
    title: { default: args.title, template: BRAND_TITLE_TEMPLATE },
    description: args.description,
    robots: { index: false, follow: true },
  }
}
