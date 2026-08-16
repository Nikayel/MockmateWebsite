#!/usr/bin/env node
/**
 * `pnpm seo:audit` — post-build index-quality gate.
 *
 * Crawls a RUNNING build of the site (`pnpm build && pnpm start`) and fails when the things that
 * decide whether a URL survives in an index have regressed. Brief §11 is the specification; the
 * checks below are its list, one function each.
 *
 * ## Why it crawls a server instead of reading source
 *
 * Every defect this is meant to catch is a property of the HTML a crawler actually receives, not of
 * the TSX that produced it. A `metadata` export can be perfect while the rendered page carries two
 * `<h1>`s because a shared layout also emits one, or while the body is an empty client-side shell
 * because the content moved behind a `useEffect`. Only the served bytes can tell you that, so this
 * script speaks HTTP and does small hand-rolled scanning of the response. There is no new dependency
 * and no headless browser: the point is specifically to see the INITIAL HTML, which is what a
 * crawler indexes on first pass, so running JavaScript would defeat the check.
 *
 * ## Origin mapping
 *
 * The sitemap and every canonical tag are built from `lib/seo/site.ts`, which names the production
 * origin unless `NEXT_PUBLIC_SITE_URL` is set at build time. That is correct and must not change to
 * suit a local audit. So the site origin is READ from the sitemap, and every fetch of a URL on that
 * origin is rewritten to `--base-url` before the request goes out. Canonical correctness is then
 * still judged against the production origin, which is the thing that matters, while the bytes come
 * from localhost. When `NEXT_PUBLIC_SITE_URL` does point at the local server the mapping is the
 * identity function and nothing changes.
 *
 * ## Usage
 *
 *   node scripts/seo-audit.mjs                       # crawl every sitemap URL
 *   node scripts/seo-audit.mjs --sample-lessons=25   # CI: sample lessons, crawl everything else
 *   node scripts/seo-audit.mjs --base-url=http://localhost:3000
 *
 * `--sample-lessons=N` only ever thins `/learn/<track>/<level>/<lesson>` URLs, which are ~90% of the
 * sitemap and share a template. Distinct non-lesson pages are ALWAYS crawled in full: they are the
 * hand-authored ones, so they are where a one-off metadata defect can hide. The sample is a fixed
 * stride, not a random draw, so the same N gives the same URLs on every run and a CI failure is
 * reproducible.
 *
 * Exit codes: 0 clean, 1 one or more checks failed, 2 the audit could not run (server unreachable,
 * sitemap missing or unparseable). Warnings never change the exit code.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/* ------------------------------------------------------------------------------------------------
 * Options
 * ---------------------------------------------------------------------------------------------- */

function parseArgs(argv) {
  const options = {
    baseUrl: "http://localhost:4256",
    sampleLessons: Infinity,
    outDir: "artifacts/seo-audit",
    concurrency: 6,
    linkCap: 500,
    timeoutMs: 30000,
  }
  for (const arg of argv) {
    const [rawKey, ...rest] = arg.split("=")
    const value = rest.join("=")
    switch (rawKey) {
      case "--base-url":
        options.baseUrl = value.replace(/\/+$/, "")
        break
      case "--sample-lessons":
        options.sampleLessons = value === "all" ? Infinity : Number.parseInt(value, 10)
        break
      case "--out":
        options.outDir = value
        break
      case "--concurrency":
        options.concurrency = Number.parseInt(value, 10)
        break
      case "--link-cap":
        options.linkCap = Number.parseInt(value, 10)
        break
      case "--timeout":
        options.timeoutMs = Number.parseInt(value, 10)
        break
      case "--help":
      case "-h":
        console.log(
          [
            "Usage: node scripts/seo-audit.mjs [options]",
            "",
            "  --base-url=<url>        running server to crawl (default http://localhost:4256)",
            "  --sample-lessons=<n>    crawl at most n lesson URLs (default: all)",
            "  --out=<dir>             report directory (default artifacts/seo-audit)",
            "  --concurrency=<n>       parallel requests (default 6)",
            "  --link-cap=<n>          distinct internal link targets to verify (default 500)",
            "  --timeout=<ms>          per-request timeout (default 30000)",
          ].join("\n"),
        )
        process.exit(0)
        break
      case "--":
        // `pnpm seo:audit -- --sample-lessons=25` forwards a bare separator. Ignore it rather than
        // rejecting the invocation people will most naturally type.
        break
      default:
        if (rawKey.startsWith("--")) {
          console.error(`Unknown option: ${rawKey}`)
          process.exit(2)
        }
    }
  }
  if (!Number.isFinite(options.sampleLessons) && options.sampleLessons !== Infinity) {
    options.sampleLessons = Infinity
  }
  return options
}

