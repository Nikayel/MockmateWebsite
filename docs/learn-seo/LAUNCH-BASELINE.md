# Learn corpus SEO: launch baseline

Written 2026-08-02, before the public Learn gate flipped. Its only purpose is to make this project
falsifiable. Publishing several hundred lesson pages feels like progress whether or not it works, so
the numbers that would distinguish the two cases have to be written down BEFORE the deploy, not
reconstructed afterwards from a dashboard that only keeps sixteen months and only started counting
once the pages existed.

Everything below is a prediction. Come back and mark each one right or wrong.

---

## 1. Honest odds

`codesparring.dev` has no topical authority for tutorial queries. It is a young domain whose existing
content is product marketing and comparison pages. Overnight it acquires roughly 360 lesson pages
across three subjects. Search engines treat exactly that pattern with suspicion, and the incumbents
for these queries are not weak:

| Query family | Who actually ranks today | Realistic verdict for us |
|---|---|---|
| `sql cte tutorial`, `python list comprehension` | GeeksforGeeks, DataCamp, LearnSQL, W3Schools, Atlassian, Metabase, TutorialsPoint | **Cannot win.** Do not try. |
| `design a distributed job scheduler` | HelloInterview, AlgoMaster, GeeksforGeeks, systemdesignhandbook.com, bugfree.ai, Medium reposts | **Cannot win head-on.** HelloInterview in particular is the reference answer for this class. |
| `python gil threads` | SuperFastPython, Real Python, Towards Data Science, Codecademy | **Cannot win.** |
| `sessionization sql inactivity timeout` | Cube.dev blog, DZone, Dataiku docs, randyzwitch.com, scattered Medium posts | **Plausible.** No dominant canonical page; the incumbents are one-off blog posts. |
| `write audit publish freshness null rate gate` | AWS Big Data blog, Bauplan, Monte Carlo, glossary pages | **Plausible.** The ranking pages are vendor marketing, not worked exercises. |
| `scd type 2 merge sql` | Microsoft Learn, SQLServerCentral, MSSQLTips, TowardsDataScience | **Hard but not hopeless**, and only for the SQLite/portable-SQL framing. |

### The hypothesis, stated so it can fail

We do not win "teach me X". We win **"X, asked the way an interviewer asks it"**: long-tail,
interview-framed, nuance-shaped queries where the searcher already knows the concept exists and wants
the trap, the tradeoff, or the exact phrasing to say out loud. Those queries have low volume
individually, thin competition, and high intent. Several hundred pages is a bet on the aggregate of
thousands of such tails, not on any single head term.

If after 90 days the traffic that arrives is dominated by head terms we said we could not win
(meaning it never arrived at all), the hypothesis is wrong and the honest read is that the corpus is
a product asset, not an acquisition channel.

### Twenty real pages, paired with the query each one is actually aimed at

Titles pulled from the live catalog on 2026-08-02. The right-hand column is the search intent the
page is competing for, not a keyword we stuffed anywhere.

