# Edge to Node consolidation: assessment

Written 2026-08-01, after discovering that the Edge route serves nearly all traffic while the Node route received nearly all the scoring work.

## The routing reality

`app/interview/_hooks/useInterviewFeedback.ts:298` calls `startStreaming()` with `scenarioType` passed through as data. There is no branch on it. So:

| Scenario type | Route | Runtime |
|---|---|---|
| DSA, bugfix, optimization, security, add-functionality | `/api/feedback/stream` | Edge |
| system-design | `/api/generate-feedback` | Node |

System design dispatches separately through `app/interview/_hooks/useSystemDesignFeedback.ts:192`.

This is easy to get wrong, and it was gotten wrong: several rounds of scoring hardening landed on `lib/feedback/scoring/*` (Node) while the sessions those fixes targeted were being scored by `lib/feedback/edge-utils.ts`.

## Why the split existed, and why that reason is gone

The route header claimed Edge was needed to escape Vercel's 10s Hobby serverless timeout by streaming. That is no longer true:

- `vercel.json` already sets `maxDuration: 30` for `app/api/**/*.ts`. Verified in-repo.
- Vercel's default function timeout is reported to be far higher than 10s on current plans, and Vercel is reported to no longer recommend Edge Functions now that Fluid Compute runs regular Node.js in the same regions at the same price. **Both of these are from general platform knowledge, not verified against current Vercel docs. Check them before planning around them.**

(`app/api/feedback/persist/route.ts` also carried its own `export const maxDuration = 10` on the same stale premise, which a per-route export uses to override `vercel.json`. Removed in `f01fa675`.)

What remains is a secondary consequence, not a justification: Edge cannot use the Firebase Admin SDK, which is why `/api/feedback/persist` exists as a separate endpoint that the browser calls after streaming finishes.

## What consolidating would win

**About 1,830 lines of duplicated, cruder code deleted** (counts verified 2026-08-01):

| Edge module | Lines | Node counterpart |
|---|---|---|
| `lib/feedback/edge-utils.ts` | 541 | `scoring/dsa-scoring.ts` + `score-floors.ts` + siblings |
| `lib/feedback/transcript-analysis-edge.ts` | 556 | `lib/feedback/transcript-analysis.ts` |
| `lib/ai-providers-edge.ts` | 406 | `lib/ai-providers.ts` |
| `lib/auth-edge.ts` | 65 | `lib/auth-helpers.ts` |
| `app/api/feedback/persist/route.ts` | 263 | unnecessary on Node |

**It resolves several standing problems by deletion rather than by reconciliation:**

- The deferred Edge-vs-Node scoring divergence stops needing a decision.
- `/api/feedback/persist` disappears. That endpoint exists only because scores had to round-trip through the browser to reach Firestore, which is precisely what made client-supplied scores writable and required a Zod schema to defend. On Node the write happens server-side and the attack surface is gone.
- Two transcript analyzers, two AI provider wrappers, and two auth paths collapse to one each.

## What it costs

**The Node route has zero bugfix imports.** All bugfix evidence summarization, the 11-dimension breakdown, the semantic scorer, the post-session report, and sealed-pack loading are wired only into the Edge route. Node is not a superset today.

The good news: everything under `lib/bugfix/*` is already runtime-portable. It has to be, because Edge is the more restrictive runtime, so anything running there runs on Node. The work is wiring, not rewriting.

**Streaming is the one genuinely new build.** Today the Edge route emits instant scores in under 100ms and refines them as AI completes. The Node route is request/response with a 20s internal budget (`TIMEOUT_BUDGET_MS`) that drops Constitutional AI when it runs tight. Removing streaming would leave users on a 15-25s spinner. Node route handlers can return a `ReadableStream`, so this is preservable, but it is real work.

**Scores move visibly.** On identical inputs (100% pass, optimal solution) the two scorers disagree on clean sessions: Node 94 versus Edge 87. Migrating means every DSA user's score shifts. That is a product decision, not a refactor.

## Suggested sequencing

Not big-bang. This is the primary path for every scenario type except system design.

1. **Wire bugfix into `generate-feedback`** and verify parity against Edge output on recorded sessions.
2. **Add streaming to the Node route** so the instant-scores UX survives.
3. **Flip the client behind a flag**, Edge still live as fallback.
4. **Delete the Edge duplicates** once the flag has held.

## Open questions to settle first

- How does system design currently persist its session document? `generate-feedback` has no direct `interview_sessions` write, so the claim that it can absorb `/api/feedback/persist` needs confirming before step 1.
- Is the clean-session score shift (87 to 94) acceptable, or should the unified scorer be recalibrated to land nearer today's Edge numbers?
- This touches the same deploy as the AI cost-constant correction. Sequence them deliberately rather than concurrently.

## Interim mitigation already shipped

Rather than wait for the migration, the Edge scorer received the integrity caps it was missing (commits `fe8fa374`, `beb10bb3`, `1dd92aed`, `80047f54`). Before that work the Edge route returned byte-identical scores for a clean session and for one that was keyword-stuffed, incoherent, or answering off-topic: 97/77/96/80, overall 87 in all four cases.

| Case | Edge before | Edge after | Node |
|---|---|---|---|
| clean | 87 | 87 | 94 |
| keyword-stuffed | 87 | 73 | 76 |
| incoherent | 87 | 70 | 71 |
| irrelevant | 87 | 76 | 79 |

Clean sessions are deliberately unchanged, so this carried no legitimate-user impact.

A follow-up review found the caps did not reach **bugfix** sessions at all: the stream route replaces the capped scorer output wholesale with `mapBugfixScoreToFeedbackScores(breakdown)`, and that breakdown's communication dimension was an unguarded LLM judgment. Fixed in `443ff050` / `c4ce2af9` by capping inside `calculateBugfixEvidenceScore`, which also covers the streaming-failure fallback path since it calls the same function.

Follow-up review then found three further leaks, all now closed: the Node bugfix scorer capped on incoherence only (an irrelevant or stuffed session scored 90/95, identical to clean), the clarifying-questions +10 landed above every cap, and the Constitutional-AI evidence floor hard-set communication to 50-80 on exactly the quotes a stuffed transcript produces.

Three residues remain, all deliberate:

- **The `keywordStuffing` detector is defective in both directions and needs a product decision.** `pre-screening.ts` requires `wordCount < 30` across the entire transcript, so it is really measuring brevity. It cannot fire on a long stuffed transcript however dense the salad, and it *does* fire on a genuine terse candidate ("I'll use a hash map." / "That's O(n) time." / "Edge case: empty array." / "Brute force would be slower." is flagged, with `tooShort` and `possibleGibberish` both false). Four scoring paths now consume this flag, so the false positives are the live risk. Both directions are pinned in `pre-screening.test.ts`.
- **The bugfix caps move overall by at most about 3 points.** `communication` carries weight 0.05 in `DEFAULT_WEIGHTS`, and the user-facing value is averaged with `aiCollaborationQuality`, so a cap of 25 displays as 48. A fraudulent bugfix transcript with clean evidence still scores around 91. Closing that gap means reweighting, which is a product decision.
- **Edge does not gate its scoring bonuses on `isCoherent` where Node does.** Gating them was measured and rejected: it drops an incoherent session's understanding to 67 against Node's 90, widening the divergence rather than closing it. See the comment in `edge-utils.ts`.
- **The streaming-failure fallback path is uncapped.** `computeFallbackScores` runs client-side after the Edge route has failed, so the integrity signals do not exist there, and its scores are persisted verbatim. Documented in `lib/interview/fallback-feedback.ts`.