/* ------------------------------------------------------------------------------------------------
 * Check registry
 *
 * Every failure carries the id of the check that raised it so the report can group by check and a
 * reader can tell "17 pages have no description" from "17 unrelated problems".
 * ---------------------------------------------------------------------------------------------- */

const CHECKS = {
  ROBOTS: "robots.txt is served and advertises the sitemap",
  SITEMAP_STATUS: "sitemap URLs return 200",
  SITEMAP_REDIRECT: "sitemap URLs are not redirects",
  NOINDEX: "sitemap URLs are not noindexed",
  TITLE: "every page has exactly one non-empty title",
  TITLE_DUPLICATE: "no two pages share a title",
  DESCRIPTION: "non-lesson pages have a meta description",
  DESCRIPTION_DUPLICATE: "no two pages share a meta description",
  CANONICAL: "canonical is present, absolute, on-origin, and unambiguous",
  CANONICAL_TARGET: "canonical targets return 200",
  H1: "every page has exactly one H1",
  JSONLD: "every ld+json block parses",
  INTERNAL_LINK: "internal links do not 404",
  THIN_CONTENT: "indexable pages carry their content in the initial HTML",
  IMAGE_DIMENSIONS: "content images declare width and height (warning only)",
  ORPHAN: "sitemap URLs are reachable by an internal link (warning only)",
}

/** Minimum visible characters in a page's main content region before it is called a shell. */
const MIN_MAIN_TEXT_CHARS = 200

/* ------------------------------------------------------------------------------------------------
 * Tiny HTML scanning
 *
 * Deliberately regex-based. The checks below ask structural questions about a handful of tags, not
 * about a DOM, and a parser dependency would buy nothing here while adding one more thing that can
 * drift out of date. Where a regex is genuinely unsafe (counting `<h1>` when the RSC payload
 * embedded in an inline script may contain markup) the fix is to strip scripts first, not to
 * hand-roll a parser.
 * ---------------------------------------------------------------------------------------------- */

/** Remove comments, scripts, styles, noscript and svg. Everything structural is scanned on this. */
function stripNonStructural(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, " ")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg\s*>/gi, " ")
}

/** Value of `name` on a single tag string like `<meta name="x" content="y">`. */
function getAttr(tag, name) {
  const quoted = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag)
  if (quoted) return quoted[2] ?? quoted[3] ?? ""
  const bare = new RegExp(`\\b${name}\\s*=\\s*([^\\s"'>]+)`, "i").exec(tag)
  return bare ? bare[1] : null
}

/** All tags of a void/self-describing element, as raw strings. */
function findTags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? []
}

/**
 * Inner HTML of the first `tagName` element, matched by counting nested opens.
 *
 * Returns null when the element is absent, which callers treat as "fall back to the next candidate
 * region" rather than as a failure: not every page in this app wraps its content in `<main>`.
 */
function extractElement(html, tagName) {
  const open = new RegExp(`<${tagName}\\b[^>]*>`, "gi")
  const first = open.exec(html)
  if (!first) return null
  const start = first.index + first[0].length
  const boundary = new RegExp(`<${tagName}\\b[^>]*>|</${tagName}\\s*>`, "gi")
  boundary.lastIndex = start
  let depth = 1
  let match
  while ((match = boundary.exec(html)) !== null) {
    if (match[0].startsWith("</")) {
      depth -= 1
      if (depth === 0) return html.slice(start, match.index)
    } else {
      depth += 1
    }
  }
  return html.slice(start)
}

const ENTITIES = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&mdash;": "-",
  "&ndash;": "-",
  "&hellip;": "...",
}

