/**
 * robots.txt, generated.
 *
 * This replaced a static `public/robots.txt`, which had to be deleted: a file in `public/` shadows
 * the route of the same name, so a dynamic robots route sitting beside it would never have been
 * served. Generating it means the `Sitemap:` line and the app share one origin constant, which is
 * the whole point. The static file advertised a sitemap URL on a host that answers with a redirect.
 *
 * ## Three corrections carried over from the static file
 *
 * 1. **The `Allow:` block was dead weight.** It listed `/pricing`, `/docs`, `/blog` and friends under
 *    a group that already says `Allow: /`. A robots.txt allow rule does not "boost" anything; it only
 *    exists to carve an exception out of a broader `Disallow`, and there was no such `Disallow`.
 *
 * 2. **The per-crawler groups silently un-blocked private routes.** robots.txt has no rule
 *    inheritance: the most specific matching group REPLACES the `*` group outright. The old file gave
 *    each AI crawler a four-line disallow list while `*` had thirteen, which meant `GPTBot` was free
 *    to crawl `/practice`, `/sessions`, `/upgrade`, `/profile`, and `/login`. Every group here shares
 *    {@link PRIVATE_PATHS}, so that class of drift cannot recur.
 *
 * 3. **`Claude-Web` and `Anthropic-AI` are retired tokens.** Anthropic's published crawler
 *    documentation now names exactly three: `ClaudeBot` (training), `Claude-User` (fetches a page
 *    when someone asks Claude about it), and `Claude-SearchBot` (search indexing). Checked
 *    2026-08-02 against support.claude.com article 8896518. `GPTBot` and `Google-Extended` were
 *    checked the same way and are still current.
 *
 * ## Why `/learn` is fully allowed, workspaces included
 *
 * The lesson workspace at `/learn/{track}/{levelSlug}/{lessonId}/workspace` is the auth-gated,
 * graded surface, and it is tempting to `Disallow` it. That would be a mistake. The workspace already
 * declares `robots: { index: false }` in its page metadata, and a crawler can only read that header
 * if it is permitted to FETCH the page. `Disallow` plus `noindex` on the same path is self-defeating:
 * the crawler never sees the noindex, and the URL stays eligible for URL-only indexing off inbound
 * links. Pick one. We pick noindex, so nothing under `/learn` is disallowed here.
 *
 * The public reading pages under `/learn` are the entire point of the corpus and must stay crawlable.
 */
import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/seo/site"

/**
 * Routes with nothing to offer a crawler: authenticated surfaces, the API, and auth entry points.
 *
 * This list is about crawl budget and SERP hygiene, not security. Everything genuinely protected is
 * enforced server-side; a robots.txt entry is a request, and a hostile client ignores it. Keep it in
 * agreement with the proxy's gate, which covers `/admin` plus lesson workspaces.
 *
 * `/roadmap$` uses the end-of-URL anchor so the authenticated `/roadmap` index is excluded while the
 * public `/roadmap/preview` marketing page stays crawlable.
 *
 * `/knowledge` and `/metrics` belong here for a reason worth stating: both redirect signed-out
 * visitors on the client, so what a crawler actually receives is a 200 carrying a loading skeleton
 * under the root layout's title. That is a near-duplicate of the homepage, served from two more
 * URLs, with nothing behind it a searcher could want.
 */
const PRIVATE_PATHS = [
  "/admin",
  "/api/",
  "/account",
  "/dashboard",
  "/profile",
  "/sessions",
  "/practice",
  "/upgrade",
  "/limit-reached",
  "/install",
  "/auth",
  "/login",
  "/roadmap$",
  "/roadmap/new",
  "/knowledge",
  "/metrics",
]

/**
 * AI crawlers we deliberately welcome, named by their current robots.txt tokens.
 *
 * They get their own group only so the posture is explicit and legible, not because the rules
 * differ: a free Python, SQL, and System Design corpus is exactly the content we want an answer
 * engine to be able to read and cite. The rule body is identical to `*` on purpose.
 */
const WELCOMED_AI_CRAWLERS = [
  // OpenAI, training crawler.
  "GPTBot",
  // Anthropic: training, user-initiated fetch, and search indexing.
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  // Google's separate opt-out token for Gemini and Vertex AI training.
  "Google-Extended",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: WELCOMED_AI_CRAWLERS,
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
