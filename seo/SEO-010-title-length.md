# SEO-010: Shorten the lesson titles that truncate in search results

**Phase:** 4, content debt
**Owner:** authoring loop
**Blocking:** no
**Effort:** small, this is a short list

## Why

Lesson titles become the SERP title. Google truncates around 60 characters, and the title template
appends the site name, so the usable budget is smaller than the raw title length suggests.

Measured 2026-08-03: **27 of 425 lesson titles exceed 60 characters.** Small enough to fix in one
sitting. Current list:

```bash
npx tsx -e "
import { listAllCatalogEntries } from './lib/tutorials/course-catalog'
listAllCatalogEntries()
  .filter(e => e.lesson.title.length > 60)
  .sort((a,b) => b.lesson.title.length - a.lesson.title.length)
  .forEach(e => console.log(String(e.lesson.title.length).padStart(3), e.courseId + '/' + e.lesson.id, '|', e.lesson.title))
"
```

Known worst as of 2026-08-03, both at 80 characters:
`sql-l5-system-design-round-reasoning` and `sql-l5-medallion-streaming-capstone`.

## Do this

1. Target **under 60 characters**.
2. Front load the distinctive words. Titles are truncated from the right, so the part most likely to
   match a searcher's query should come first.
3. Keep them query shaped where it is honest to do so. The corpus already does this well in places:
   "NULLs and Three-Valued Logic", "Timeouts, Retries, Backoff and Jitter",
   "Latency Numbers Every Engineer Should Know" are real topics people search for. Long titles tend
   to be the ones that drifted into describing a lesson rather than naming a subject.
4. No em dashes.

## Constraint that matters

**Do not change lesson `id` values.** See [SEO-009](SEO-009-summary-length.md) for why: ids are URL
segments and Firestore progress keys, and renaming one is a hard 404 plus lost progress. Titles are
free.

## Done when

No lesson title exceeds 60 characters, or the remaining ones are deliberate and noted here.

## Related

The hygiene test (`lib/tutorials/__tests__/lesson-content-hygiene.test.ts`) reports this count on
every run without failing, so the number stays visible as the corpus grows.