function decodeEntities(text) {
  return text
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos|mdash|ndash|hellip|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

/** Visible text of an already-stripped fragment. */
function visibleText(fragment) {
  return decodeEntities(fragment.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * The region a reader would call "the content".
 *
 * `<main>` when the page has one, then `<article>`, then `<body>` with the chrome removed. The
 * fallbacks matter: only some routes in this app render a `<main>`, and treating their absence as
 * "no content" would make the thin-content check fire on every one of them.
 */
function contentRegion(structuralHtml) {
  const main = extractElement(structuralHtml, "main")
  if (main !== null) return { region: main, source: "main" }
  const article = extractElement(structuralHtml, "article")
  if (article !== null) return { region: article, source: "article" }
  const body = extractElement(structuralHtml, "body")
  if (body !== null) {
    const withoutChrome = body
      .replace(/<header\b[^>]*>[\s\S]*?<\/header\s*>/gi, " ")
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav\s*>/gi, " ")
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer\s*>/gi, " ")
    return { region: withoutChrome, source: "body-minus-chrome" }
  }
  return { region: structuralHtml, source: "document" }
}

/* ------------------------------------------------------------------------------------------------
 * HTTP
 * ---------------------------------------------------------------------------------------------- */

function createFetcher(options, siteOrigin) {
  /** Rewrite a site-origin URL onto the server under test; leave anything else alone. */
  const toFetchUrl = (url) =>
    siteOrigin && url.startsWith(siteOrigin) ? options.baseUrl + url.slice(siteOrigin.length) : url

  async function request(url, { method = "GET" } = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs)
    try {
      const response = await fetch(toFetchUrl(url), {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          // Named so a server log makes it obvious who is knocking, and so any UA-conditional
          // behaviour is at least attributable rather than mysterious.
          "user-agent": "codesparring-seo-audit/1.0 (+scripts/seo-audit.mjs)",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      })
      const body = method === "GET" ? await response.text() : ""
      return {
        ok: true,
        status: response.status,
        location: response.headers.get("location"),
        robotsTag: response.headers.get("x-robots-tag"),
        contentType: response.headers.get("content-type") ?? "",
        body,
      }
    } catch (error) {
      return { ok: false, status: 0, error: error?.message ?? String(error), body: "" }
    } finally {
      clearTimeout(timer)
    }
  }

  /** HEAD, falling back to GET where a server refuses HEAD rather than answering it. */
  async function probe(url) {
    const head = await request(url, { method: "HEAD" })
    if (head.ok && head.status !== 405 && head.status !== 501) return head
    return request(url, { method: "GET" })
  }

  return { request, probe, toFetchUrl }
}

/** Run `worker` over `items` with a fixed number of in-flight requests. */
async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

/* ------------------------------------------------------------------------------------------------
 * URL classification and sampling
 * ---------------------------------------------------------------------------------------------- */

/** `/learn/<track>/<level>/<lesson>` — the templated bulk of the sitemap. */
function isLessonUrl(url) {
  let path
  try {
    path = new URL(url).pathname
  } catch {
    return false
  }
  const segments = path.split("/").filter(Boolean)
  return segments[0] === "learn" && segments.length >= 4
}

/**
 * Fixed-stride sample, so `--sample-lessons=25` picks the same 25 URLs every run.
 *
 * A stride spreads the sample across the sitemap's natural ordering (track, then level, then
 * lesson), which a `slice(0, n)` would not: that would spend the whole budget inside the first
 * level of the first track and never see a second template.
 */
function sampleEvenly(items, limit) {
  if (!Number.isFinite(limit) || limit >= items.length || limit <= 0) return items
  const stride = items.length / limit
  const picked = []
  for (let i = 0; i < limit; i += 1) picked.push(items[Math.floor(i * stride)])
  return picked
}

/* ------------------------------------------------------------------------------------------------
 * Page analysis
 * ---------------------------------------------------------------------------------------------- */

