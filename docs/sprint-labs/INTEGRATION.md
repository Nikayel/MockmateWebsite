# Sprint Labs — integration inventory and reuse decisions

Deliverable #1 of `AGENT-PROMPT.md`. Synthesized from four read-only inventory
sweeps of this repo (Case Labs/UI, execution machinery, auth/scoring, LLM/chat
plumbing) on 2026-08-26. Every claim below carries a file path; where the spec
and the code disagree, the code wins and the deviation is logged in
`EXECUTION-STATE.md`.

## 1. How Case Labs work today

- **Catalog**: static TS, not YAML/Firestore. `lib/labs/case-labs/index.ts`
  holds `CASE_LABS: CaseLab[]`; types in `lib/labs/types.ts`. A lab ships by
  adding a file + array entry. No seeding step.
- **Routes**: `app/labs/page.tsx` (server, static gallery + SEO sections);
  `app/labs/[labId]/layout.tsx` (server, `generateStaticParams` +
  `dynamicParams=false` → real 404s); `app/labs/[labId]/page.tsx`
  (`"use client"`, intro → 3-column `CaseLabShell`, hides global header during
  a run like `/interview`).
- **Run persistence**: `caseLabRuns` flat collection, one doc per run,
  whole-doc `set()`, Zod-validated server-side (`lib/labs/case-lab-runs.ts`),
  thin authed route `app/api/labs/runs/route.ts`, debounced autosave hook
  `components/labs/useCaseLabRunSync.ts` (1s debounce, snapshot dedupe,
  flush on unmount + `visibilitychange:hidden`).
- **Chat**: `components/labs/CaseLabChat.tsx` → `app/api/labs/chat/route.ts`
  → `lib/labs/case-lab-chat.ts` (pure, unit-tested prompt builder;
  `generateAIResponse` with `service: "labs-chat"`). No persistence (refresh
  loses the conversation — a known gap Sprint Labs must not inherit).

## 2. Execution/grading today, and the persistent-repo question

**Can the existing runner hold a persistent ~60-file TS repo across tickets?
NO as-is — and the gap is persistence, not execution.**

- The multi-file contract already generalizes: `WorkspaceScenarioConfig` /
  `WorkspaceScenarioFile[]` (`lib/scenarios/types.ts:92-118`) with
  `overlayWorkspaceFiles` (`lib/workspace-execution/files.ts`) merging learner
  edits onto a base tree (100KB/file cap).
- The JS worker (`public/workers/js-sandbox-worker.js`) already runs
  multi-file trees through a hand-rolled CommonJS `require()` graph with a
  self-hosted assert shim; fresh worker per run; 5s timeout;
  `__WORKSPACE_TEST_RESULTS__:` marker protocol shared with Python and SQL.
- **TypeScript in-browser: nothing exists.** Today `.ts` files round-trip one
  at a time through `POST /api/transpile` (`ts.transpileModule`, server-side,
  rate-limited, no live curriculum caller). Smallest extension: self-host a
  browser build of the already-depended-on `typescript` package under
  `public/` and transpile per file *inside* the worker via `importScripts`,
  mirroring how `sql-wasm.js` and `assert-shim.js` are already self-hosted.
  Type-stripping only, no cross-file type-checking (nothing does that today).
- **Postgres semantics: none.** sql.js (SQLite WASM, self-hosted under
  `public/wasm/`) is the only SQL engine. PGlite is net-new (ruling R2
  confirmed), reusing the sql.js worker's structure: self-hosted WASM,
  `importScripts`, status/exec-start/result protocol, warm-state module.
- **Server-side code persistence: does not exist anywhere.** All precedents
  store status/score docs whole-doc; no Firestore 1MiB guard exists in the
  repo. Sprint Labs needs a per-file subcollection store (one small doc per
  file path) reusing the proven debounce/flush template.
- **The IO-cases grading pattern already exists, tested, currently unwired:**
  `POST /api/interview/pack/advance` accepts raw client stdout, loads the
  sealed expected value via `lib/scenarios/sealed/registry.server.ts` (a
  generated server-only registry produced by `scripts/compile-packs.mjs`,
  guarded by the grep-based CI test
  `lib/bugfix/packs/__tests__/sealing.test.ts` and a runtime
  `typeof window` throw), compares server-side (`computeRunEvent` /
  `diffStdout`), and never ships the secret. **This is the mechanism the
  whole Sprint Labs grading tier generalizes.**
