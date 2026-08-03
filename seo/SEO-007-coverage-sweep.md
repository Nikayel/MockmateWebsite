# SEO-007: Coverage sweep at day 7

**Phase:** 3, post deploy
**Owner:** repo owner
**Blocking:** no
**Effort:** about 20 minutes, once

## Why

Coverage is where structural mistakes show up, and they look completely different from "we are not
ranking yet". Ranking takes months. A canonical bug shows up in days, as a bulk category, and is
cheap to fix if you catch it early and expensive if you notice it in November.

## Do this

Search Console, Pages report (Indexing). Look at the **categories**, not the totals, and filter to
`/learn` where possible.

| What you see | What it means | Action |
|---|---|---|
| `Page with redirect` in bulk on /learn | The canonical host is still wrong, or the gate is still redirecting | Recheck [SEO-001](SEO-001-canonical-host.md) and [SEO-002](SEO-002-site-url-env.md). This is the most likely failure. |
| `Excluded by noindex` in bulk on /learn | A noindex leaked onto public pages. Workspace pages are correctly noindexed; lesson pages must not be | Check the lesson route metadata |
| `Duplicate, Google chose different canonical` | Two URLs serve the same lesson | Should be impossible: `findCatalogEntry` validates the level slug and `dynamicParams = false` 404s anything else. If it appears, something regressed |
| `Crawled, currently not indexed`, moderate | Normal for a new corpus of this size. Google crawled it and is deciding | Wait. This is the expected state at day 7 |
| `Crawled, currently not indexed`, nearly all of it, at day 60 | A quality signal problem, not a bug | See the abandon condition in `docs/learn-seo/LAUNCH-BASELINE.md` |
| `Discovered, currently not indexed` | Crawl budget. Google knows the URL but has not fetched it | Usually resolves. The `/learn/all` flat index exists to help here |
| `Soft 404` on /learn | A page is rendering empty or near empty | Check that the teach markdown is in the served HTML |

Also worth one look: the **Sitemaps** report should show the submitted count and the discovered count
converging.

## Done when

You have looked at the categories once, at roughly day 7, and either confirmed nothing is in bulk
where it should not be, or opened a follow up for whatever was.

## What is expected, honestly

At day 7 you should expect: most URLs discovered, many crawled, a minority indexed, and essentially
no clicks. That is a healthy start, not a failure. The 30/60/90 day criteria in
`docs/learn-seo/LAUNCH-BASELINE.md` are what to judge against, and they were written to be
falsifiable rather than flattering.
