# Case Labs — Gaps & Plan (CTO / CDO / CSO)

> Post-v1 assessment of the Case Labs feature, grounded in a code audit (not generic advice).
> The feature is **wired and playable end-to-end**, but it is **not yet production-ready for broad
> rollout**. This doc is the punch list, prioritized by role and by ship-risk.

**Verdict:** Architecturally sound, demo-ready, value-prop hollow in places. Three things make it
"works in a demo" rather than "safe to launch": (1) the AI sees *counts*, not the user's actual work,
so the core promise — an interviewer grounded in what you did — is unfulfilled; (2) the LLM routes
appear to bypass the cost/abuse guards the rest of the app uses; (3) a user can complete a lab having
done nothing, which records a real mastery signal. Fix those before turning it on for everyone.

---

## P0 — Ship blockers (do before broad launch)

| # | Lens | Gap | Where | Fix | Size |
|---|------|-----|-------|-----|------|
| 1 | CSO/CTO | LLM routes appear to **skip `enforceQuota` + rate-limit tracking** that `/api/chat` & `/api/generate-feedback` use → free/exhausted users can run unlimited chat+feedback (real $ + abuse hole) | `app/api/labs/chat/route.ts`, `app/api/labs/feedback/route.ts` | Reuse the exact guard chain from `app/api/chat` (`enforceQuota` → `checkRateLimit` → `start/endRequestTracking`); pass `userTier` through | M |
| 2 | CDO | **Completion with zero work is allowed** — skip every station, click Complete → run marked `completed`, feedback over 0/0 tests, mastery recorded. Corrupts the learning signal. | `ReviewStation` + `MilestoneNav` (soft-gating) | In `handleComplete`, block/warn if Build `testResults` empty or required milestones blank; emit a "skipped" analytics event | S |
| 3 | CDO | **Mastery pollution**: every lab Build maps to the fallback DSA pattern `arrays-hashing` → user's roadmap/pattern stats conflate systems work with array problems they never did | `lib/labs/case-lab-mastery.ts:10` | Track lab mastery in a parallel signal (e.g. `case-lab-systems`) or a separate collection excluded from DSA pattern stats | M |
| 4 | CDO/CTO | **AI is not grounded in the user's answers** — chat & feedback receive only counts ("Clarify: 2 questions", "7/10 passing"), never the actual questions / tradeoffs / failing tests. This is the core value prop and it's hollow. | `components/labs/CaseLabChat.tsx` (buildContext), `lib/labs/case-lab-feedback.ts` | Serialize truncated real excerpts (clarify questions, design API+tradeoff, failing test names) into the prompt under a token budget; inject `whyThisCompany`/company rubric into feedback | M |
| 5 | CTO | **Zero UI/hook tests** — the infinite-render-loop bug shipped to prod because nothing renders the labs UI in CI | `components/labs/*`, `useCaseLabRunSync`, store selectors | Add React Testing Library render tests for each station + the shell, and a store-selector stability test (catches the fresh-object class of bug) | M |

---

## CTO — Technology & Reliability

**Robustness**
- Replace unsafe Firestore casts `doc.data() as CaseLabRun` with a Zod parse at the trust boundary (`lib/labs/case-lab-runs.ts:91,107`) — malformed docs currently flow straight into the UI. **(M)**
- Guard `BuildStation` empty/edge cases: empty `files` array → `activeFile` undefined; `getScenarioById` result used before null-check (`BuildStation.tsx:64,257`). **(S)**
- `app/api/labs/feedback/route.ts`: validate body with Zod (currently `as { runId?: string }`); guard `getCaseLabById` result before `recordCaseLabMastery`. **(S)**

**Testing & CI**
- P0 #5 above (UI/hook render tests). **(M)**
- Add an integration test for `useCaseLabRunSync` (load on mount, debounced save, id-adoption, error degrade). **(S)**
- **Repo hygiene (pre-existing, not labs):** 2 failing cases in `lib/scenarios/__tests__/real-world.test.ts` (stale `bugfix-temperature-alert-regression` list) + ~140 repo-wide eslint errors (admin/`any` types). Decide: fix or quarantine so CI is green and labs regressions are visible. **(M)**

