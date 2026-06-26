# Case Labs — Build Progress Ledger

> Operational task tracker for the `/loop` build (see `BUILD_LOOP_PROMPT.md`).
> The loop reads this each iteration to find the next unchecked task, and checks items off as it ships them.
> Spec detail lives in `CASE_LABS.md` (§ references below). Keep notes terse.

**Status:** in progress
**Current phase:** Phase 5
**Last updated by loop:** Phase 5 — `/labs` gallery + CaseLabCard

---

## Phase 0 — Scaffolding & types (spec §9, §12)
- [x] `lib/labs/types.ts` — `CaseLab`, `CaseLabMilestone`, `MilestoneKind` (buildScenarioType = bugfix|add-functionality|system-design, never DSA)
- [x] Firestore `caseLabRuns` shape documented in `docs/FIREBASE_STRUCTURE.md`
- [x] `lib/stores/case-lab-store.ts` — milestone + answers state

## Phase 1 — Shell & milestone rail, no AI (spec §6, P1/P3)
- [x] `MilestoneRail` (where-am-I / what's-next / why)
- [x] `StationSwitcher` + stub stations
- [x] 3-column layout reusing the `/interview` shell; center morphs per milestone
- [x] Soft navigation between milestones

## Phase 2 — Form stations (spec §7.1–7.3, P2)
- [x] `ClarifyStation` (ghost example + progressive disclosure)
- [x] `DecomposeStation` (workflow / entities / state machine)
- [x] `DesignStation` (API contract + tradeoff table)
- [x] Answers persist to the Run; save/resume across reload

## Phase 3 — Build & Review (spec §7.4–7.5)
- [x] Build station embeds multi-file workspace editor + `/api/execute` (codebase drop, NOT DSA editor)
- [x] `ReviewStation` → existing feedback pipeline → render `structured_feedback`
- [~] On complete: update mastery + mark Run `completed` (Run marked `completed` + feedback generated/persisted; mastery/roadmap update still pending)

## Phase 4 — Port Palantir 911 Dispatch (spec §1, §7.4; ingredient: ../workbook-palantir-decomp/labs/lab_01_911_dispatch)
- [x] Map Clarify/Decompose/Design/Review content into the `CaseLab` definition
- [x] RESHAPE Build into a multi-file bugfix/add-functionality scenario (no blank single-file starter)
- [x] Lab fully playable through all 5 milestones

## Phase 5 — AI spine + browse + polish (spec §7, §8; only after 0–4 solid)
- [x] Pass `currentMilestone` into chat; milestone-aware reactions + company persona
- [x] `/labs` gallery (basic listing + CaseLabCard; filter-by-company/skill + progress = later polish)
- [ ] `CaseLabIntro` start screen + Practice/Onsite mode toggle
- [ ] Loading / empty / error / unauthorized states on all new surfaces
- [ ] Analytics events (lab started, milestone completed, lab completed, mode used)

---

## Definition of Done (v1)
- [ ] 911 Dispatch lab fully playable: Clarify → Decompose → Design → Build (multi-file codebase drop) → Review
- [x] AI interviewer engaged across milestones; structured feedback at the end
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass
- [ ] New surfaces handle loading/empty/error/unauthorized
- [ ] `graphify update .` run; graph current

---

## Decision log (loop appends new choices here)
- `lib/labs/types.ts` is the single home for all Case Labs domain types (lab definition + milestone answers + `CaseLabRun`). The Firestore-shape task (next) documents the same `CaseLabRun` in `FIREBASE_STRUCTURE.md`; the store imports these types rather than redefining them.

## Iteration notes (loop appends one line per increment)
- Phase 0: `lib/labs/types.ts` — full Case Labs type module (CaseLab/CaseLabMilestone/MilestoneKind, per-milestone answer shapes, resumable `CaseLabRun`). Reuses `DifficultyLevel`, `WorkspaceScenarioLanguage`, and `InterviewSession.structured_feedback` to stay DRY. typecheck + lint clean.
- Phase 0: documented `caseLabRuns` collection in `docs/FIREBASE_STRUCTURE.md` (annotated shape mirroring `CaseLabRun`, noted as the source-of-truth contract to keep in sync). Docs-only, no code change.
- Phase 0 (complete): `lib/stores/case-lab-store.ts` — zustand store (devtools, no persist → Run loads fresh from Firebase like roadmap-store to avoid cross-user leaks). Soft navigation, per-milestone answer setters, progress/complete helpers, `MILESTONE_ORDER`, selector hooks. Firebase save/resume wiring deferred to a later phase. typecheck + lint clean; graph updated.
- Phase 1: `components/labs/MilestoneRail.tsx` — vertical stepper on `progress` + `collapsible`, reads the store, soft navigation via `goToMilestone`. P3 baked in (active highlight, ✓ done markers, "Next: …" label, per-row purpose line). Falls back to default milestone labels when no lab is loaded; collapsible on small screens, always-open on lg. typecheck + lint clean; graph updated.
- Phase 1: `components/labs/StationSwitcher.tsx` — center column that morphs per `currentMilestone` (P2), with a stub station + empty state ("start a lab to begin"). Extracted shared `lib/labs/milestones.ts` (`DEFAULT_MILESTONE_META`) so the rail and switcher share one source of milestone copy (DRY); rail now imports it. Real stations replace stubs in Phases 2–3. typecheck + lint clean; graph updated.
- Phase 1: `components/labs/CaseLabShell.tsx` — 3-column layout reusing the `/interview` grid (`lg:grid-cols-[320px_minmax(0,1fr)_240px]` …): rail | StationSwitcher | chat. Right column takes a `chatSlot` prop (defaults to a placeholder) so Phase 5 drops in the real `InterviewerChat` without changing the shell. typecheck + lint clean; graph updated.
- Phase 1 (complete): soft navigation — added `goToNextMilestone`/`goToPreviousMilestone` to the store (clamped via `MILESTONE_ORDER`) and `components/labs/MilestoneNav.tsx` (Back/Next, disabled at ends), wired as the StationSwitcher footer. No hard gating (P1). typecheck + lint clean; graph updated.
- Phase 2: `components/labs/stations/ClarifyStation.tsx` — 5 guided dimensions (Question + Assumption each) as progressive-disclosure collapsibles (one open at a time); first row shows a ghost example as placeholder (P2, no blank wall); per-dimension answered dot; persists to the run via `setClarify`; soft "3+ recommended" hint. Wired into `StationSwitcher` (clarify → real station, rest → stub). typecheck + lint clean; graph updated.
- Phase 2: `components/labs/stations/DecomposeStation.tsx` — three progressive-disclosure panels (legacy workflow ordered steps, core entities name+role, state machine with states + from/on/to transitions), add/remove rows, persists to the run via `setDecompose` (state machine omitted until non-empty). Wired into `StationSwitcher`. typecheck + lint clean; graph updated.
- Phase 2: `components/labs/stations/DesignStation.tsx` — API contract (named endpoint + input/output `{name,type}` field lists), tradeoff table (Decision/Option A/Option B/Choice/Why per row), and a ranking/fallback textarea; persists via `setDesign`. Extracted shared `station-kit.tsx` (`CollapsiblePanel`, `RemoveRowButton`) and refactored DecomposeStation onto it (DRY). Wired into `StationSwitcher`. typecheck + lint clean; graph updated.
- Phase 2 (server half of persistence): `lib/labs/case-lab-runs.ts` — `caseLabRuns` Firestore service (`getCaseLabRun`, `getActiveCaseLabRun` for resume, `upsertCaseLabRun`) with a Zod input schema; ownership enforced from auth (never the body), `startedAt` preserved on update, `completedAt` omitted-when-undefined, active-run lookup avoids a composite index. Thin `app/api/labs/runs/route.ts` (GET by runId/caseLabId, PUT upsert; 401/403/400/500). Added `lib/labs/__tests__/case-lab-runs.test.ts` (6 schema-validation tests, all pass). Client store wiring (load on mount + debounced save) is the next increment. typecheck + lint + tests clean; graph updated.
- Phase 2 (complete): client persistence — `lib/labs/case-lab-runs-client.ts` (token-attached fetch wrappers, degrade to null when signed out/failed) + `components/labs/useCaseLabRunSync.ts` (loads the in-progress run once per lab for resume; debounced 1s autosave on answer/status/nav changes; adopts a server-assigned id without clobbering in-flight edits; soft error on failure). typecheck + lint clean; graph updated.
- Phase 3 (Build scaffold): `components/labs/stations/BuildStation.tsx` — loads the lab's `buildScenarioId` via `getScenarioById`, renders the multi-file workspace (file tabs with lock icons for read-only, reused `CodeMirrorEditor` + error boundary), persists edits via `setBuild` (touchedFiles diffed vs originals, primary-file code). Handles no-scenario / not-found / non-workspace empty states. Wired into `StationSwitcher`. NOTE: persists primary-file code for now (multi-file content persistence + `/api/execute` run-tests are the next increment). typecheck + lint clean; graph updated.
- Phase 3 (Build complete): wired "Run tests" in BuildStation → POST `/api/execute` with `{scenarioId, language, workspaceFiles:[{path,content}]}` (editable files only), maps the response `results` to `BuildTestResult[]`, persists via `setBuild`, and renders a pass/fail panel with `n/m passing` + per-test check/X + error messages. Attaches the auth token when present; loading + error states handled. typecheck + lint clean; graph updated.
- Phase 3 (Review UI): `components/labs/stations/ReviewStation.tsx` — read-only recap of all milestones (clarify/decompose/design/build with test pass count), 1–5 self-grade rubric across the 5 `CaseLabRubricDimension`s persisting via `setReview`, renders `structured_feedback` (tldr/whatWorked/fixNext/actionPlan) when present, and a "Complete lab" button → `completeRun`. Now all 5 stations are real, so `StationSwitcher` dropped the stub (exhaustive switch). Fixed BuildStation's stale doc-comment. typecheck + lint clean; graph updated.
- Phase 3 (feedback pipeline, server): `lib/labs/case-lab-feedback.ts` — pure `buildCaseLabFeedbackPrompt` (summarizes every milestone) + `parseCaseLabFeedback` (tolerant JSON extraction → `structured_feedback` shape, raw fallback) + `generateCaseLabFeedback` (routes through `generateFeedbackResponse` so rate-limit/cache/cost-tracking apply). `app/api/labs/feedback/route.ts` (POST {runId}: auth, load, generate, persist aiFeedback + mark completed). Added `case-lab-feedback.test.ts` (6 tests, pass). ReviewStation will call this on "Complete"; mastery update still pending. typecheck + lint + tests clean; graph updated.
- Phase 3 (feedback wiring, client): ReviewStation "Complete lab" → `saveCaseLabRun` (persist latest + get id) then `requestCaseLabFeedback` (new `lib/labs/case-lab-runs-client.ts` helper) → `setActiveRun` with the completed run (renders generated feedback). Loading ("Completing…/Generating…") + graceful fallback (`completeRun` locally + soft error) when generation/auth fails. `structured_feedback` → `render` item DONE. typecheck + lint clean; graph updated.
- Phase 4 (lab definition): read ingredient `lab_01_911_dispatch` (workbook/meta/reference/tests). `lib/labs/case-labs/palantir-911-dispatch.ts` — `CaseLab` with company/role/whyThisCompany (P6), skills, 5 milestones with lab-specific purposes + clarify/decompose ghost examples; `buildScenarioId: "palantir-911-dispatch-build"`, `buildScenarioType: "add-functionality"` (codebase drop, NOT DSA). `lib/labs/case-labs/index.ts` registry (`getCaseLabById`/`listCaseLabs`). Test asserts THE CORE RULE (build type ∈ codebase types) + all 5 milestones in order. NEXT: reshape the build into the multi-file `palantir-911-dispatch-build` workspace scenario. typecheck + lint + tests clean; graph updated.
- Phase 4 (build reshape): `lib/scenarios/add-functionality/add-feature-911-dispatch.ts` — reshaped the workbook's single-file `starter.py` into a MULTI-FILE workspace `add-functionality` scenario (read-only `src/geo.py`, editable `src/dispatch.py` recommender w/ TODO, editable `src/dispatch_service.py` wrapper, visible + hidden Python tests + runner, reference solution). Registered in the add-functionality index. Added `case-lab-build-wiring.test.ts` (lab → scenario resolves, workspace, not DSA, has reference). VERIFIED the reference solution passes all 5 tests (2 visible + 3 hidden) via a local python run. typecheck + lint + tests clean; graph updated.
- Phase 4 (complete — playable): `app/labs/[labId]/page.tsx` — loads the lab via `getCaseLabById`, resumes via `useCaseLabRunSync` or starts a fresh run (new store `startRun` action: client uuid id, clarify active, rest locked), renders `CaseLabShell`. Lab-not-found + back-to-/labs handled. The 911 Dispatch lab is now playable end-to-end Clarify→Decompose→Design→Build(codebase)→Review with autosave/resume and AI feedback. typecheck + lint clean; graph updated.
- Phase 5 (AI spine, server): `lib/labs/case-lab-chat.ts` — pure `buildCaseLabChatSystemPrompt` (company persona + per-milestone coaching + optional answer context) + `generateCaseLabChatReply` (reuses `generateAIResponse`, `chat_message` event). Decision: a dedicated `/api/labs/chat` endpoint rather than threading the 864-line interview `/api/chat` (it's tightly coupled to interview scenarios/phases) — same persona/milestone goal, far less risk. Added `case-lab-chat.test.ts` (3 tests, pass). Chat UI in `chatSlot` next. typecheck + lint + tests clean; graph updated.
- Phase 5 (AI spine, UI): `components/labs/CaseLabChat.tsx` — right-column interviewer; sends `{milestone, messages, lab persona, answer-summary context}` to `/api/labs/chat`, renders the conversation (user/assistant bubbles, typing spinner, empty + soft-error states, Enter-to-send), attaches auth token. Wired into the play route via `chatSlot`. The AI is now engaged across every milestone — **DoD item "AI interviewer engaged across milestones" met**. typecheck + lint clean; graph updated.
- Phase 5 (browse): `app/labs/page.tsx` gallery + `components/labs/CaseLabCard.tsx` (company/role, difficulty badge via shared `difficultyColorClass`, why-this-company teaser, skills, est. minutes, Start → play route). Empty state handled; fixes the play route's previously-dangling `/labs` back-link. Filter-by-company/skill + progress badges deferred to polish. typecheck + lint clean; graph updated.
