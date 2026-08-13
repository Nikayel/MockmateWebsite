# SEO Fixes Backlog

Every SEO fix we know we owe, with the Search Console evidence that justifies it. This is a work
queue, not an essay: pick the top unblocked item, do it, tick the box, record the date.

**Baseline captured 2026-08-13** from `sc-domain:codesparring.dev`, 28-day window 2026-07-16 to
2026-08-12:

| Metric | Value |
| --- | --- |
| Clicks (page dimension) | 11 |
| Impressions (page dimension) | 1,185 |
| Site-wide CTR | 0.93% |
| Average position | 23.0 |
| Ranking pages | 120 |
| Ranking queries | 286 |
| Query-dimension clicks | 0 |

Two facts to read that table with. First, the query table reports 0 clicks against the page table's
11: Google withholds the query on low-volume searches, so every click we have came from a query it
will not name. Do not go looking for the query that converted. Second, an average position of 23
means most impressions happen on page two or three, where click-through is near zero by
construction. The 0.93% CTR is not a conversion problem. It is an arithmetic consequence of where we
rank, and the fix is to move pages up, not to rewrite the funnel.

## How to work this file

- Items are `SEO-NN`, allocated append-only. Never renumber or reuse one.
- Each item carries **Evidence** (the GSC row that proves it), **Do** (the change), and
  **Accept** (how we know it worked). An item without acceptance criteria is not ready to start.
- Re-pull the baseline monthly and append to the log at the bottom rather than editing the table
  above. Position moves take four to eight weeks to settle; judging a fix sooner reads noise.
- Content changes ship as normal lessons and obey the Learn curriculum rules in `CLAUDE.md`. SEO is
  never a reason to loosen the spoiler rule, the closure rule, or the ramp rules.

---

## P0 — Clicks available on rankings we already hold

These do not need new content or new links. We rank; we are not being clicked.

### SEO-01 — The title suffix eats the SERP character budget

**Evidence.** Five pages sit on page one and returned zero clicks over 28 days:

| Page | Impressions | Avg position |
| --- | --- | --- |
| `sd-l10-code-sandbox` | 16 | 6.1 |
| `de-l11-exact-dedup` | 27 | 6.0 |
| `sd-l10-ecommerce-flash-sale` | 21 | 6.9 |
| `sd-l10-ride-sharing` | 17 | 7.8 |
| `sd-l10-payment-ledger` | 16 | 8.6 |

Roughly 97 impressions at an average position near 7, where 2-4% CTR is normal. Expected two to
four clicks; we got zero. `lib/seo/learn-metadata.ts` builds lesson titles as
`${preview.title} · Learn ${COURSE_LABEL}`, and `app/layout.tsx` appends `| CodeSparring`. For
system design that suffix is `· Learn System Design | CodeSparring`, 36 characters of a roughly
60-character display budget, so a lesson whose own title runs past 24 characters gets truncated
before the searcher reads what the page is about.

Verified against production on 2026-08-13. The two best-performing system design pages render:

```
Design a Stock Exchange / Order-Matching Engine · Learn System Design | CodeSparring   (84 chars)
Leader Election, Leases, Fencing & Split-Brain · Learn System Design | CodeSparring    (83 chars)
```

The suffix ` · Learn System Design | CodeSparring` is 37 characters on its own. At a 60-character
display budget the searcher sees neither the brand nor the end of the lesson title.

**Do.** Keep the course label only where it fits. Change `learnLessonMetadata` so the composed title
is measured against a budget and the suffix degrades: full label, then the short brand alone, then
the bare lesson title via `title.absolute`. The root `title.template` still owns the brand, so the
change lives in one function.

**Accept.** A test over the live corpus asserts the rendered title for every Learn lesson is at most
60 characters, and that no title contains the brand twice. Position holds; CTR on the five pages
above moves off zero within six weeks.

### SEO-02 — Lesson descriptions are written for the learner, not the searcher

**Evidence.** `truncateForDescription` cuts `preview.summary` at 155 characters. The summary is
authored to orient someone already inside the course, so the SERP snippet often opens with
curriculum framing rather than the answer the query asked for.

