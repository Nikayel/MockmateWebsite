/**
 * The canonical head block for a single public page: `rel=canonical` plus the social cards that
 * mirror it.
 *
 * This existed only inside `learn-metadata.ts`, private to the Learn corpus. Every other public
 * route that needed the same three tags either wrote them by hand or, more often, wrote nothing and
 * silently inherited the parent's — which is how `/samples/two-sum-excellent` ended up declaring
 * `/samples` as its canonical while the sitemap submitted it as its own URL. A page that names a
 * different page as canonical is a page Google will not index, so the fix has to be a builder every
 * route can reach, not a fourth hand-written block.
 *
 * Two rules the root layout forces on callers, repeated here because this is now the shared entry
 * point:
 *
 * 1. `app/layout.tsx` sets `title.template = "%s | CodeSparring"`, so `title` must NOT contain the
 *    site name. Passing `"Case Labs | CodeSparring"` renders `Case Labs | CodeSparring | CodeSparring`.
 * 2. The root layout deliberately sets no `alternates.canonical`, so each page must declare its own.
 *
 * `openGraph.url` repeats the canonical on purpose. A scraper that reads only OG tags (Slack,
 * LinkedIn) never sees `rel=canonical`, so letting it inherit the root layout's site URL would
 * attribute every shared link to the homepage.
 */
import type { Metadata } from "next"

import { absoluteUrl } from "./site"

export interface CanonicalPageMetadataArgs {
  /** Site-relative path, with or without a leading slash. Resolved through {@link absoluteUrl}. */
  path: string
  /** The page's own identity, WITHOUT the site name. The root template appends it. */
  title: string
  description: string
  /** `"article"` for corpus content, `"website"` for everything else. Defaults to `"website"`. */
  openGraphType?: "website" | "article"
}

export function canonicalPageMetadata(args: CanonicalPageMetadataArgs): Metadata {
  const url = absoluteUrl(args.path)
  return {
    title: args.title,
    description: args.description,
    alternates: { canonical: url },
    openGraph: {
      type: args.openGraphType ?? "website",
      url,
      title: args.title,
      description: args.description,
    },
    twitter: {
      card: "summary_large_image",
      title: args.title,
      description: args.description,
    },
  }
}
