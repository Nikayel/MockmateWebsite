# SEO-009: Shorten the lesson summaries that are now meta descriptions

**Phase:** 4, content debt
**Owner:** authoring loop (content work, not platform)
**Blocking:** no
**Effort:** large but parallelizable, and it is the highest leverage copy pass available

## Status: the System Design half is being rewritten now (2026-08-13)

This ticket is live work, not a backlog item. A twelve-agent sweep, one per System Design level
file, is rewriting every summary over 160 characters to a single searcher-facing sentence, tracked
as SEO-35 in `curriculumfixesbacklog.md`. The Python and Data Engineering halves are untouched.

Two things worth carrying forward when that lands:

1. **The reporter becomes an assertion.** `lesson-content-hygiene.test.ts` currently prints the
   count and passes, which CLAUDE.md's "enforce a convention with a test, not a document" rule says
   is enforcement by nobody. It flips to failing once the System Design number reaches zero, with a
   grandfathered allow-list for whatever remains in the other two courses.
2. **The metadata fallback was the defect, not a workaround for it.** `truncateForDescription` cuts
   at 155 on a word boundary, which is correct behaviour applied to text that should never have
   needed it. Do not "fix" this by raising the truncation limit: Google shows what Google shows.

## Why

Each lesson's authored `summary` is now its `<meta name="description">` and the text Google shows
under the title in search results. Those summaries were written as **level index blurbs**, back when
nothing was public and their only job was to describe a row in a list. They are far too long for
their new job.

Measured 2026-08-03: **216 of 425 lesson summaries exceed 160 characters.** Overwhelmingly System
Design. The worst offenders run 400 to 493 characters, so roughly two thirds of the text is cut.

Get the current numbers and the worst offenders:

```bash
npx vitest run lib/tutorials/__tests__/lesson-content-hygiene.test.ts 2>&1 | grep "learn-seo"
```

That test reports rather than fails on length, deliberately: it should not block the authoring loop,
but it should keep the number visible on every run.

## Why it matters more than it sounds

A truncated description is not a ranking penalty. It is a **click through rate** problem, which is
the one thing you can actually influence in the short term while ranking slowly improves. A summary
that reads as a complete thought in 155 characters earns clicks that a sentence sliced mid clause
does not.

It is also the cheapest quality signal available. Several hundred pages whose descriptions all trail
off mid sentence reads, to a human scanning results, like an auto generated site.

## Do this

1. Target **under 155 characters**, so there is room for Google's own truncation behaviour.
2. Lead with the concrete thing the lesson teaches, not with framing. The prompt style rule already
   in force for exercises applies here too: say what the reader gets, not what the lesson is about.
3. Do **not** simply truncate the existing text. A cut sentence is worse than a short one.
4. No em dashes (standing content rule).
5. Prioritize by traffic potential rather than by how bad the overrun is: System Design L10 case
   studies and L9 modern architecture are the pages most likely to attract informational search, so
   they are worth doing first even though every track has offenders.

## Constraint that matters

**Do not change lesson `id` values.** Ids are the URL segment and the Firestore progress key, and
they are statically generated with `dynamicParams = false`, so a renamed id is a hard 404 for every
indexed page and every learner's saved progress. Titles and summaries are free to change; ids are
frozen.

## Done when

The count reported by the hygiene test is materially down, and no lesson summary is a truncated
sentence. There is no need to reach zero: a 170 character summary that reads well is fine.