- Trust posture to avoid: `PUT /api/tutorials/progress` accepts a bare
  client-computed `lastExerciseScore` with no verification — named here so
  nobody copies it for a graded surface. Score writes follow the
  read-then-clamp transactional shape of `recordLearnTime`
  (`lib/tutorials/learn-time.ts:108-202`) instead.

## 3. Auth, DB, entitlements, scoring, readiness

- **Auth**: `verifyAuth(request)` (`lib/auth-helpers.ts:22`) inlined per route
  (house style, 35 routes); Edge routes use `verifyAuthEdge`. `proxy.ts` is a
  UX redirect, never a security boundary.
- **DB**: Firestore via `adminDb` (`lib/firebase-admin.ts`), default-deny
  rules; the `caseLabRuns` rules block (`firestore.rules:420-436`) is the
  copy-verbatim pattern for an owned-data collection. Feature-scoped types in
  `lib/<feature>/types.ts`; document shapes recorded in
  `docs/FIREBASE_STRUCTURE.md`.
- **Entitlements**: `profiles/{uid}.subscription_tier` set only by the Stripe
  webhook. Route gating: `verifyAuth` → `requireTierForUser(userId, "pro")`
  (`lib/quota-enforcement.ts:904`) for sprints 2+. Session metering:
  `recordSessionStartAdmin(userId, scenarioId)` — Pro meters distinct
  scenarios per period with free redos; Sprint Labs calls it at sprint start.
- **Cost-bearing preamble**: `enforceMeteredAiRequest(request,
  { estimatedTokens, ipLimiter })` (`lib/ai/metered-request.ts:30`), exactly
  as `app/api/labs/chat/route.ts` does. New `UsageServiceId`s are appended in
  `lib/usage/services.ts` (`sprint-labs-chat`, `sprint-labs-grading`,
  `sprint-labs-validate`); `trackUsageEvent` alone calls `recordGlobalSpend`.
- **Rubric, verbatim from code** (matches the spec's assumption):
  `"Understanding" | "Problem-Solving" | "Code Quality" | "Communication"`
  (`lib/feedback/types.ts:104`; camelCase fields at :20-23). Weights in
  `lib/constants.ts:112-121`; scale 0-100 enforced in code and in
  `firestore.rules:75-80`. The Edge/Node duplicate scoring copies
  (`lib/feedback/edge-utils.ts` vs `lib/feedback/scoring/*`) are live and
  diverging — Sprint Labs touches neither.
- **The fifth "Verification" dimension** lands additively as a new sibling
  breakdown on `InterviewSession` (`sprint_score_breakdown`), the exact
  precedent Bugfix set with `bugfix_score_breakdown` (`lib/types.ts:159-172`).
  Zero Mock Rounds code changes.
- **Readiness**: no central aggregator exists; per-surface tiles on the
  dashboard (`app/dashboard/page.tsx:757-789` is the template). Mastery feeds
  through one entry point, `completeSessionWithMastery`
  (`lib/learning-state.ts:356`), under a dedicated non-DSA pattern bucket —
  register `"sprint-lab"` in `lib/types/dsa-patterns.ts` exactly as
  `CASE_LAB: "case-lab"` did (`lib/labs/case-lab-mastery.ts:6-11` documents
  why). Match `scheduler.ts` field names, not `session-metrics.ts`'s (known
  live mismatch).
- **Flags**: `lib/feature-flags.ts` three-layer system (Firestore admin UI →
  env break-glass → static default) with per-user rollout. Add
  `SPRINT_LABS_ENABLED: false`; read via `getFlagAsync`. 30s propagation TTL.

## 4. Chat/LLM plumbing for the Sable partner

- **Seam**: `generateAIResponse` (`lib/ai-providers.ts`) — pinned Gemini
  (`gemini-3.6-flash` / `3.5-flash-lite`, `lib/ai/model-ids.ts`), GPT-5.6
  "luna" + DeepSeek fallback chain, retries, cache, cost tracking built in.
  No token streaming exists anywhere in chat — do not design for it in v0.
- **Fork target**: the Case Lab chat trio (component + thin route + pure
  builder), NOT `app/api/chat/route.ts` (10x bigger, DSA-coupled, and its
  partner lane bypasses all guardrails).
