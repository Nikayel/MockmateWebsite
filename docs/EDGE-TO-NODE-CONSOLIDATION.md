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

- `vercel.json` already sets `maxDuration: 30` for `app/api/**/*.ts`.
- Vercel's default function timeout is now far higher than 10s on all plans.
- Vercel no longer recommends Edge Functions. Fluid Compute runs regular Node.js in the same regions at the same price.

What remains is a secondary consequence, not a justification: Edge cannot use the Firebase Admin SDK, which is why `/api/feedback/persist` exists as a separate endpoint that the browser calls after streaming finishes.

## What consolidating would win

**Roughly 2,500 lines of duplicated, cruder code deleted:**

| Edge module | Lines | Node counterpart |
|---|---|---|
| `lib/feedback/edge-utils.ts` | 503 | `scoring/dsa-scoring.ts` + `score-floors.ts` + siblings |
| `lib/feedback/transcript-analysis-edge.ts` | 556 | `lib/feedback/transcript-analysis.ts` |
| `lib/ai-providers-edge.ts` | 406 | `lib/ai-providers.ts` |
| `lib/auth-edge.ts` | 65 | `lib/auth-helpers.ts` |
| `app/api/feedback/persist/route.ts` | 260 | unnecessary on Node |

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