function analyzePage(url, response) {
  const html = response.body
  const structural = stripNonStructural(html)

  // JSON-LD is read from the RAW html: its whole point is that it lives inside a script tag, and it
  // is read before any stripping so an unterminated block cannot silently vanish.
  const jsonLd = []
  const ldPattern = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi
  let ldMatch
  while ((ldMatch = ldPattern.exec(html)) !== null) {
    const raw = ldMatch[1].trim()
    try {
      JSON.parse(raw)
      jsonLd.push({ ok: true })
    } catch (error) {
      jsonLd.push({ ok: false, error: error.message, excerpt: raw.slice(0, 160) })
    }
  }

  const titleMatches = [...structural.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)]
  const titles = titleMatches.map((m) => decodeEntities(m[1]).replace(/\s+/g, " ").trim())

  const metaTags = findTags(structural, "meta")
  const descriptions = metaTags
    .filter((tag) => (getAttr(tag, "name") ?? "").toLowerCase() === "description")
    .map((tag) => (getAttr(tag, "content") ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)

  const robotsMeta = metaTags
    .filter((tag) => {
      const name = (getAttr(tag, "name") ?? "").toLowerCase()
      return name === "robots" || name === "googlebot"
    })
    .map((tag) => (getAttr(tag, "content") ?? "").toLowerCase())
  const headerRobots = (response.robotsTag ?? "").toLowerCase()
  const noindex =
    robotsMeta.some((content) => content.includes("noindex")) || headerRobots.includes("noindex")

  const canonicals = findTags(structural, "link")
    .filter((tag) => (getAttr(tag, "rel") ?? "").toLowerCase().split(/\s+/).includes("canonical"))
    .map((tag) => (getAttr(tag, "href") ?? "").trim())
    .filter(Boolean)

  const h1Count = findTags(structural, "h1").length

  const { region, source } = contentRegion(structural)
  const mainText = visibleText(region)

  const images = findTags(region, "img").map((tag) => ({
    src: (getAttr(tag, "src") ?? "").slice(0, 200),
    hasWidth: getAttr(tag, "width") !== null,
    hasHeight: getAttr(tag, "height") !== null,
  }))

  const links = findTags(structural, "a")
    .map((tag) => getAttr(tag, "href"))
    .filter((href) => typeof href === "string" && href.length > 0)

  return {
    url,
    status: response.status,
    titles,
    descriptions,
    canonicals,
    h1Count,
    noindex,
    robotsMeta,
    headerRobots,
    jsonLd,
    mainTextLength: mainText.length,
    mainRegionSource: source,
    images,
    links,
    bytes: html.length,
  }
}

/* ------------------------------------------------------------------------------------------------
 * Report
 * ---------------------------------------------------------------------------------------------- */

function renderMarkdown({ options, siteOrigin, summary, failures, warnings, startedAt, durationMs }) {
  const lines = []
  const groupBy = (entries) => {
    const grouped = new Map()
    for (const entry of entries) {
      if (!grouped.has(entry.check)) grouped.set(entry.check, [])
      grouped.get(entry.check).push(entry)
    }
    return grouped
  }

  lines.push("# SEO audit")
  lines.push("")
  lines.push(`- Run: ${startedAt}`)
  lines.push(`- Base URL crawled: \`${options.baseUrl}\``)
  lines.push(`- Site origin in sitemap: \`${siteOrigin}\``)
  lines.push(
    `- Lesson sampling: ${Number.isFinite(options.sampleLessons) ? `${options.sampleLessons} of ${summary.lessonUrlsTotal}` : `all (${summary.lessonUrlsTotal})`}`,
  )
  lines.push(`- Duration: ${(durationMs / 1000).toFixed(1)}s`)
  lines.push("")
  lines.push(`**Result: ${failures.length === 0 ? "PASS" : "FAIL"}** — ${failures.length} failure(s), ${warnings.length} warning(s).`)
  lines.push("")

  lines.push("## Counts")
  lines.push("")
  lines.push("| Metric | Value |")
  lines.push("| --- | --- |")
  lines.push(`| Sitemap URLs | ${summary.sitemapUrls} |`)
  lines.push(`| Lesson URLs in sitemap | ${summary.lessonUrlsTotal} |`)
  lines.push(`| Non-lesson URLs in sitemap | ${summary.nonLessonUrls} |`)
  lines.push(`| URLs crawled | ${summary.crawled} |`)
  lines.push(
    `| Distinct canonical targets (of which probed separately) | ${summary.canonicalTargets} (${summary.canonicalTargetsProbed}) |`,
  )
  lines.push(`| Distinct internal link targets found | ${summary.internalLinkTargets} |`)
  lines.push(
    `| Internal link targets probed (those not already crawled) | ${summary.internalLinkTargetsChecked}${summary.internalLinkTargetsDropped > 0 ? ` — ${summary.internalLinkTargetsDropped} beyond the ${options.linkCap} cap were skipped` : ""} |`,
  )
  lines.push(`| Pages with JSON-LD | ${summary.pagesWithJsonLd} |`)
  lines.push(`| JSON-LD blocks parsed | ${summary.jsonLdBlocks} |`)
  lines.push("")

  const renderGroup = (title, entries, emptyNote) => {
    lines.push(`## ${title}`)
    lines.push("")
    if (entries.length === 0) {
      lines.push(emptyNote)
      lines.push("")
      return
    }
    for (const [check, group] of groupBy(entries)) {
      lines.push(`### ${check} — ${group.length}`)
      lines.push("")
      lines.push(`_${CHECKS[check] ?? "check"}_`)
      lines.push("")
      for (const entry of group) {
        lines.push(`- \`${entry.url}\` — ${entry.detail}`)
      }
      lines.push("")
    }
  }

  renderGroup("Failures", failures, "None. Every failing check in brief §11 is clean.")
  renderGroup("Warnings", warnings, "None.")

  lines.push("## Checks run")
  lines.push("")
  for (const [id, description] of Object.entries(CHECKS)) {
    const failed = failures.filter((f) => f.check === id).length
    const warned = warnings.filter((w) => w.check === id).length
    const status = failed > 0 ? `FAIL (${failed})` : warned > 0 ? `WARN (${warned})` : "pass"
    lines.push(`- \`${id}\` — ${description}: ${status}`)
  }
  lines.push("")

  return lines.join("\n")
}