**Architecture / scale**
- Lab content is hard-coded with no `version` / `draft|published` state — no way to stage or roll back a lab. Add status gating before a content pipeline exists. **(S)**

## CDO — Data & Learning Signal

- **Mastery taxonomy** (P0 #3): give Case Labs a first-class skill dimension instead of borrowing `arrays-hashing`; otherwise roadmap recommendations degrade as labs scale.
- **AI grounding** (P0 #4): the richest data you collect (the user's actual clarify/design/build artifacts) never reaches the model.
- **Analytics are dark on the funnel** — only `started` / `milestone_completed` / `completed` fire. Missing: milestone **drop-off/abandonment**, **time-per-station** (timestamps exist on the run but aren't emitted), **test-run** events + pass-rate trend, **chat engagement**. Without these you can't see where users stall. `lib/labs/case-lab-analytics.ts`. **(S–M)**
- **Content scale**: exactly **1 lab** exists, no schema/generator/authoring doc. The spec calls lab-generation "core, not a someday item." Either write `lib/labs/AUTHORING.md` (port checklist, schema walkthrough) now, or stand up the generator target. Until then the catalog grows one hand-authored lab at a time. **(M)**
- **Roadmap reciprocity**: completion feeds mastery but nothing feeds *back* — no "you finished Palantir, try X next" recommendation. **(M)**

## CSO — Security & Trust

- **Cost/abuse guard** (P0 #1) is the headline security item — unmetered LLM + code-execution endpoints are a DoS/billing risk.
- **Auth/authz: PASS.** All three labs routes authenticate via `verifyAuth` and derive ownership from the token, never the body. Good.
- **Input validation:** chat/runs use Zod ✅; feedback route does not (P0/CTO above). Add a serialized-size cap on `run.answers` before it hits the LLM (prompt-injection / token-exhaustion). **(S)**
- **Error leakage (low):** chat/runs return `zodError.flatten()` (exposes schema paths); return `.errors.map(e => e.message)` like `/api/chat`. **(S)**
- **`/api/execute` sandbox/rate-limit:** confirm the Build station's execution path inherits the existing Piston sandbox + rate limits (labs send arbitrary editable file contents to it). **(S, verify)**

## Design / UX (highest-leverage non-blocker)

- **No save-state visibility** — debounced autosave is silent; add `syncStatus: idle|saving|saved|error` + a header indicator. Users don't trust invisible saves. **(S)**
- **No resume-vs-restart / abandon control** — re-entry always resumes the in-progress run; no "start over" or "reset this milestone". **(M)**
- **Soft-gating with no nudge** — freedom is intended (P1), but Review currently lets you finish on empty work with no prompt. Add the "nudge" (warn on skipped Design / unrun Build). Ties to P0 #2. **(S)**
- **Mobile 3-column shell** collapses to a chaotic single scroll < 1024px — chat + rail + station stack. Make chat a drawer on phones. **(M)**
- **A11y**: focus restoration on collapsible close, explicit aria-labels on milestone nav, focus-visible on chat input. **(S)**

---

## Suggested sequencing

1. **Week 1 — make it safe:** P0 #1 (cost guard), P0 #2 (block empty completion), P0 #3 (mastery taxonomy), Zod on feedback route + answers size cap.
2. **Week 2 — make it good:** P0 #4 (ground the AI in real answers), P0 #5 (UI tests), robustness guards, save-state indicator + restart control.
3. **Week 3 — make it scale:** analytics funnel events, authoring doc/generator, lab versioning, roadmap recommendations, mobile shell + a11y, green up CI.

**One-line framing for each officer:**
- **CTO:** "It works, but nothing tests the UI and malformed data flows straight through — we shipped one infinite loop already."
- **CDO:** "We're recording completions and mastery from work that may not exist, against the wrong skill, and the AI never sees the data we collect."
- **CSO:** "Auth is solid; the open door is unmetered LLM/exec spend."
