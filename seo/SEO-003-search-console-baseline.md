# SEO-003: Record the Search Console baseline before the corpus goes public

**Phase:** 1, pre deploy
**Owner:** repo owner
**Blocking:** yes, and it is a one way door
**Effort:** about 15 minutes

## Why

This is the only ticket in the folder that becomes **impossible** rather than merely late. Search
Console shows you the last 16 months, but once several hundred pages are indexed you can no longer
separate "what this domain did before the Learn corpus" from "what it does after". Without a
before, the whole project is unfalsifiable: you cannot tell a judge, an advisor, or yourself whether
publishing the curriculum did anything.

It matters more than usual here because the honest expectation is modest. This domain has no topical
authority for tutorial queries and will be competing with W3Schools, GeeksforGeeks, Real Python and
ByteByteGo. A small real lift is a good outcome, and you can only see a small lift against a
recorded baseline.

## Do this

1. Open Search Console for the property, Performance report, last 90 days.
2. Fill in the table below and commit this file with the numbers in it.
3. Also record positions for the target queries in
   `docs/learn-seo/LAUNCH-BASELINE.md`, which lists the specific query classes the corpus is aimed
   at. Take them from the Queries tab, or from the URL Inspection tool if a query has no impressions
   yet (record "not ranking" explicitly, that is a real data point).
4. Export the Performance report to CSV and keep it. Search Console's own retention will roll off.

## Baseline table, fill this in

| Metric | Value | Date recorded |
|---|---|---|
| Total impressions, 90d | | |
| Total clicks, 90d | | |
| Average CTR, 90d | | |
| Average position, 90d | | |
| Valid indexed pages | | |
| Crawled, currently not indexed | | |
| Discovered, currently not indexed | | |
| Pages with redirect | | |
| Total sitemap URLs submitted | | |

Record the current sitemap size at the same time, since it is about to jump by an order of magnitude:

```bash
npx tsx -e "import s from './app/sitemap'; console.log('sitemap URLs:', s().length)"
```

## Done when

The table above is filled in, the CSV export is saved somewhere durable, and the query level numbers
are written into `docs/learn-seo/LAUNCH-BASELINE.md`.

## Note on expectations

`docs/learn-seo/LAUNCH-BASELINE.md` also carries the 30/60/90 day success criteria and an explicit
abandon condition. Read it before you record the baseline, so you know which numbers you are going
to be judged against. Setting the abandon condition in advance is the part people skip, and it is
the part that stops a project like this from quietly consuming attention for a year.
