# The August visibility event

Written 2026-08-16. A reader looking at the Search Console chart later will see a spike around
August 9-10 and a decline right after it. This document is the answer to what that was: the cause,
the timeline, and whether it means the site did something wrong.

## What happened

Daily impressions, `sc-domain:codesparring.dev`, GSC Performance report:

| Date | Impressions |
| --- | --- |
| 2026-08-09 | 740 |
| 2026-08-10 | 777 |
| 2026-08-11 | 390 |
| 2026-08-12 | 153 |
| 2026-08-13 | 169 |
| 2026-08-14 | 115 |

Before the event the site averaged about 15 impressions a day with zero clicks (28-day brief
workbook, July 17 to August 7). The first elevated day was August 8 itself, 168 impressions, roughly
11x the prior floor, independently confirmed by a same-property GSC pull run for this document
(2026-08-16, `dimensions: ["date"]`). Impressions then roughly quintupled on August 9, peaked August
10, and by August 14 were most of the way back toward the floor, still above it but well off the
peak.

Read this table as a crawl and discovery surge, not growth. Google found a much larger set of URLs
than it previously knew about, is testing them against the index, and is already receding toward the
pre-event floor while it decides what to keep. Every number above is a proxy for how much of the
newly discovered corpus Google is still willing to show on a given day, not a traffic number. Every
future 28-day or 90-day comparison should treat 2026-08-08 as day one of a new series, not as a data
point inside the old flat one.

## The cause

The event is not one commit. It is the compound of six commits over nine days, each closing a
different gap between "the corpus exists" and "Google can discover, trust, and keep it."

| Date | Commit | What it did |
| --- | --- | --- |
| 2026-08-02 | `b0fd288f` | Ships the allowlist projection (`toPublicLessonPreview`) that makes it safe to publish a lesson's teaching content without also publishing its solutions. The precondition for everything below: before it, the entire Learn tree required auth and had no public HTML to crawl. |
| 2026-08-02 | `4398ed6c` | Splits the lesson route in two. `/learn/{track}/{levelSlug}/{lessonId}` becomes a statically generated public article (`dynamicParams: false`); the interactive player moves to `.../workspace`, noindexed. This is the bulk publication itself, across Python, SQL (renamed Data Engineering the same day), and System Design. |
| 2026-08-02 | `f6b0cb96` | Consolidates the site origin into one constant, moves `robots.txt` to `app/robots.ts`, and rewrites the sitemap to derive its Learn section from the course catalog at build time instead of a hand-written list. This is what puts the newly public lesson corpus into the sitemap at all. |
| 2026-08-06 | `bf0553de` | Flips the canonical host from the apex domain to `www`, the host production actually serves. Before this, every `rel=canonical`, every JSON-LD `@id`, and all 537 sitemap URLs resolved to a host that answers with a redirect, so the sitemap advertised URLs that bounce and the page a crawler did reach named the bouncing URL as canonical. |
| 2026-08-07 | `9b9421d7` | Fixes identity bugs that block indexing outright, not just rank it lower. The three `/samples` children inherited a different page's canonical from their shared layout. `/labs/[labId]` and `/interview` are client components that exported no metadata at all, so `/interview`, the single most internally linked URL on the site at 27 inbound links, was being indexed under a title byte-identical to the homepage. The homepage itself had no title or description of its own, inheriting generic copy that truncates in the SERP. `/knowledge` and `/metrics` are newly noindexed. |
| 2026-08-10 | `1cc368cb` | The commit named as the cause. Stops every non-blog sitemap entry from carrying `new Date()` as `lastModified`. |

The mechanism, from `app/sitemap.ts`'s header comment and `1cc368cb`'s own commit message: every
static entry used to carry the build timestamp, which asserts the entire site changed on every
deploy. At the moment this shipped, Search Console held 533 of the sitemap's 545 URLs in "Discovered,
currently not indexed," and a `lastmod` that is provably false on every recrawl is exactly the signal
that teaches a crawler to stop trusting the sitemap. Blog posts keep the field, because their
front-matter date is authored and true. Every other entry, Learn included (which already followed
this rule before the fix), now omits it. An absent `lastmod` is a legal, well-understood sitemap and
is strictly better than a wrong one. `sitemap.test.ts` pins the rule: no entry outside `/blog/` may
carry `lastModified`.

One timing detail is worth recording rather than smoothing over. The GSC daily series shows the
surge already under way on August 9, 740 impressions, a full day before `1cc368cb` deployed (August
10, 09:00 Pacific). A same-day lastmod fix cannot have caused a crawl surge that predates its own
deploy. The more defensible read: the August 2 to August 7 commits are what first put a large, newly
public, correctly self-identifying corpus in front of Google, and crawl intensification following a
change of that size typically shows up in Search Console with a one to three day lag, which places
the August 8 to August 9 ramp right where that lag predicts. `1cc368cb` then lands into an already
accelerating crawl and does exactly the job its commit message describes: stop the sitemap from
teaching Google to discount it on the next pass. Whether the August 11 to 14 decline would have been
sharper without it is not something this data can answer. What the data supports is that the event is
the compound of the whole August 2 to August 10 chain, and `1cc368cb` is the one most directly aimed
at the specific failure this chain produced, 533 of 545 URLs stuck, which none of the earlier fixes
touched.

