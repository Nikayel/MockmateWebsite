# SEO and retention work — 2026-10-03 to 2026-10-04

## Request and scope

Improve existing search-performing content using GSC evidence and researched page patterns;
verify AI search crawlability; develop a code-grounded retention strategy for a small user base.
Use cheaper agents for audits and make small, scoped commits. This file is the continuation handoff.

## Current state

- Three `gpt-5.6-luna` subagents completed audits, isolated content edits, and review.
- Existing `seofixesbacklog.md` and `docs/seo-measurement.md` contain August GSC snapshots.
  They are historical evidence, not current rankings. Many listed fixes have already shipped.
- User specifically prioritizes pages around positions 7–10. The historical leader-election,
  2PC/3PC, and isolation-level improvements were already implemented; see the August 25 closure
  log in `seofixesbacklog.md`. Avoid rewriting those pages just to repeat completed work.
- Live GSC Overview was read on October 3 for URL-prefix property `https://www.codesparring.dev/`.
  It showed 308 indexed and 241 not-indexed pages. Its recommendations flagged HTTP semantics
  impressions up 837% and leader election down 66% for September 22–28 versus September 15–21.
  These percentages have no accompanying counts or current positions in the overview. The browser
  session became unstable before a full performance export was obtained. Do not call this a fresh
  ranking baseline or compare this prefix property directly with older domain-property exports.
- `app/robots.ts` already welcomes OAI-SearchBot, Claude-SearchBot, and PerplexityBot, with the
  same private-path exclusions as the wildcard group. Confirmed the deployed robots.txt through
  an HTTP fetch on October 4. No crawler-permission change was needed.
- There is substantial pre-existing uncommitted feedback, dashboard, session, Firestore, and cron
  work. Preserve it. Do not stage or commit those changes as part of this task.

## Changes completed

- `level1.ts`: HTTP semantics quick answer, method comparison, ambiguous POST retry example,
  corrected safe/idempotent definitions, and a 148-character search description.
- `level6.ts`: retries/DLQ/backpressure comparison and contextual links. Selection uses the recorded
  July 28–August 24 GSC candidate: 20 impressions, one click, position 11.45, not a live rank.
- `lib/tutorials/related-concepts.ts`: HTTP lesson now has two contextual incoming links, four
  related lessons, and the existing tracked system-design practice CTA.
- `public/llms.txt`: replaced stale exact prices, model versions, counts, and production-experiment
  claims with an accurate public resource directory and canonical lesson links. No ranking claim.
- `seofixesbacklog.md`: appended SEO-37/38 with evidence, implementation, and acceptance criteria.
- `docs/RETENTION-STRATEGY.md`: code-grounded next-practice hypothesis and sequential measurement
  plan, with eligibility windows, raw counts, alternate explanations, and an implementation outline.
  Retention UI/entitlements/notifications were not changed in this batch.

## Retention conclusion

The strongest hypothesis is that feedback ends as a report instead of a specific next action.
Recommendations are collapsed, and the dashboard review card points free users to a Pro-only
destination. Those are code observations, not measured causes of churn. The proposed promise is
“Close the one gap your last interview exposed”: reuse existing feedback and scheduler data to
show one eligible next task, its review date, and concrete evidence of improvement. No extra LLM
request is needed. Check feedback reliability before optimizing the CTA; related fixes are already
in the user's dirty worktree. Read the full strategy before implementing or changing entitlement.

## Research checked

- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots): OAI-SearchBot
  controls automatic search crawling; GPTBot is for potential training use. Their controls are
  independent. User-initiated ChatGPT fetches may not follow robots.txt.
- [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide):
  useful original content, discoverable pages, and normal search eligibility remain central.
  Google says it does not use llms.txt for rankings. Its current guidance also identifies a Search
  Console generative-AI inclusion setting; this session did not inspect or change that setting.
- [Hello Interview practice](https://www.hellointerview.com/practice/overview) and
  [Aced/Exponent SWE course](https://www.tryexponent.com/courses/swe-practice): useful structural
  patterns include clear skill groupings, concrete practice expectations, and contextual next steps.
  These observations do not prove why competitors rank. No competitor prose was copied.
- Technical content: [HTTP semantics RFC](https://www.rfc-editor.org/rfc/rfc9110.html),
  [HTTP caching RFC](https://www.rfc-editor.org/rfc/rfc9111.html),
  [AWS retry guidance](https://docs.aws.amazon.com/wellarchitected/2024-06-27/framework/rel_mitigate_interaction_failure_limit_retries.html),
  [Pub/Sub retry policy](https://docs.cloud.google.com/pubsub/docs/subscription-retry-policy),
  and [dead-letter topics](https://docs.cloud.google.com/pubsub/docs/handling-failures).

## Verification and commits

- `edafb74b`: initial handoff/plan.
- `441a7410`: GSC-backed lesson content, related links, and backlog entries.
- `f5431980`: AI-readable public resource directory.
- Focused Vitest run: 58 tests passed across description budget, content hygiene, related-concepts,
  corpus facts, and lesson drills. The first run caught an overlong description; it was corrected
  and the full focused run passed.
- ESLint passed on all three changed TypeScript files. Full `tsc --noEmit --incremental false` passed.
- Catalog check resolved all nine lesson links in the changed prose and resource directory.
- `git diff --check` passed. Commit hooks formatted/linted scoped files.
- Local Next preview is blocked: installed `@posthog/nextjs-config` is missing, so `next.config.mjs`
  cannot load. No local rendered-page check or full Next build is claimed. Dependencies/config were
  not modified to work around this. Existing focused checks ran successfully with installed tools.
- No production deployment or Git push was performed. Ranking/retention gains are unmeasured.

## Next agent: concrete follow-up

1. Preserve the user's unrelated feedback changes. Read `git status` and this document first.
2. Restore installed dependencies from the existing lockfile, then preview/build and check initial
   HTML for the two lesson routes: title, description, canonical, one H1, new table, and valid links.
   Run `pnpm seo:audit` against the preview if broader index-quality verification is wanted.
3. Obtain a fresh GSC page + query export for a fixed complete 28-day window, keeping property,
   device, and search type consistent. Rank candidates with sustained demand near positions 5–15;
   do not treat a one-impression position-7 row as reliable opportunity.
4. Inspect the current leader-election decline by page-filtered queries before changing content.
   Check indexing/canonical/query-mix changes and compare equal windows.
5. After deployment, record the release date and evaluate SEO-37/38 over comparable windows.
6. Implement the single next-practice treatment and events from `RETENTION-STRATEGY.md` only after
   reconciling the existing feedback work and free-tier destination behavior. Keep current paid
   entitlements intact unless the owner explicitly changes that product policy.