| URL | Title | Query it targets | Winnable? |
|---|---|---|---|
| `/learn/sql/advanced-company-sql/sql-l5-sessionization` | Sessionization: Grouping Events with an Inactivity Timeout | `sql sessionization 30 minute gap` | Yes |
| `/learn/sql/advanced-company-sql/sql-l5-data-quality-gates` | Write-Audit-Publish: Freshness, Volume, and Null-Rate Blocking Gates | `write audit publish sql quality gate` | Yes |
| `/learn/sql/advanced-company-sql/sql-l5-join-fan-out-and-skew` | Join Fan-Out and Data Skew: Diagnose, Fix, and Keep Metrics Consistent | `join fan out duplicate rows sql interview` | Yes |
| `/learn/sql/advanced-company-sql/sql-l5-cdc-changelog-apply` | CDC Changelog Apply: MERGE-Shaped Upsert with Deletes and Version Ordering | `apply cdc changelog to a table sql` | Yes |
| `/learn/sql/engineering/sql-l4-scd-type2` | Slowly Changing Dimensions: Type 2 | `scd type 2 sql` | Marginal |
| `/learn/sql/cloud-data-foundations/sql-l6-what-is-a-partition` | What a Partition Is, and Why Pruning Makes a Big Table Cheap | `what is partition pruning data engineering` | Yes |
| `/learn/sql/modeling/sql-l3-cardinality` | Entities, Relationships, and Cardinality | `cardinality database interview` | No |
| `/learn/sql/aggregation/sql-l2-ctes` | CTEs: Readable Multi-Step Queries | `sql cte` | No |
| `/learn/sql/foundations/sql-l1-dates` | Dates and Times in SQLite | `sqlite date functions` | No |
| `/learn/python/engineering/py-l4-concurrency` | Threads, the GIL & concurrent.futures | `python gil interview question` | No |
| `/learn/python/verification/py-l5-properties` | Properties catch what examples miss | `property based testing interview python` | Marginal |
| `/learn/python/applied/py-l3-cli` | Building a CLI: parse and dispatch argv | `python argparse vs typer` | No |
| `/learn/python/intermediate/py-l2-itertools` | itertools: chain, islice, groupby & product | `itertools groupby gotcha` | Marginal |
| `/learn/python/fundamentals/py-l1-recursion` | Recursion: a function that calls itself | `python recursion` | No |
| `/learn/system-design/case-studies/sd-l10-job-scheduler` | Design a Distributed Job Scheduler / Cron | `design distributed job scheduler` | No |
| `/learn/system-design/event-driven/sd-l6-kafka-internals` | Kafka Architecture Internals | `kafka internals system design interview` | Marginal |
| `/learn/system-design/reliability-ops/sd-l7-progressive-delivery-schema` | Progressive Delivery, Feature Flags & Zero-Downtime Schema Changes | `zero downtime schema change interview` | Yes |
| `/learn/system-design/foundations/sd-l1-realtime-comms` | Real-Time Delivery: Short-Poll, Long-Poll, SSE, WebSocket & Webhooks | `sse vs websocket vs long polling interview` | Marginal |
| `/learn/system-design/data-storage/sd-l2-choosing-db-polyglot` | Choosing a Database & Polyglot Persistence | `how to choose a database system design interview` | Marginal |
| `/learn/system-design/interview-method/sd-l0-clarify-scope` | Clarifying a Vague Prompt | `system design interview clarifying questions` | Marginal |

Read the "No" column honestly: it is a third of the sample, and those pages exist for learners who
are already on the site, not for search. That is fine. It is only a problem if we later point at
total page count as if every page were an acquisition asset.

---

## 2. Record this in Search Console BEFORE the gate flips

Do this in one sitting and paste the numbers into section 5. If the deploy has already happened when
you read this, you have lost the "before" and the rest of this document is decoration.

**Property-level, last 90 days, Search results report:**

1. Total impressions, total clicks, average CTR, average position (all queries, all pages).
2. Total valid indexed pages, from the Pages (Coverage) report. Note the counts for
   "Crawled, currently not indexed" and "Discovered, currently not indexed" separately; those two
   are the ones that will move when 360 new URLs arrive.
3. Impressions and clicks filtered to `Page contains /learn`. Expect approximately zero. Record the
   zero anyway.

**Per-query, last 90 days**, for each of the six query families in section 1's table plus the twenty
target queries in the sample: impressions, clicks, average position. Most will have no data. "No
data" is the baseline, and it is what makes a later "position 34" legible as progress.

**Also record, outside Search Console:**

4. `site:codesparring.dev` result count in Google and in Bing. Crude, but it is the only external
   read on indexation you get without waiting for Search Console.
5. The referring-domain count from any backlink tool you have access to. Topical authority is the
   binding constraint here, and if this number does not move, nothing else will either.

---

## 3. Success criteria

Each checkpoint has a number. Missing a number is not automatically failure, but it requires writing
down why before moving the goalposts.

### Day 30

- **Indexation is the whole test at this stage.** At least 60% of submitted Learn URLs are in
  "Indexed" state. Below 40% means the pages are being judged as thin or duplicative and no amount
  of waiting fixes it.
- Any nonzero impressions on `/learn` URLs. Position will be terrible. That is expected.
- Zero Learn URLs in Coverage under "Page with redirect", "Duplicate without user-selected
  canonical", or "Excluded by noindex". Any of those three is a bug in this batch's work, not a
  ranking problem, and should be fixed immediately.

### Day 60

- At least 25 distinct Learn URLs receiving impressions.
- At least 5 Learn URLs with an average position better than 30 for a query in the "Yes" column
  above.