One same-day commit is not part of the causal chain and is recorded only because it lands on the
event's first elevated day. `c5b2e8e5` (2026-08-08) rewrites the `/learn` and
`/learn/system-design` descriptions and Course JSON-LD to mention the twelve interview-round drills
the course had gained. It is a copy and schema change, not a canonical, robots, or indexability
change, so it is unlikely to be causal. Noted for completeness since `git log` places it inside the
window.

## Sitemap size, before and after

| Point in time | URLs in sitemap |
| --- | --- |
| Before 2026-08-02 | about 82 (hand-listed marketing pages; no Learn URLs, the whole tree was auth-gated) |
| 2026-08-06 (`bf0553de` commit message) | 537 |
| 2026-08-10 (`1cc368cb` commit message) | 545 |
| 2026-08-13/14 (SEO-31 baseline) | 549, of which 457 are lessons |
| 2026-08-16 (GSC Sitemaps report, fresh check) | 549 submitted |

By construction (`app/sitemap.ts`'s design, enforced by `sitemap.test.ts`), the sitemap contains only
canonical, indexable URLs, so the sitemap count is the count of indexable canonical routes: 549
today. That is a very different number from indexed routes. At the moment `1cc368cb` shipped, only
about 12 of the 545 submitted URLs were actually indexed (545 minus the 533 held in "Discovered,
currently not indexed"). A fresh check for this document, GSC Sitemaps report, 2026-08-16, shows 549
submitted and reports 0 indexed on that specific field. Treat that as a known lagging counter on
Google's side, not a literal count: 120 pages have earned at least one impression in the last 28
days, which is not possible for pages absent from the index. `docs/seo-measurement.md` records how
this is tracked going forward, including a spot check below.

## Index quality: level-shaped, not latency-shaped

Of the 549 sitemap URLs (457 lessons), about 120 pages have ever received an impression (backlog
baseline, `seofixesbacklog.md`, captured 2026-08-13). Share of a level's lessons that have ever drawn
an impression, 30 days to 2026-08-13, 205 of 425 lessons overall (SEO-31):

| Level | Surfaced | Level | Surfaced |
| --- | --- | --- | --- |
| system-design/reliability-ops | 16/17 (94%) | system-design/interview-method | 7/15 (47%) |
| system-design/event-driven | 14/15 (93%) | python/applied | 5/14 (36%) |
| system-design/distributed-core | 16/18 (89%) | data-engineering/foundations | 4/11 (36%) |
| system-design/data-storage | 15/17 (88%) | data-engineering/modeling | 2/12 (17%) |
| system-design/specialized-systems | 13/15 (87%) | python/fundamentals | 3/21 (14%) |
| system-design/case-studies | 24/28 (86%) | python/verification | 2/17 (12%) |
| system-design/security-privacy | 13/16 (81%) | python/engineering | 1/10 (10%) |
| system-design/foundations | 16/21 (76%) | data-engineering/advanced-company-sql | 1/14 (7%) |
| system-design/scaling-data | 10/16 (63%) | **system-design/scaling-compute** | **1/14 (7%)** |

If coverage were only a queue-latency effect it would be roughly uniform across same-age content. It
is not: every System Design level except L0, L3, and `scaling-compute` sits at 76% or above, and
`git log --diff-filter=A` shows all twelve System Design level files landed the same day
(2026-07-05), so they have had identical time in the queue. `scaling-compute` is the outlier at 7%,
level with `data-engineering/advanced-company-sql`, a much younger track. SEO-31 in
`seofixesbacklog.md` is the open investigation; it also notes `scaling-compute` is where the
high-demand rate-limiting cluster lives, currently unreachable by search because the pages are not
indexed. Treat Python and Data Engineering's low numbers as ordinary queue latency for younger
tracks. Treat `scaling-compute` as a level-specific defect worth diagnosing on its own.

Spot check for this document, `gsc_inspect_url`, 2026-08-16: `sd-l4-rate-limit-algorithms` (in
`scaling-compute`) returns "URL is unknown to Google," matching SEO-31's finding two days later.
`sd-l5-leader-election-fencing` (the indexed control SEO-31 uses) returns "Submitted and indexed,"
last crawled 2026-08-15. `/labs` also returns "Submitted and indexed," last crawled 2026-08-09.

## Is the impression increase consistent with intended publication?

Yes. The corpus behind this event, Python, Data Engineering, and System Design, more than 425 lesson
pages, was deliberately authored and deliberately published as a public reading corpus on
2026-08-02 (`b0fd288f`, `4398ed6c`), specifically so it could be crawled and indexed. Every commit in
the chain above works toward that same declared goal: put a real, findable, correctly
self-identifying page at every URL Google is offered. None of it is an accidental exposure, a staging
artifact, a test route, or a config error, and the fix named as the proximate cause (`1cc368cb`)
exists specifically to stop Google from discounting a sitemap it should be trusting.

## What we do about it

- Do not roll back `1cc368cb` or any commit in the chain above. The lower aggregate position Search
  Console reports during this window is Google testing thousands of newly discovered long-tail
  pages, not a ranking regression on pages that were already earning clicks.
- Annotate 2026-08-08 as the start of a new series in every future comparison. Comparing a 28-day or
  90-day window that straddles this date against one that does not will read as growth or collapse
  when it is neither. See `docs/seo-measurement.md`.
- Quality now decides what survives, not more publishing. The open question is not how to get more
  URLs discovered, it is which of the 549 already offered Google will keep. SEO-31's level table is
  the leading indicator; `scaling-compute` is the one open defect worth chasing first.
