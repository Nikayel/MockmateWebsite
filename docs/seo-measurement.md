# SEO measurement plan

Written 2026-08-16, establishing this export as the baseline per the SEO brief's Measurement plan
section. The site has almost no history to compare against (see `docs/seo-visibility-event.md`), so
this document exists to make later claims falsifiable: what we track, how each number is pulled, and
three baselines that must never be blended into one.

## What we track

**Clicks and impressions, total and non-brand.** Total comes from the GSC Performance report,
`sc-domain:codesparring.dev`. Non-brand is the query dimension filtered to exclude anything
containing "codesparring." As of this writing that filter removes nothing: SEO-29 found zero branded
queries in the 28-day query table, so total and non-brand are currently the same number. Re-check
monthly. Brand queries appearing at all is itself a signal worth noticing, not just a metric to
subtract.

**Clicks and impressions by cluster: learning, blog, lab, commercial.** Split by URL prefix:
`/learn/*` (learning), `/blog/*` (blog), `/labs` and its children (lab), and the marketing, landing,
and comparison pages (`/`, `/pricing`, `/ai-coding-interview-practice`, `/free-ai-coding-interview`,
`/system-design-interview-practice`, `/codesparring-vs-*`, `/why-codesparring`, `/interview`, and
siblings) as commercial. Pull with the GSC `page` dimension and bucket by prefix. GSC has no
first-class cluster field.

**Position buckets (1-3, 4-10, 11-20, 21+) and CTR within each bucket.** Pull the query or page
dimension with position, bucket, then compute CTR per bucket rather than site-wide. Site-wide CTR is
explicitly not the target here (`seofixesbacklog.md`, "Not doing, on purpose"): it stays under 1% by
construction while average position sits in the 20s, and a bucketed CTR is what actually shows
whether a page that reaches page one is winning or losing the click once it gets there.

**Page-filtered query sets for priority pages.** The GSC `page` filter, one pull per priority page
from the brief's Priority A/B/C pages and SEO-01 through SEO-23 in the backlog. This is the only
reliable way to attribute a query to a page. The aggregate query table is not joined to pages and
undercounts: 628 of 2,706 impressions in the 28-day brief export, none of the 10 clicked queries
named at all, because Search Console withholds low-volume query and page pairs.

**Sitemap-submitted vs. indexed.** Two different numbers on Google's side that lag each other by
design. Submitted count comes from the GSC Sitemaps report: 549 as of 2026-08-16. That same report's
own "indexed" field read 0 on this pull, a known lagging counter on Google's side, not a literal
zero: 120 pages earned an impression in the last 28 days, which requires being indexed. Use the Page
Indexing report in the GSC UI for the reliable aggregate, and single-URL inspection for spot checks.
A live check for this document confirmed `/labs` and `sd-l5-leader-election-fencing` as "Submitted
and indexed," while `sd-l4-rate-limit-algorithms` (the SEO-31 `scaling-compute` case) is still "URL
is unknown to Google," matching SEO-31's finding two days later. See `docs/seo-visibility-event.md`
for the full spot check.

**Funnel: organic landing view, CTA click, practice start, signup, completion.** Partially
instrumented. `trackSessionStart`, `trackSessionComplete`, and `trackSignup` exist and fire today
(`lib/analytics.ts`, Firebase Analytics and GA4, gated on cookie consent, see
`lib/__tests__/analytics-consent-gate.test.ts`). There is no landing-view event that distinguishes an
organic-search entry, and no CTA-click event for the contextual learning-to-practice links this SEO
ship is adding to lessons. Until those two steps exist, the funnel can only be approximated by
joining GSC's page-level clicks against `session_start` volume on the same page over the same window,
which is directional, not exact. SEO-33 (the Google Analytics property is unset) also blocks the
admin analytics panel from reading any of this back today. Closing SEO-33 is a prerequisite for this
metric being self-serve rather than a manual join.

**Desktop and mobile, separately.** The GSC `device` dimension. Already split in both the brief
baseline and the fresh pull below. Tablet is a third bucket GSC returns, but volume is too small to
read (2 impressions in the fresh pull).