**Do.** For the top 40 pages by impressions, author a dedicated searcher-facing description that
opens with the answer in the first clause. Add an optional `seoDescription` on the lesson preview
that `learnLessonMetadata` prefers when present, falling back to the summary so the other 500 pages
are unaffected.

**Accept.** Top-40 pages have `seoDescription` set. A test asserts every `seoDescription` is between
110 and 155 characters and does not start with "In this lesson" or "This lesson".

**Blocked on SEO-35**, which is the reason the fallback is currently unusable.

### SEO-35 — Lesson summaries are paragraphs in a field documented as one line

**Evidence.** `TutorialLesson.summary` is declared in `lib/tutorials/types.ts` as
`/** One line, for the module list. */`. Measured against the live corpus on 2026-08-13:

| Course | Summaries over 160 chars |
| --- | --- |
| Whole corpus | 216 of 425 |
| System design | 165 of 208 |

The worst offenders are the pages with the most search demand:

| Lesson | Summary length | Search impressions |
| --- | --- | --- |
| `sd-l9-batch-streaming` | 493 | — |
| `sd-l9-iac-progressive-delivery` | 439 | — |
| `sd-l10-code-sandbox` | 422 | 16 at position 6.1 |
| `sd-l10-webhook-delivery` | 414 | 5 at position 14.0 |
| `sd-l10-stock-exchange` | 410 | 55 at position 40.3 |
| `sd-l10-distributed-lock` | 386 | 20 at position 13.0 |

`sd-l9-batch-streaming` in full is a single 493-character sentence chain covering Lambda, Kappa,
watermarks, exactly-once and Flink-into-Iceberg. `truncateForDescription` cuts it at 155 on a word
boundary, so the meta description Google shows is a fragment that stops mid-argument. This also
explains why SEO-02's fallback path cannot simply be left alone: the fallback is the defect.

The damage is not only in the SERP. The module list renders `summary` as a one-line descriptor, so
every one of these 165 lessons is pushing a paragraph through a single-line slot.

`lib/tutorials/__tests__/lesson-content-hygiene.test.ts` already measures this and prints it, but
deliberately does not fail: the test is titled "reports overlong titles and summaries without
blocking the authoring loop". CLAUDE.md says to enforce a convention with a test rather than a
document. This convention is currently enforced by neither.

**Do.** Rewrite the 165 over-length system design summaries to one real sentence under 160
characters, keeping the current text's first clause where it already leads with the point. Then
convert the hygiene reporter into a failing assertion with a grandfathered allow-list of zero, so a
new lesson cannot reintroduce the problem. Partition the rewrite by level file, one agent per file,
since concurrent agents sharing a file clobber each other.

**Accept.** No lesson summary exceeds 160 characters. `lesson-content-hygiene` fails when one does.
The four titles over 60 characters are handled by SEO-01's budget ladder rather than rewritten.

### SEO-03 — Lesson pages publish no FAQ or article structured data

**Evidence.** Verified against production on 2026-08-13. Lesson pages DO emit JSON-LD, but only the
four site-level blocks: `WebSite`, `Organization`, `SoftwareApplication` and `Person`. Every one
describes CodeSparring the product. Nothing describes the lesson. So a page about fencing tokens
tells Google it is a piece of software priced at $25 a month.

That is good news for effort: the plumbing already fires on every page, so this is an addition rather
than a build.

**Do.** Emit `Article` JSON-LD on every lesson page (headline, description, `datePublished`,
`dateModified`, author, canonical `@id`). Where a lesson has an explicit question-and-answer block,
emit `FAQPage` as well. Only mark up content that is actually visible on the page.

**Accept.** Rich Results Test passes for one lesson per course. No "unparsable structured data"
errors appear in Search Console 14 days after deploy.

### SEO-36 — Every page ships a 37-term keywords meta tag

**Evidence.** `app/layout.tsx:81` sets a global `keywords` array, so every page in the site renders
the same 37-term block. On the stock exchange lesson it reads, in part: "LeetCode alternative",
"cheap mock interviews", "interview anxiety practice", "24/7 mock interviews". None of that describes
a page about order-matching engines.