- **Context layers A-D** assemble as pure per-concern builder functions
  (style of `lib/interview/chat/context-builders.ts`), ordered stable-first
  with volatile per-turn state after history (cache-economics lesson already
  paid for twice: `lib/interview/context-window.ts`,
  `lib/interview/topic-ledger.ts`). Per-turn signals (newly-red test, diff
  stat) ride the outgoing message string like
  `lib/interview/code-change-note.ts` — never new schema fields.
- **Transcripts**: extend `lib/feedback/transcript-storage.ts`'s bounded
  server-owned subcollection shape (200 msgs / 4k chars / 700KB, recency
  wins) additively with `aiPolicy`, `provenance`, `capabilities`. Never the
  browser-owned `session_state` autosave; never Case Lab chat's
  no-persistence.
- **Policy enforcement precedent**: `lib/interview/topic-ledger.ts` — a
  typed action union where the illegal move is unrepresentable. `ai_policy`
  modes are enforced as capability (which tools/context exist per mode),
  never as prompt-side conscience. The `unassisted` mode issues no partner
  session at all; `SableTutor.tsx`'s locked-card affordance is the UI state
  for it.
- **"Sable" today**: the interviewer persona is live
  (`lib/interview/interviewer-prompts.ts:188`); Learn's `SableTutor.tsx` is a
  locked placeholder with zero backend. Sprint Labs' partner is effectively
  Sable's first working non-interview surface.
- **Capability message**: one client-safe constants module
  (`lib/sprint-labs/platform-capabilities.ts`) exports the "server-side
  isolated grading lands next month" message + per-workbook
  `requiresServerExecution`; imported by prompt builders AND catalog UI (the
  scattered-constant failure mode was already hit once for supported
  languages).

## 5. Reuse vs new

| Piece | Verdict |
|---|---|
| Public/secret content compiler | **Generalize** `scripts/compile-packs.mjs` + sealed registry + sealing test |
| Server-side hidden-test comparison | **Generalize** `pack/advance` + `computeRunEvent` |
| Multi-file browser execution | **Extend** js-sandbox worker (add in-worker TS transpile + vitest-shim) |
| SQL engine | **New**: PGlite worker (structure copied from sql.js worker) |
| Workspace persistence | **New**: per-file subcollection store on the `useCaseLabRunSync` debounce template |
| Catalog/routing | **Reuse**: CaseLabCard, Pattern B routing (static public page + force-dynamic noindex auth-gated workspace) |
| Board | **New** component (nearest cousin `MilestoneRail`) |
| Ticket/workspace shells | **Reuse**: station-kit, BuildStation pattern, CodeMirrorEditor, CodeConsole/TerminalOutput |
| Chat partner | **Fork** Case Lab chat trio; add persistence + policy modes |
| Scoring | **New** `sprint_score_breakdown` sibling (bugfix precedent); rubric names reused verbatim |
| Entitlements/quota/limits/flags/cost | **Reuse wholesale** (`requireTierForUser`, `recordSessionStartAdmin`, `enforceMeteredAiRequest`, `lib/feature-flags.ts`) |
| Mastery/roadmap feed | **Reuse** `completeSessionWithMastery` under new `"sprint-lab"` bucket |

## 6. Honest risks

1. **Client-side hidden execution** (owner-directed): IO-case expecteds stay
   server-side (strong); property probes are client-run and spoofable
   (formative-only). Recorded as deviation D1; revisited when the server
   sandbox lands.
2. **In-worker TS transpile at repo scale** is new perf territory (~60 files
   per run). Mitigation: per-file transpile cache keyed by content hash in
   the worker; measured in T4.
3. **PGlite** is single-connection: true-parallel concurrency assertions
   can't run client-side. Sprint 1-4 content uses deterministic-interleaving
   seams; real-parallel truth deferred to the sandbox era (stated in ticket
   prose where relevant).
4. **Firestore doc limits**: per-file docs cap at 100KB content each
   (existing `MAX_WORKSPACE_FILE_BYTES`); board/run docs stay metadata-only.
5. **Vercel Hobby**: no crons here (cron-job.org only), flag TTL 30s, log
   retention ~1h — nothing in the design depends on any of those.
