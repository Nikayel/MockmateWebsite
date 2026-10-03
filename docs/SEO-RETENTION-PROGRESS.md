# SEO and retention work — 2026-10-03

## Request and scope

Improve existing search-performing content using GSC evidence and researched page patterns;
verify AI search crawlability; develop a code-grounded retention strategy for a small user base.
Use cheaper agents for audits and make small, scoped commits. This file is the continuation handoff.

## Current state

- Read-only SEO and retention audits are running on `gpt-5.6-luna` subagents.
- Existing `seofixesbacklog.md` and `docs/seo-measurement.md` contain August GSC snapshots.
  They are historical evidence, not current rankings. Many listed fixes have already shipped.
- User specifically prioritizes pages around positions 7–10. Checking live Search Console through
  the existing browser session; no dedicated GSC connector is available in this session.
- `app/robots.ts` already welcomes OAI-SearchBot, Claude-SearchBot, and PerplexityBot, with the
  same private-path exclusions as the wildcard group. `public/llms.txt` already exists.
- There is substantial pre-existing uncommitted feedback, dashboard, session, Firestore, and cron
  work. Preserve it. Do not stage or commit those changes as part of this task.

## Intended sequence

1. Capture GSC evidence and identify a small set of pages with existing demand.
2. Compare their current content with useful competitor structures; improve original explanations,
   examples, internal links, and the transition to relevant practice. Do not copy competitor text.
3. Fix verified crawl/discovery defects. Robots permission enables crawling; it does not purchase
   or guarantee a recommendation. Do not add speculative ranking directives.
4. Document the strongest retention hypothesis against actual code and a low-volume measurement
   plan. Prioritize reliable first-session value and a specific next practice action.
5. Run focused checks, review diffs, commit explicit paths, and update this handoff with outcomes.

## Research checked

- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots): OAI-SearchBot
  controls automatic search crawling; GPTBot is for potential training use. Their controls are
  independent. User-initiated ChatGPT fetches may not follow robots.txt.

## Completion ledger

- Initial repository and crawler inventory complete. Implementation and validation pending.
