# SEO measurement guide

Use this guide for repeatable measurement, not as a historical results report.
Manual release and Search Console tasks live in [the SEO runbook](../seo/README.md).

## Collection

Export Search Console data weekly. Evaluate matching rolling 28-day and 90-day
windows, allowing crawl/indexing changes time to settle. Record capture date,
property, search type, filters, aggregation dimension, and complete date window
with each export. Keep exports outside these documentation guides.

Track:

- Total and non-brand clicks/impressions. Define the brand filter explicitly and
  revisit it as branded queries emerge.
- URL clusters: `/learn/*`, `/blog/*`, `/labs*`, and commercial pages.
- Position buckets 1–3, 4–10, 11–20, and 21+, with CTR for each bucket.
- Query sets filtered to each priority page. Aggregate query tables are not a
  query-to-page join and may withhold low-volume data.
- Sitemap-submitted and indexed counts separately. Inspect representative URLs
  and use the Page Indexing report; a lagging sitemap counter is not proof of
  zero indexed pages.
- Desktop and mobile separately, with tablet separate when volume is useful.
- Core Web Vitals for high-impression templates using consent-gated field data.

Do not compare property totals directly with page- or query-dimension totals.
Their aggregation and withholding differ. Compare each series with its own
future pulls, using identical windows and filters. Crawl spikes are not retention
or conversion growth.

## Baselines and decisions

Before a release, capture the current submitted/indexed counts, priority-query
positions, impressions, clicks, and current sitemap size. If the release already
happened, label a later export as a post-release baseline; do not invent a before.

Choose success thresholds and a review/stop condition before evaluating results.
At 30 days check discovery and indexing; at 60 days check priority-page impressions
and ranking movement; at 90 days review clicks and useful downstream practice.
These are review checkpoints, not promises of lift. Use Search Console metrics
alone if consent or missing instrumentation prevents conversion measurement.

When `searchAppearance` exposes useful data, keep classic-search and AI-appearance
series separate. Do not infer AI-specific performance from an empty response.

## Product funnel

Inspect current calls in `lib/analytics.ts` and consumers before treating any
funnel step as instrumented. The target sequence is organic landing → CTA click →
signup/practice start → saved completion. Respect existing consent and research
consent gates; do not initialize additional tracking before consent.

Search Console clicks joined only to aggregate session counts are directional,
not user-level conversion attribution. Confirm landing/source capture and the
analytics property configuration before making organic conversion claims.

Post-feedback recommendations have their own [measurement contract](RECOMMENDATION-ENGINE.md#measurement).
Measure completed practice and returns, not clicks alone.