Google has ignored `meta name="keywords"` since 2009, so this is not costing rankings. It is costing
two other things. It is roughly 700 bytes of identical payload on every page, and a stuffed
keyword list is a low-quality signal to the crawlers that do still read it, including the AI crawlers
we deliberately welcome in `app/robots.ts`.

**Do.** Delete the `keywords` array from the root layout. Do not replace it with per-page keywords:
the tag has no consumer worth serving.

**Accept.** No `<meta name="keywords">` in the rendered HTML of any route. Rankings unchanged after
four weeks, which is the expected result and worth recording so the deletion is not blamed for
unrelated movement.

### SEO-04 — Leader election and fencing is our best single striking-distance page

**Evidence.** `sd-l5-leader-election-fencing`, 41 impressions at position 8.2, one click. Highest
impression count of any page in the 4-15 band. Supporting queries: `raft/paxos` at 9,
`distributed state machine` at 32.5 with 6 impressions.

**Do.** Add an answer-first block directly under the H1 that states what a fencing token is and why
leader election alone is not enough, in under 60 words. Add the exact phrases `fencing token` and
`split brain` as section headings. Link out to the 2PC/3PC and distributed-lock lessons with
keyword anchors.

**Accept.** Average position for the page improves to 5 or better over eight weeks.

### SEO-05 — The LeetCode-forgetting post is 66 impressions of wasted page-two ranking

**Evidence.** `blog/why-you-forget-leetcode-problems`, 66 impressions at position 14.8, zero clicks.
Second-highest impression count on the site. Position 14.8 is the top of page two, one or two
positions from the fold.

