/**
 * The canonical site origin — one constant, imported everywhere a URL is emitted.
 *
 * This existed in four independent copies (`app/layout.tsx`, `app/sitemap.ts`,
 * `components/seo/JsonLd.tsx`, `lib/site-url.ts`), which is how the site ended up publishing every
 * `rel=canonical`, every JSON-LD `@id`, and all 82 sitemap URLs against a host that answers with a
 * redirect. Publishing several hundred more Learn URLs against a redirecting host would have
 * multiplied that defect rather than introduced it, so the constant is consolidated first.
 *
 * The apex is canonical. `www` is expected to answer with a 308 to it, configured at the platform
 * level rather than here.
 *
 * `NEXT_PUBLIC_SITE_URL` still wins when set, so preview deployments and local runs describe
 * themselves honestly. Any trailing slash is stripped so callers can always concatenate a
 * leading-slash path without producing a double slash.
 */
const DEFAULT_ORIGIN = "https://codesparring.dev"

function normalizeOrigin(raw: string | undefined): string {
  const candidate = raw?.trim()
  if (!candidate) return DEFAULT_ORIGIN
  return candidate.replace(/\/+$/, "")
}

/** Absolute origin, no trailing slash. e.g. `https://codesparring.dev`. */
export const SITE_ORIGIN = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)

/**
 * Absolute URL for a site-relative path.
 *
 * Accepts paths with or without a leading slash and never emits a double slash, because a canonical
 * tag pointing at `https://codesparring.dev//learn/python` is a distinct URL to a crawler.
 */
export function absoluteUrl(path: string): string {
  if (!path || path === "/") return SITE_ORIGIN
  return `${SITE_ORIGIN}/${path.replace(/^\/+/, "")}`
}