**Core Web Vitals on high-impression templates.** Vercel Speed Insights is wired
(`components/ConsentAnalytics.tsx`), field data gated on the same cookie consent as the rest of
analytics. Read per route in the Vercel dashboard, filtered to the templates actually carrying
impressions: the Data Engineering foundations lessons, the System Design case-studies and
distributed-core lessons, `/blog/*`, and the commercial pages in Priority C. Consent-gated field data
on a low-traffic site will be thin for a while. Treat early CWV reads as directional.

## Cadence

Pull weekly. Judge on rolling 28-day and 90-day windows, never week over week: a week that lands
partly inside the August event and partly outside it will look like a swing that is not real, and
position moves generally take four to eight weeks to settle (`seofixesbacklog.md`, "How to work this
file"). `seofixesbacklog.md`'s monthly log is the ongoing ledger for the headline numbers (clicks,
impressions, average position, top-10 query count). Append to it there rather than duplicating that
table here.

## Baseline: three numbers, three different measurements

These three totals are not the same measurement and must never be diffed against each other or
averaged into one trend line.

| | Brief 28d workbook | Backlog page-dimension baseline | Fresh pull |
| --- | --- | --- | --- |
| Window | 2026-07-17 to 2026-08-13 | 2026-07-16 to 2026-08-12 | 2026-07-19 to 2026-08-15 |
| Captured | brief workbook | 2026-08-13 | 2026-08-16 |
| Dimension | property, Chart sheet | page | property, totals |
| Clicks | 10 | 11 | 13 |
| Impressions | 2,706 | 1,185 | 2,567 |
| CTR | 0.37% | 0.93% | 0.51% |
| Avg. position | about 26.0 | 23.0 | 26.87 |
| Desktop | 2,551 impr / 9 clicks | not split | 2,409 impr / 12 clicks, pos 27.18 |
| Mobile | 153 impr / 1 click | not split | 156 impr / 1 click, pos 22.41 |
| Ranking pages | not reported | 120 | 247 |
| Ranking queries | not reported | 286 | 327 |
| Queries in top 10 | not reported | 25 | 32 |

Why three numbers instead of one: the brief workbook is a point-in-time export with no query-to-page
join (its Queries sheet holds only 628 of the 2,706 impressions and none of the 10 clicked queries).
The backlog baseline is a page-dimension pull, a different aggregation path in the Search Console API
that returns different totals even over an overlapping window, by design, not error. The fresh pull
is the property-level total for a similar window, run live for this document. Its own page-dimension
and query-dimension pulls (behind the 247, 327, and 32 figures) returned 13 clicks, 2,614
impressions, and position 23.05, again different from the 2,567-impression, 26.87-position
property-level total in the row above: the same Chart-sheet-versus-Pages-sheet gap the brief's
workbook documents, reproduced live. The jump in ranking pages and queries between the backlog
baseline (120 pages, 286 queries) and the fresh pull (247 pages, 327 queries) is mostly the surge
itself: the newly discovered corpus earning one or two impressions each across many more distinct
URLs, not a change in method. Read each column against its own window and its own future re-pull.
The comparison across columns in one row is for orientation only.

Fresh pull method, for the record: `sc-domain:codesparring.dev`, `gsc_search_analytics`, 2026-07-19
to 2026-08-15. A same-window pull with `dimensions: ["date"]` reproduced the six daily figures in
`docs/seo-visibility-event.md` exactly, confirming this pull and the one behind that document agree.

## Open item: SEO-34, classic vs. AI-appearance impressions

Search Console shows a "performance in generative AI features" notice on this property, but the
`searchAppearance` dimension returned zero rows on a live pull for this document (2026-07-19 to
2026-08-15). It is not yet exposing data here. Once it does, split the baseline and the monthly log
into classic and AI-appearance impressions so CTR trends stay honest: AI Overview impressions count
as impressions but convert far below a classic blue link, so they will otherwise depress site-wide
CTR without representing a single lost click.