**Do.** Answer-first rewrite of the opening: state the forgetting-curve mechanism in the first
paragraph rather than building to it. Add an H2 that matches the query shape ("Why you forget
LeetCode problems you already solved"). Add internal links from the spaced-repetition surfaces.

**Accept.** Page reaches position 10 or better. First clicks recorded.

### SEO-06 — 2PC vs 3PC ranks at 10.2 on 30 impressions

**Evidence.** `sd-l5-2pc-3pc`, 30 impressions at position 10.2. Queries `2pc 3pc` at 8,
`what is 3pc` at 25, `2pc and 3pc in distributed database` at 14.

**Do.** Add a comparison table (2PC vs 3PC vs consensus) high on the page, since the query intent is
comparative. Title should carry both terms in the first 40 characters.

**Accept.** Position 6 or better; comparison table appears in the snippet.

### SEO-07 — Distributed lock sits at 13.0 on 20 impressions

**Evidence.** `sd-l10-distributed-lock`, 20 impressions at 13.0. Query `distributed lock system
design` at 24.

**Do.** Answer-first block covering the Redlock critique and the fencing-token requirement. Cross-link
to SEO-04's page both directions.

**Accept.** Position 8 or better.

### SEO-08 — Isolation levels ranks 9.9 and is one snippet away

**Evidence.** `sd-l2-isolation-levels`, 10 impressions at 9.9. Adjacent: `sd-l2-mvcc-locking` at 5.0,
`sd-l2-wide-column` at 5.0.

**Do.** Add a definition list of the four isolation levels with the anomaly each one permits, in a
table. Featured-snippet-shaped content: a question heading followed immediately by a table.

**Accept.** Position 5 or better, or a featured snippet in the appearance report.

### SEO-09 — Multi-AZ vs multi-region ranks at 6.8 with no page of its own

**Evidence.** Highest-value gap in the corpus. We rank without a dedicated page:

| Query | Impressions | Position |
| --- | --- | --- |
| `multi az vs multi region` | 6 | 6.8 |
| `multi region vs multi az` | 3 | 15.7 |
| `multi-az architecture` | 1 | 1.0 |
| `multi-az vs multi-region` | 1 | 11.0 |
| `multi region` | 10 | 53.3 |
| `multiregion` | 6 | 64.2 |

**Do.** Build the dedicated comparison page. Google is already choosing us for the comparison intent
from a page that is not about it; a page that is about it should take the top three.

**Accept.** A single URL owns all six query variants; head term `multi region` improves from 53 to
under 25.

---

## P1 — Query clusters with impressions and no page to receive them

Each of these is a set of related queries where we surface deep (position 40+) from an incidental
mention. The pattern is the same every time: real demand, no page addressed to it.

### SEO-10 — SQLite date handling is our largest single cluster

**Evidence.** `sql-l1-dates` is the highest-impression page on the site: 133 impressions at position
33.7, zero clicks. It receives at least five query variants, none of them close to the fold:

| Query | Impressions | Position |
| --- | --- | --- |
| `sqlite date format` | 15 | 45.0 |
| `sqlite dates` | 13 | 46.1 |
| `sqlite date` | 12 | 45.4 |
| `sqlite format date` | 8 | 56.9 |
| `timestamp sqlite` | 5 | 39.8 |
| `sqlite date string comparison iso 8601 text` | 1 | 10.0 |

The last row is the tell. When the query matches what the lesson actually teaches, we rank 10. When
it is the head term, we rank 45.

**Do.** The lesson stays a lesson. Add a separate reference page that answers the head term directly:
SQLite has no date type, dates are TEXT in ISO-8601, and here is the format-string table. Link it to
the lesson as the practice path.

**Accept.** New page ranks top 20 for `sqlite date format` within eight weeks; `sql-l1-dates`
average position improves as the reference page absorbs the informational intent.

### SEO-11 — SLI, SLO, and SLA definitions

**Evidence.** About 25 impressions spread across 15 query variants, every one between position 43
and 86: `sli example` (3 at 73), `sli examples` (2 at 74), `sli definition` (2 at 72.5),
`sla slo sli` (2 at 78), `sli vs slo` (2 at 73.5), `sli and slo` (2 at 68), `sli vs sla` (2 at 64),
`slo vs sla vs sli` (2 at 82.5), `define sli` (2 at 77), plus six more single-impression variants.

**Do.** One concept page owning the three-way distinction, with the definition of each term in its
own sentence under its own heading, plus a worked example carrying real numbers.

**Accept.** Cluster average position under 30; at least one variant in the top 10.

### SEO-12 — The four golden signals

**Evidence.** `4 golden signals` (2 at 58), `four golden signals` (3 at 59), `5 golden signals`
(1 at 44), `golden signals` (2 at 67), `golden signal` (1 at 64), `google sre golden signals latency
traffic errors saturation` (1 at 59). Note we rank position 8 for
`google sre book handling overload load shedding backpressure`, so the SRE corpus already trusts us.

**Do.** Concept page naming all four signals in an ordered list under a question heading, plus the
RED and USE comparison (we hold position 10 for `red vs use` already).

**Accept.** `four golden signals` reaches top 20.

### SEO-13 — Availability nines

**Evidence.** `5 nines availability` (4 at 76), `4 nines` (3 at 66), `6 nines` (3 at 48), `8 nines`
(1 at 47), `five nines availability` (1 at 67), `four nines availability` (1 at 69),
`nines availability` (1 at 67), `availability numbers` (1 at 27).

**Do.** Concept page with the nines-to-downtime table, because the table is the answer and tables win
featured snippets.

**Accept.** Any nines query in the top 10, or a featured snippet.

### SEO-14 — L4 vs L7 load balancing

**Evidence.** About 23 impressions, none above position 57: `l4 vs l7 load balancer` (6 at 57),
`l7 load balancer` (6 at 77), `l4 vs l7 load balancing` (5 at 58.4), `l4-l7 load balancing`
(5 at 63), `l4 l7 load balancer` (1 at 63), `l4 l7 load balancing` (1 at 59), `load balancer l7`
(1 at 60), `l7 networking` (1 at 63), `network l7` (1 at 82).

**Do.** Dedicated comparison page. Comparative query intent, currently answered nowhere on the site
with a page of its own.

**Accept.** Cluster average position under 25.

### SEO-15 — Time-series database design

**Evidence.** `sd-l2-time-series` has 35 impressions at position 62.9 while about 35 more impressions
land on unclaimed variants: `design time series database` (5 at 48.8), `time series database
architecture` (4 at 80.5), `time series database design` (4 at 52.3), `compressed time-series
database` (3 at 59.7), `in memory time series database` (3 at 68.7), `tsdb architecture` (3 at 72.7),
plus twelve more.

**Do.** The existing lesson is ranking for the design intent but not written to it. Expand the lesson
with the storage-engine internals the queries ask for (compression, downsampling, retention,
cardinality), or split a design-focused page from the storage-model lesson.

**Accept.** Page position improves from 62.9 to under 30.

### SEO-16 — Matching engine and stock exchange design

**Evidence.** `sd-l10-stock-exchange` is the highest-impression system design page: 55 impressions at
position 40.3. The cluster is about 38 more impressions: `matching engine stock exchange` (8 at 42),
`matching engine design` (8 at 53.6), `matching engine architecture stock exchange` (8 at 54.5),
`order matching engine` (7 at 46.7), `build a matching engine` (7 at 59.4).

**Do.** The page ranks for the topic but not for the phrase people search. Add `matching engine` to
the title and to a section heading, and lead with the order-book data structure.

**Accept.** Position under 20 for `matching engine design`.

### SEO-17 — Modular monolith

**Evidence.** We hold position 10 for `modular monolith architecture vs microservices` and
`distributed monolith vs modular monolith`, but position 44-60 for the head terms: `modular monolith`
(3 at 44.3), `modular monolith architecture` (2 at 59.5), `modular monolith vs microservices`
(2 at 50.5), `modular monolithic architecture` (2 at 54.5), `modular monolith vs monolith` (2 at 45).

**Do.** Concept page for the head term. The long tail already converts to page one, so the topical
authority exists; only the head-term page is missing.

**Accept.** `modular monolith` under position 25.

### SEO-18 — OAuth, OIDC, and PKCE

**Evidence.** About 10 impressions at positions 54 to 96: `oauth pkce` (66), `oidc pkce` (71),
`oidc vs pkce` (57), `oidc with pkce` (71), `openid pkce` (64), `oauth2 code challenge` (96),
`oidc code challenge` (81), `oauth pcke` (74), `oauth2c` (88), `oidc machine to machine` (54). We do
rank 27 for the full question form.

**Do.** Extend the L8 security lesson with a PKCE flow section, or a dedicated concept page. Positions
in the 80s and 90s mean an incidental mention, not a page.

**Accept.** Any PKCE variant under position 30.

### SEO-19 — LLM serving and model gateways

**Evidence.** `llm serving` (6 at 39.8), `model gateway` (3 at 60.3), `llm gateway architecture`
(1 at 81), `llm inference architecture` (1 at 81), `multi model gateway` (1 at 82). Also
`evals and guardrails` at position 11 on one impression.

**Do.** This overlaps the L11 specialized-systems work in the system design council. Whatever that
audit produces for AI-infrastructure lessons should carry these exact phrases. Coordinate rather
than writing a separate SEO page.

**Accept.** `llm serving` under position 20.

### SEO-20 — Logical clocks

**Evidence.** `lamport clocks` (1 at 40), `lamport logical clock` (1 at 51), `lamport algorithm`
(1 at 61), `lamport clock vs vector clock` (1 at 61), `lamport logical clock diagram` (1 at 43),
`what is lamport logical clock` (1 at 42), `what is a lamport` (1 at 42), `hlc clock` (1 at 49).

**Do.** The `diagram` variant is a signal: build the comparison with an actual diagram (the
`csdiagram` subsystem supports a `ladder` type, which is exactly a Lamport clock message diagram)
and give the image a descriptive filename and alt text.

**Accept.** Any lamport query under position 25; image appears in image search.

### SEO-21 — TLS handshake

**Evidence.** `tls handshake` (2 at 94), `tls diagram` (2 at 66), `tls handshake example` (1 at 79),
`transport layer security handshake` (1 at 85), `https handshake diagram` (1 at 49),
`does udp have a handshake` (1 at 33), `udp handshake` (1 at 43).

**Do.** Low priority as a ranking target (the head term is saturated by Cloudflare and MDN) but the
`diagram` variants are winnable with a real ladder diagram. Treat as an image-search play only.

**Accept.** A handshake diagram indexed in image search.

### SEO-22 — Typeahead and autocomplete

**Evidence.** `sd-l10-typeahead` has 32 impressions at position 24.6. Queries: `system design
typeahead` (22), `search typeahead` (60), `type ahead` (70), `type ahead search` (52),
`type ahead functionality` (62), `what is typeahead` (55).

**Do.** The page is close on the system-design intent and far on the definitional intent. Add a
one-paragraph definition of typeahead near the top so the definitional queries have something to
match.

**Accept.** `what is typeahead` under position 30.

### SEO-23 — Deployment strategies

**Evidence.** `canary deployment strategy` (8 at 66), `canary release strategies` (1 at 48),
`canary deployment vs rolling deployment` (1 at 54), `rolling deployment vs blue green` (1 at 53),
`rolling update vs blue green` (1 at 59). We hold position 4 for `rollout online`.

**Do.** Comparison page covering blue-green, canary, and rolling in one table with the rollback
characteristics of each.

**Accept.** `canary deployment strategy` under position 30.

---

## P1 — Internal linking

### SEO-24 — Cross-track related-concepts block

**Evidence.** Lesson pages chain prev and next within a course
(`app/learn/system-design/[levelSlug]/[lessonId]/page.tsx` builds a flat reading nav), but nothing
links across tracks. The data engineering, Python, SQL, and system design corpora share dozens of
concepts and none of them link to each other.

**Do.** A curated related-concepts block per lesson with keyword-carrying anchor text. Curated, not
computed: an algorithmic "related" block produces generic anchors and dilutes the signal. Store the
mapping in one module so it can be tested for dangling ids.

**Accept.** A test asserts every related-lesson id resolves and no lesson links to itself. Median
internal inbound links per lesson rises above 3.

### SEO-25 — Concept hub pages

**Evidence.** Items SEO-11 through SEO-14, SEO-17 and SEO-23 each want a page that is a concept
reference rather than a graded lesson. There is no route shape for that today.

**Do.** Establish the pattern once: a concepts route with its own metadata builder, breadcrumb,
sitemap entry, and a link block back into the lessons that practise the concept. Then the individual
concept items become content work rather than plumbing work.

**Accept.** Route exists, one concept page ships through it, sitemap includes it, canonical resolves.

### SEO-26 — Verify breadcrumb structured data covers Learn

**Evidence.** `components/seo/LandingPageBreadcrumb.tsx` exists for landing pages. Unverified whether
Learn pages emit `BreadcrumbList`.

**Do.** Check; if absent, emit it from the shared Learn metadata path so all three courses get it at
once.

**Accept.** Breadcrumbs appear in the Search Console enhancement report for Learn URLs.

---

## P2 — Off-site, brand, and demand capture

### SEO-27 — The competitor comparison page is not competitive

**Evidence.** `codesparring-vs-hellointerview` has 18 impressions at position 30.6 on www plus 4 more
at 39.3 on the apex, zero clicks. Competitor brand queries we surface for: `hello interview` (2 at
46), `hellointerview` (2 at 22), `hello interview mock interview` (1 at 42), `hello interview code`
(1 at 36), `interviewing io pricing` (1 at 53).

**Do.** Comparison pages rank on specificity, so the page needs a real feature-by-feature table with
prices and dates, and it must be accurate. Claims live in `lib/pricing-comparison.ts` per the
existing pricing work; keep them there.

**Accept.** `hellointerview` under position 15; first clicks on the comparison page.

### SEO-28 — We have no link acquisition motion

**Evidence.** Nothing in the corpus generates links today. Position 1 for
`aws builders library timeouts retries backoff jitter` and for `little's law concurrency` shows the
technical depth is competitive; the domain authority is not.

**Do.** Pick the two or three assets most likely to be cited (the nines table, the isolation-level
anomaly table, the matching engine order-book walkthrough) and make them citable: stable URL,
descriptive headings, an image worth embedding. Then do the outreach as a separate motion. This item
tracks the on-site half only.

**Accept.** Three citable assets shipped. Referring domains tracked in the monthly log.

### SEO-29 — Brand search volume is effectively zero

**Evidence.** No `codesparring` query appears in the 28-day query table at all. Every impression we
have is unbranded informational demand.

**Do.** Nothing on-site fixes this. Recorded here so that when brand queries start appearing, we
notice, and so nobody proposes a brand-term SEO project.

**Accept.** Track only.

---

## Technical and monitoring

### SEO-30 — Apex and www are both in the index

**Evidence.** Both hosts rank simultaneously: `https://codesparring.dev/` at position 3 with 3 clicks
against `https://www.codesparring.dev/` at position 14.3 with 0. Four other paths appear under both
hosts (`codesparring-vs-hellointerview`, `guides/how-to-talk-through-coding-interviews`,
`interview-prep/figma`, `learn/data-engineering/advanced-company-sql/sql-l5-window-frames-and-qualify`).

**Status.** The redirect is correct. Verified 2026-08-13:
`curl -sI https://codesparring.dev/learn/system-design` returns 308 to the www host, and
`lib/seo/site.ts` pins `https://www.codesparring.dev` as the canonical origin. The apex entries are
legacy index rows that consolidate on re-crawl.

**Do.** Nothing in code. Watch the apex rows disappear from the page report. If they persist past
2026-10, request re-indexing of the apex homepage.

**Accept.** Apex URLs absent from the page dimension.

### SEO-31 — Crawl coverage of the 549-URL sitemap

**Evidence.** The sitemap carries 549 URLs (457 of them lessons) with 0 errors, but only 120 pages
have ever received an impression. Spot-checked URLs return "URL is unknown to Google" despite being
in the sitemap. This is normal queue latency for a young domain, not a defect.

**Do.** Nothing beyond keeping the sitemap accurate and the internal linking dense (see SEO-24).
Re-count indexed pages monthly.

**Accept.** Ranking page count grows month over month.

### SEO-32 — Robots.txt validation on the three blocked pages

**Evidence.** Search Console reports `/login`, `/upgrade`, and `/roadmap` as "Blocked by robots.txt",
validation started 2026-08-10. All three are deliberately in `PRIVATE_PATHS` in `app/robots.ts`.

**Do.** Nothing. The report is describing intended behaviour. Do not remove the Disallow entries to
clear the warning.

**Accept.** Closed as working-as-intended.

### SEO-33 — Google Analytics property is not configured

**Evidence.** `GOOGLE_ANALYTICS_PROPERTY_ID` is unset in `.env.local`, and the admin analytics panel
warns about it. We can see impressions and clicks in Search Console but nothing about what a visitor
does after landing.

**Do.** Set the property id, or decide explicitly that Search Console plus Vercel Web Analytics is
enough and remove the panel's dependence on it.

**Accept.** Either the panel populates, or the warning is gone because the dependency is gone.

### SEO-34 — Generative AI appearances are unmeasured

**Evidence.** Search Console now shows a "performance in generative AI features" notice on this
property. AI Overview impressions count as impressions but convert far below classic blue links, so
they depress site-wide CTR without representing lost clicks.

**Do.** Once the `searchAppearance` dimension exposes the AI surfaces on this property, split the
monthly baseline into classic and AI appearance so the CTR trend stays honest.

**Accept.** Monthly log records the two figures separately.

---

## Not doing, on purpose

- **Keyword-stuffing lesson prose.** Titles and headings may carry the query phrase. The teaching
  text answers to the curriculum rules, never to a keyword target.
- **Thin pages per query variant.** One page per concept, covering its variants. Nine near-duplicate
  pages for nine spellings of "l4 vs l7" is how a corpus gets classified as doorway content.
- **Removing the robots.txt disallows** to clear the Search Console warning (see SEO-32).
- **Chasing site-wide CTR as a target.** It stays under 1% until enough queries reach the top five.
  Average position and top-10 query count are the honest leading indicators.

## Monthly log

| Date | Clicks (28d) | Impressions (28d) | Avg position | Queries in top 10 | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-08-13 | 11 | 1,185 | 23.0 | 25 | Baseline. |