/* ------------------------------------------------------------------------------------------------
 * Main
 * ---------------------------------------------------------------------------------------------- */

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const startedAt = new Date().toISOString()
  const startedMs = Date.now()

  const failures = []
  const warnings = []
  const fail = (check, url, detail) => failures.push({ check, url, detail })
  const warn = (check, url, detail) => warnings.push({ check, url, detail })

  // ---- robots.txt -------------------------------------------------------------------------------
  const bootstrap = createFetcher(options, null)
  const robotsResponse = await bootstrap.request(`${options.baseUrl}/robots.txt`)
  if (!robotsResponse.ok) {
    console.error(`Cannot reach ${options.baseUrl} — ${robotsResponse.error}`)
    console.error("Start the built server first:  pnpm build && pnpm start -p 4256")
    process.exit(2)
  }
  if (robotsResponse.status !== 200) {
    fail("ROBOTS", "/robots.txt", `returned ${robotsResponse.status}`)
  }
  const sitemapDirective = /^\s*sitemap:\s*(\S+)\s*$/im.exec(robotsResponse.body)
  if (!sitemapDirective) {
    fail("ROBOTS", "/robots.txt", "no `Sitemap:` directive")
  }

  // ---- sitemap ----------------------------------------------------------------------------------
  const sitemapResponse = await bootstrap.request(`${options.baseUrl}/sitemap.xml`)
  if (!sitemapResponse.ok || sitemapResponse.status !== 200) {
    console.error(`/sitemap.xml returned ${sitemapResponse.status || sitemapResponse.error}`)
    process.exit(2)
  }
  const sitemapUrls = [...sitemapResponse.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) =>
    decodeEntities(m[1]),
  )
  if (sitemapUrls.length === 0) {
    console.error("/sitemap.xml contained no <loc> entries")
    process.exit(2)
  }

  let siteOrigin
  try {
    siteOrigin = new URL(sitemapUrls[0]).origin
  } catch {
    console.error(`First sitemap entry is not an absolute URL: ${sitemapUrls[0]}`)
    process.exit(2)
  }
  const { request, probe } = createFetcher(options, siteOrigin)

  const offOrigin = sitemapUrls.filter((url) => !url.startsWith(`${siteOrigin}/`) && url !== siteOrigin)
  for (const url of offOrigin) fail("SITEMAP_STATUS", url, `not on the sitemap's own origin ${siteOrigin}`)

  const lessonUrls = sitemapUrls.filter(isLessonUrl)
  const otherUrls = sitemapUrls.filter((url) => !isLessonUrl(url))
  const toCrawl = [...otherUrls, ...sampleEvenly(lessonUrls, options.sampleLessons)]

  console.log(
    `Crawling ${toCrawl.length} of ${sitemapUrls.length} sitemap URLs ` +
      `(${otherUrls.length} non-lesson, ${Math.min(lessonUrls.length, options.sampleLessons)} of ${lessonUrls.length} lessons) ` +
      `via ${options.baseUrl}`,
  )

  // ---- crawl ------------------------------------------------------------------------------------
  let completed = 0
  const pages = await mapPool(toCrawl, options.concurrency, async (url) => {
    const response = await request(url)
    completed += 1
    if (completed % 50 === 0) console.log(`  ${completed}/${toCrawl.length}`)
    if (!response.ok) {
      fail("SITEMAP_STATUS", url, `request failed: ${response.error}`)
      return null
    }
    if (response.status >= 300 && response.status < 400) {
      fail("SITEMAP_REDIRECT", url, `${response.status} -> ${response.location ?? "(no Location)"}`)
      return null
    }
    if (response.status !== 200) {
      fail("SITEMAP_STATUS", url, `returned ${response.status}`)
      return null
    }
    if (!response.contentType.includes("html")) {
      // Not a failure on its own; a non-HTML sitemap entry simply has no metadata to check.
      warn("SITEMAP_STATUS", url, `content-type ${response.contentType || "(none)"} — skipped page checks`)
      return null
    }
    return analyzePage(url, response)
  })

  const analyzed = pages.filter(Boolean)

  // ---- per-page checks --------------------------------------------------------------------------
  const titleOwners = new Map()
  const descriptionOwners = new Map()
  const canonicalTargets = new Map()

  for (const page of analyzed) {
    const isLesson = isLessonUrl(page.url)

    if (page.noindex) {
      const reason = page.robotsMeta.find((c) => c.includes("noindex")) ?? page.headerRobots
      fail("NOINDEX", page.url, `in the sitemap but noindexed (robots: "${reason}")`)
    }

    // Title
    if (page.titles.length === 0 || page.titles.every((t) => t.length === 0)) {
      fail("TITLE", page.url, "no non-empty <title>")
    } else if (page.titles.length > 1) {
      fail("TITLE", page.url, `${page.titles.length} <title> elements: ${page.titles.map((t) => JSON.stringify(t)).join(", ")}`)
    } else {
      const title = page.titles[0]
      if (!titleOwners.has(title)) titleOwners.set(title, [])
      titleOwners.get(title).push(page.url)
    }

    // Description
    if (page.descriptions.length === 0) {
      if (!isLesson) fail("DESCRIPTION", page.url, "no meta description")
      else warn("DESCRIPTION", page.url, "no meta description (lesson page)")
    } else {
      const description = page.descriptions[0]
      if (!descriptionOwners.has(description)) descriptionOwners.set(description, [])
      descriptionOwners.get(description).push(page.url)
      if (page.descriptions.length > 1) {
        const distinct = new Set(page.descriptions)
        if (distinct.size > 1) {
          fail("DESCRIPTION", page.url, `${distinct.size} conflicting meta descriptions`)
        }
      }
    }

    // Canonical
    if (page.canonicals.length === 0) {
      fail("CANONICAL", page.url, "no <link rel=canonical>")
    } else {
      const distinct = [...new Set(page.canonicals)]
      if (distinct.length > 1) {
        fail("CANONICAL", page.url, `conflicting canonicals: ${distinct.join(" , ")}`)
      }
      for (const href of distinct) {
        let resolved
        try {
          resolved = new URL(href, page.url).toString()
        } catch {
          fail("CANONICAL", page.url, `unparseable canonical href: ${href}`)
          continue
        }
        if (!/^https?:\/\//i.test(href)) {
          fail("CANONICAL", page.url, `canonical is relative (${href}); it must be absolute`)
        }
        if (new URL(resolved).origin !== siteOrigin) {
          fail("CANONICAL", page.url, `canonical points off-origin: ${resolved}`)
          continue
        }
        if (!canonicalTargets.has(resolved)) canonicalTargets.set(resolved, [])
        canonicalTargets.get(resolved).push(page.url)
      }
    }

    // H1
    if (page.h1Count === 0) fail("H1", page.url, "no <h1>")
    else if (page.h1Count > 1) fail("H1", page.url, `${page.h1Count} <h1> elements`)

    // JSON-LD
    for (const block of page.jsonLd) {
      if (!block.ok) fail("JSONLD", page.url, `ld+json did not parse: ${block.error} — starts: ${block.excerpt}`)
    }

    // Content present in the initial HTML
    if (!page.noindex && page.mainTextLength < MIN_MAIN_TEXT_CHARS) {
      fail(
        "THIN_CONTENT",
        page.url,
        `${page.mainTextLength} visible chars in <${page.mainRegionSource}> (threshold ${MIN_MAIN_TEXT_CHARS}); ` +
          "content is likely client-rendered and absent from the crawlable HTML",
      )
    }

    // Image dimensions (warning only)
    const undimensioned = page.images.filter((img) => !img.hasWidth || !img.hasHeight)
    if (undimensioned.length > 0) {
      warn(
        "IMAGE_DIMENSIONS",
        page.url,
        `${undimensioned.length} content image(s) without width/height: ${undimensioned
          .slice(0, 3)
          .map((img) => img.src || "(no src)")
          .join(", ")}${undimensioned.length > 3 ? ", ..." : ""}`,
      )
    }
  }

  for (const [title, owners] of titleOwners) {
    if (owners.length > 1) {
      fail("TITLE_DUPLICATE", owners[0], `title ${JSON.stringify(title)} is shared by ${owners.length} URLs: ${owners.join(" , ")}`)
    }
  }
  for (const [description, owners] of descriptionOwners) {
    if (owners.length > 1) {
      fail(
        "DESCRIPTION_DUPLICATE",
        owners[0],
        `description ${JSON.stringify(description.slice(0, 80) + (description.length > 80 ? "..." : ""))} is shared by ${owners.length} URLs: ${owners.join(" , ")}`,
      )
    }
  }

  // ---- canonical targets ------------------------------------------------------------------------
  const crawled200 = new Set(analyzed.map((page) => page.url))
  const canonicalToResolve = [...canonicalTargets.keys()].filter((url) => !crawled200.has(url))
  const canonicalResults = await mapPool(canonicalToResolve, options.concurrency, async (url) => ({
    url,
    response: await probe(url),
  }))
  for (const { url, response } of canonicalResults) {
    if (!response.ok) {
      fail("CANONICAL_TARGET", url, `request failed: ${response.error} (referenced by ${canonicalTargets.get(url).join(" , ")})`)
    } else if (response.status !== 200) {
      fail(
        "CANONICAL_TARGET",
        url,
        `canonical target returned ${response.status}${response.location ? ` -> ${response.location}` : ""} ` +
          `(referenced by ${canonicalTargets.get(url).join(" , ")})`,
      )
    }
  }

  // ---- internal links ---------------------------------------------------------------------------
  const linkTargets = new Map()
  for (const page of analyzed) {
    for (const href of page.links) {
      if (/^(mailto:|tel:|javascript:|data:|#)/i.test(href)) continue
      let resolved
      try {
        resolved = new URL(href, page.url)
      } catch {
        continue
      }
      if (resolved.origin !== siteOrigin) continue
      // API routes are not pages: a GET/HEAD against one can legitimately 404 or 405 without any
      // link being broken, so they are outside what this check can honestly assert.
      if (resolved.pathname.startsWith("/api/")) continue
      resolved.hash = ""
      const key = resolved.toString()
      if (!linkTargets.has(key)) linkTargets.set(key, new Set())
      linkTargets.get(key).add(page.url)
    }
  }
  const linkKeys = [...linkTargets.keys()].sort()
  const linkCandidates = linkKeys.filter((url) => !crawled200.has(url))
  const linksToCheck = linkCandidates.slice(0, options.linkCap)
  const linkResults = await mapPool(linksToCheck, options.concurrency, async (url) => ({
    url,
    response: await probe(url),
  }))
  for (const { url, response } of linkResults) {
    if (!response.ok) {
      warn("INTERNAL_LINK", url, `request failed: ${response.error}`)
      continue
    }
    if (response.status === 404 || response.status === 410) {
      const sources = [...linkTargets.get(url)]
      fail(
        "INTERNAL_LINK",
        url,
        `${response.status} — linked from ${sources.length} page(s): ${sources.slice(0, 5).join(" , ")}${sources.length > 5 ? ", ..." : ""}`,
      )
    } else if (response.status >= 500) {
      const sources = [...linkTargets.get(url)]
      fail("INTERNAL_LINK", url, `${response.status} — linked from ${sources.slice(0, 5).join(" , ")}`)
    }
  }

  // ---- orphans (warning only) -------------------------------------------------------------------
  // Only meaningful on a full crawl: with `--sample-lessons` the link graph is a sample of a sample,
  // so most "orphans" would simply be pages whose linking page was never fetched.
  if (!Number.isFinite(options.sampleLessons) || options.sampleLessons >= lessonUrls.length) {
    const linked = new Set(linkKeys.map((url) => url.replace(/\/$/, "")))
    for (const page of analyzed) {
      if (page.url === siteOrigin || page.url === `${siteOrigin}/`) continue
      if (!linked.has(page.url.replace(/\/$/, ""))) {
        warn("ORPHAN", page.url, "in the sitemap but never linked from any crawled page")
      }
    }
  }

  // ---- report -----------------------------------------------------------------------------------
  const summary = {
    sitemapUrls: sitemapUrls.length,
    lessonUrlsTotal: lessonUrls.length,
    nonLessonUrls: otherUrls.length,
    crawled: analyzed.length,
    canonicalTargets: canonicalTargets.size,
    canonicalTargetsProbed: canonicalToResolve.length,
    internalLinkTargets: linkKeys.length,
    internalLinkTargetsChecked: linksToCheck.length,
    internalLinkTargetsDropped: linkCandidates.length - linksToCheck.length,
    pagesWithJsonLd: analyzed.filter((page) => page.jsonLd.length > 0).length,
    jsonLdBlocks: analyzed.reduce((total, page) => total + page.jsonLd.length, 0),
    failures: failures.length,
    warnings: warnings.length,
  }
  const durationMs = Date.now() - startedMs

  // Per-page facts go into the JSON alongside the verdicts. They cost nothing to keep and they are
  // what someone fixing a finding actually needs next: "which pages are within 50 chars of the thin
  // threshold", "what is every title we ship", "which pages carry no JSON-LD". Answering those from
  // the existing crawl beats standing up a second one.
  const pageFacts = analyzed
    .map((page) => ({
      url: page.url,
      title: page.titles[0] ?? null,
      titleLength: page.titles[0]?.length ?? 0,
      description: page.descriptions[0] ?? null,
      descriptionLength: page.descriptions[0]?.length ?? 0,
      canonical: page.canonicals[0] ?? null,
      h1Count: page.h1Count,
      noindex: page.noindex,
      mainTextLength: page.mainTextLength,
      mainRegionSource: page.mainRegionSource,
      jsonLdBlocks: page.jsonLd.length,
      images: page.images.length,
      internalLinks: page.links.length,
      bytes: page.bytes,
    }))
    .sort((a, b) => a.url.localeCompare(b.url))

  const outDir = resolve(REPO_ROOT, options.outDir)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(
    resolve(outDir, "report.json"),
    `${JSON.stringify(
      {
        startedAt,
        durationMs,
        options: {
          ...options,
          sampleLessons: Number.isFinite(options.sampleLessons) ? options.sampleLessons : "all",
        },
        siteOrigin,
        summary,
        failures,
        warnings,
        pages: pageFacts,
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    resolve(outDir, "report.md"),
    renderMarkdown({ options, siteOrigin, summary, failures, warnings, startedAt, durationMs }),
  )

  console.log("")
  for (const [check, description] of Object.entries(CHECKS)) {
    const failed = failures.filter((f) => f.check === check).length
    const warned = warnings.filter((w) => w.check === check).length
    if (failed > 0) console.log(`FAIL  ${check} (${failed}) — ${description}`)
    else if (warned > 0) console.log(`warn  ${check} (${warned}) — ${description}`)
  }
  console.log("")
  console.log(`Report: ${resolve(outDir, "report.md")}`)
  console.log(
    `${failures.length === 0 ? "PASS" : "FAIL"}: ${failures.length} failure(s), ${warnings.length} warning(s) across ${analyzed.length} pages in ${(durationMs / 1000).toFixed(1)}s`,
  )
  process.exit(failures.length === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error("seo-audit crashed:", error)
  process.exit(2)
})