- First organic click to a `/learn` URL. One is enough. Zero at day 60 is a real warning.

### Day 90

- 100+ Learn URLs receiving impressions, and 200+ distinct queries hitting `/learn`.
- At least 10 Learn URLs on page 2 or better (position under 21) for interview-framed long-tail
  queries.
- At least one measurable signup attributable to Learn traffic. Not a conversion rate, just proof the
  path exists.

### Abandon condition

**If at day 90 fewer than 30% of Learn URLs are indexed, or total Learn organic clicks are still in
single digits, stop investing in this channel.** Do not write more lessons "for SEO", do not buy
links, do not rewrite titles a third time. The corpus stays because it is a good product and a good
demo, and acquisition moves to the channels that were already working: the student wedge, campus
competitions, and direct outreach. Sunk-cost pressure will be strongest exactly at this point, which
is why the condition is written now.

---

## 4. Manual post-deploy checklist

Run this the day the gate flips. None of it is automated and none of it is optional.

- [ ] **Confirm the apex/www redirect.** `curl -sI https://www.codesparring.dev/learn` must return
      `308` with a `location` on the apex. This is platform config, not code, so nothing in CI can
      catch a regression.
- [ ] **Fetch the sitemap.** `curl -s https://codesparring.dev/sitemap.xml | head -40` and confirm
      every `<loc>` is on the apex, that `/learn/...` lesson URLs are present, and that no URL ends
      in `/workspace`.
- [ ] **Resubmit the sitemap** in Search Console. Then check back in 48 hours for the "Discovered
      URLs" count, which should jump by roughly the lesson count.
- [ ] **Spot-check three lesson URLs with a live fetch**, one per track, chosen at random from the
      sitemap rather than from memory. For each: it returns `200` while signed out, the HTML contains
      the teaching prose, and the HTML contains **no** reference solution, hint text, test case, or
      model answer. Use `curl -s <url> | grep -ci "referenceSolution\|modelAnswerOutline"` and expect
      `0`. The sealing test proves this for the projection; this proves it for the shipped bytes.
- [ ] **Fetch one workspace URL signed out.** It must redirect to login, and its HTML (if any) must
      carry `noindex`.
- [ ] **Check `robots.txt` in production.** It is generated by `app/robots.ts` now, not served from
      `public/`. Confirm the `Sitemap:` line points at the apex and that nothing under `/learn` is
      disallowed.
- [ ] **Fetch `/llms.txt`.** Confirm it is served (it is a static file in `public/`) and that its
      claims still match the product.
- [ ] **Coverage report sweep**, 7 days after deploy. Specifically look for "Page with redirect" and
      "Excluded by noindex" on `/learn` URLs. Either one appearing in bulk means a canonical or a
      metadata bug, not a ranking problem.
- [ ] **URL Inspection on one lesson page.** Confirm Google's rendered HTML contains the lesson body,
      and that the declared canonical is the public lesson URL rather than the workspace.

---

## 5. Baseline numbers (fill in before deploy)

| Metric | Value | Date recorded |
|---|---|---|
| Total impressions, 90d | | |
| Total clicks, 90d | | |
| Average position, 90d | | |
| Valid indexed pages | | |
| Crawled, currently not indexed | | |
| Discovered, currently not indexed | | |
| Impressions on `/learn` URLs | | |
| `site:codesparring.dev` (Google) | | |
| `site:codesparring.dev` (Bing) | | |
| Referring domains | | |

Per-query baseline (impressions / clicks / average position), one row per target query from
section 1. Copy the table out of Search Console rather than retyping it.

---

## 6. Known content debt that affects this

Reported by `lib/tutorials/__tests__/lesson-content-hygiene.test.ts`, which prints these counts on
every run. Neither is a build failure, both are real SEO cost:

- **183 of 364 lesson summaries exceed 160 characters**, almost all of them in the System Design
  track, where summaries were written as level-index blurbs back when nothing was public. The
  summary feeds the meta description, so these truncate mid-sentence in a SERP. The worst offender is
  493 characters. This is the single highest-leverage copy pass available.
- **18 of 364 titles exceed 60 characters**, concentrated in SQL Levels 5 and 6. Less important than
  the summaries; a truncated title still ranks.

Hand both lists to the authoring loop as a copy task. Do not let it block the deploy: shipping
truncated descriptions beats not shipping.
