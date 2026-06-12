# Client-Side Execution & AI Validation Migration Tracker

This document outlines the architecture, code explanations, decisions, and checklists for the 13-sprint migration plan. You can view the interactive dashboard in [migration_tracker.html](file:///Volumes/T7%20Shield/MockmateWebsiteT7/constitution/migration_tracker.html).

---

## Sprint 1: JS/TS Browser Sandboxing (Completed)

We execute JavaScript natively inside a separate Web Worker thread. TypeScript is transpiled to JS using a server compilation endpoint before sending it to the sandbox.

### 📋 Checklist & Deliverables
* [x] Create [js-sandbox-worker.js](file:///Volumes/T7%20Shield/MockmateWebsiteT7/public/workers/js-sandbox-worker.js) to run JS code, capture console output, and resolve module imports.
* [x] Implement in-worker assertion mocks (`ok`, `equal`, `strictEqual`, `deepStrictEqual`, `throws`, `rejects`) to support Node dependency assertions client-side.
* [x] Create [browser-js-runner.ts](file:///Volumes/T7%20Shield/MockmateWebsiteT7/lib/workspace-execution/browser-js-runner.ts) to manage worker execution, handle 5-second execution timeouts, and terminate infinite loops.
* [x] Integrate comment-stripping (`stripComments`) before name-extraction regex checks.
* [x] Create the transpilation route [route.ts](file:///Volumes/T7%20Shield/MockmateWebsiteT7/app/api/transpile/route.ts) using `typescript` package's `ts.transpileModule`.
* [x] Write and verify unit tests in [browser-js-runner.test.ts](file:///Volumes/T7%20Shield/MockmateWebsiteT7/lib/workspace-execution/__tests__/browser-js-runner.test.ts).

### ⚙️ Architectural Decisions & Rationale
* **CommonJS Imports Resolution**: Workspace scenarios reference relative dependencies (e.g. `../state` or `./controller`). To run these in the browser, the worker reads the workspace files, registers their source code in a virtual registry, and maps dependencies using a customized mock `require` function.
* **Lightweight Server Transpilation**: Running a full TS compiler client-side would require loading large npm packages (10MB+) in the browser. By creating a lightweight server-side transpiler endpoint (`/api/transpile`), we send TS code to `ts.transpileModule` which returns pure JS. This is 100% secure as the server only performs syntax transpilation and never executes the code.

---

## Sprint 2: Python Browser Sandboxing (Completed)

Python execution is moved to the client by running Pyodide compiled to WebAssembly.

### 📋 Checklist & Deliverables
* [x] Create `public/workers/python-sandbox-worker.js` loading Pyodide from jsDelivr CDN.
* [x] Intercept Pyodide stdout and stderr buffers to redirect prints to console logs.
* [x] Create `lib/workspace-execution/python-sandbox/` to manage worker execution lifecycle and timeouts.
* [x] Support Python-specific comment stripping and template wrapping (ListNode, TreeNode helpers).
* [x] Add Pyodide downloading / initialization console feedback hooks.
* [x] Write unit tests to verify the sandbox wrapper and runner contract.

### ⚙️ Proposed Decisions & Rationale
* **Persistent Worker Instance**: Loading and initiating Pyodide WebAssembly takes ~2 seconds. To prevent this lag on every execute request, we will keep a persistent singleton Worker thread alive. Subsequent runs are near-instant (~20ms). If a loop hangs, we call `worker.terminate()` and reset the reference.

---

## Sprint 3: Main Execution Router Integration (Completed)

We integrate the sandboxed runners into the main user workspace flow, replacing backend Piston execution.

### 📋 Checklist & Deliverables
* [x] Update `useCodeExecution` hook in [useCodeExecution.ts](file:///Volumes/T7%20Shield/MockmateWebsiteT7/lib/hooks/useCodeExecution.ts) to direct JS/TS and Python runs to the browser runners.
* [x] Update `useTestExecution` hook in [useTestExecution.ts](file:///Volumes/T7%20Shield/MockmateWebsiteT7/lib/hooks/useTestExecution.ts) to execute supported scenario tests client-side.
* [x] Bypass Piston `/api/execute` endpoint for Python and JS/TS when the browser runner supports the scenario.
* [x] Provide "Coming Soon" or fallback alerts for other programming languages.
* [x] Verify focused execution and real-world scenario tests pass.

---

## Sprint 4: AI Validation Retry Loop Fix (Completed)

We fix the interviewer chat response validation retry loop to semantically verify regenerated responses.

### 📋 Checklist & Deliverables
* [x] Update `validateWithRetry` in `lib/interview/response-validation.ts` to accept an asynchronous `generateAI` callback.
* [x] Invoke semantic evaluation recursively on the newly-regenerated replies inside the retry loop.
* [x] Clean up chat handler in [route.ts](file:///Volumes/T7%20Shield/MockmateWebsiteT7/app/api/chat/route.ts) by passing the generator callback.
* [x] Verify retry flow via automated tests.

### ⚙️ Proposed Decisions & Rationale
* **Decoupled Responses Verification**: The current retry loop regenerates responses but fails to run the semantic checks against the new output. By accepting the async generator function directly inside the loop, the validation checker recursively inspects regenerated replies, ensuring the final text matches the interview policy before outputting.

---

## Sprint 5: Bugfix UI/UX Redesign (Completed)

We migrate the file navigation in Bugfix scenarios (which use workspace execution) from a sidebar list to a horizontal tabbed interface inside the code editor to improve focus and mimic modern IDEs.

### 📋 Checklist & Deliverables
* [x] Create `constitution/bugfix/ux-flow.md` to establish strict UI and UX requirements for Bugfix scenarios.
* [x] Update `app/interview/_components/EditorColumn.tsx` to render a top-level tab bar showing all files in the `workspaceContext`.
* [x] Visually differentiate `editable`, `readonly`, and `test` file roles within the new tab bar (using icons, colors, or badges).
* [x] Update the problem panel flow to replace bugfix file navigation with brief helper text directing the user to the editor tabs.
* [x] Verify that switching tabs properly updates the editor content and retains any modified state.

### ⚙️ Proposed Decisions & Rationale
* **Tabbed Interface Over Sidebar List**: Code navigation feels most natural when integrated directly into the editor view (tabs). The current sidebar list in the chat/problem panel fragments the coding experience. By keeping all codebase files as tabs above the editor, we reduce cognitive load and replicate a standard IDE (like VS Code), which is critical for bugfix interviews where candidates must switch between the entry point, the dependency files, and tests rapidly.

---

## Sprint 6: Bugfix Constitution, Model, and QA (Completed)

We define what "real bugfix" means and enforce it with scenario metadata and validation. The goal is to make bugfix feel like incident debugging in a real codebase, not a DSA problem with a broken line.

### 📋 Checklist & Deliverables
* [x] Extend bugfix scenario metadata with incident fields: `userReport`, `observedSymptoms`, `reproductionSteps`, `visibleLogs`, `successCriteria`, `debuggingSkills`, `expectedTouchedFiles`, and `rootCauseRubric`.
* [x] Update `BugFixScenario` types to support the new metadata without breaking existing scenarios.
* [x] Add a scenario validator for bugfix quality.
* [x] Ensure default bugfix discovery only includes workspace-based real-codebase scenarios.
* [x] Hide or reclassify single-file/DSA-like bugfixes as `micro-debugging`.
* [x] Update `constitution/bugfix/ux-flow.md` with the canonical incident flow: read incident report, reproduce failure, inspect files, form hypothesis, patch minimally, verify, and explain root cause/prevention.
* [x] Add tests for the bugfix scenario validator.

### ✅ Acceptance Criteria
* Every default bugfix scenario has docs, editable files, visible tests, hidden tests, reference files, and incident metadata.
* First-screen problem text does not reveal the root cause.
* Bugfix scenarios can be audited automatically before release.

### ⚙️ Proposed Decisions & Rationale
* **Incident Metadata as Product Contract**: Bugfix realism depends on the scenario carrying enough operational context for the UI, interviewer, feedback, and recommendations to reason about debugging behavior.
* **Default Discovery Must Stay Real-Codebase Only**: Micro-debugging tasks can exist as onboarding drills, but the primary bugfix catalog should only show workspace scenarios that require navigation, reproduction, and verification.

---

## Sprint 7: Real Debugging Workspace UX (Planned)

We make the interface feel like a focused debugging workspace instead of a coding-problem page.

### 📋 Checklist & Deliverables
* [x] Add bugfix-specific problem panel sections: Incident Report, Repro Steps, Expected Behavior, Visible Logs, and Success Criteria.
* [x] Keep file navigation exclusively inside editor tabs.
* [x] Add dirty-state indicators to editable file tabs.
* [x] Preserve active file and unsaved edits across tab switches.
* [x] Add read-only enforcement for docs, tests, and support files.
* [x] Add `Reset file` for editable files.
* [x] Add `Reset workspace` for all editable files.
* [x] Improve test console states for visible test failure, hidden test failure, runtime error, syntax error, and runner/service failure.
* [x] Persist full workspace restore state: `workspaceContext`, `activeWorkspacePath`, edited file contents, test results, and console output.

### ✅ Acceptance Criteria
* Restored bugfix sessions reopen on the same active file with edits intact.
* Users cannot accidentally edit read-only/test/docs files.
* Test output tells users what failed without leaking hidden test implementation.
* Beginner users can understand where to start without reading instructions outside the flow.

### ⚙️ Proposed Decisions & Rationale
* **Incident Workspace Over Problem Statement**: The left panel should frame the incident and success criteria, while the editor remains the single source of truth for code navigation.
* **Restore Must Be Workspace-Aware**: Bugfix sessions are stateful across files, so autosave must preserve the active file and edited workspace overlay, not only the current editor string.

---

## Sprint 8: Debugging-Aware AI Interviewer and Partner (Planned)

We make the AI behave like a real interviewer in a debugging round.

### 📋 Checklist & Deliverables
* [x] Replace generic coding phases for bugfix with: Reproduce, Inspect, Hypothesize, Patch, Verify, and Prevent.
* [x] Pass structured workspace context to chat, including file path, file role, file description, active file, edited files, visible test summary, and console logs.
* [x] Replace "first 5 files" AI context selection with role-aware prioritization.
* [x] Ensure hidden files and hidden test content never enter AI context.
* [x] Update interviewer prompt behavior to ask for hypothesis before fix, ask what evidence supports the hypothesis, ask why the fix is minimal, and ask what test would prevent regression.
* [x] Update AI Partner behavior to suggest the next file/test to inspect, explain failing output, give nudges before solutions, and avoid revealing the exact fix too early.
* [x] Add tests for bugfix context builders and prompts.

### ✅ Acceptance Criteria
* Interviewer no longer treats bugfix like DSA.
* AI can reference relevant visible files and logs.
* AI does not reveal hidden tests or root cause prematurely.
* Candidate is evaluated on debugging process, not only final code.

### ⚙️ Proposed Decisions & Rationale
* **Debugging Phase Model**: Bugfix interviews should reward the candidate's investigation process, not only the final patch.
* **Role-Aware Context Selection**: AI context should prioritize active/editable files, visible tests, docs, and recent files while excluding hidden tests and irrelevant workspace noise.

---

## Sprint 9: Bugfix Scoring, Feedback, Recommendations, and Roadmap (Planned)

We make progress tracking and feedback reflect debugging skills instead of DSA patterns.

### 📋 Checklist & Deliverables
* [x] Add bugfix scoring categories: Reproduction, Codebase Navigation, Hypothesis Quality, Root Cause, Fix Quality, Verification, Prevention, and Communication.
* [x] Update feedback generation for bugfix sessions.
* [x] Include evidence in feedback: files inspected, tests run, final edited files, failing cases, passing cases, and root-cause explanation.
* [x] Add bugfix recommendation categories: async race, null safety, idempotency, mutation/reference bugs, numerical precision, auth/permissions, caching, retries, state sync, and data validation.
* [x] Extend recommendation types beyond `DSAPattern`.
* [x] Add bugfix-first recommendation primitives.
* [x] Add beginner ramp track primitives.
* [x] Remove DSA-only wording from bugfix feedback and recommendations.

### ✅ Acceptance Criteria
* Bugfix feedback gives actionable debugging advice.
* Dashboard can show debugging strengths and weaknesses.
* Recommendations can suggest bugfix work without forcing a DSA pattern.
* Passing tests alone is not enough for a perfect bugfix score.

### ⚙️ Proposed Decisions & Rationale
* **Debugging Skills Are First-Class Learning Data**: Roadmaps and recommendations should understand incident debugging skills directly instead of mapping everything back to algorithm patterns.
* **Evidence-Based Feedback**: Feedback should cite observable session evidence so users trust the score and know what to practice next.

---

## Sprint 10: Scenario Expansion, QA, and Release Polish (Planned)

We expand the scenario library and verify the full bugfix journey end to end.

### 📋 Checklist & Deliverables
* [x] Treat the current six audited real-codebase incidents as the release seed set per `migration_qs.md`; defer the 12-15 scenario expansion to a dedicated content sprint.
* [ ] Target scenario mix for the deferred content sprint: 5 easy beginner-ramp scenarios, 7 medium production-regression scenarios, and 3 hard senior-signal scenarios.
* [ ] Cover these domains: frontend state, API validation, auth/permissions, billing/webhooks, database consistency, retries/idempotency, caching, file upload, timezone/date bugs, logging/observability, and flaky async behavior.
* [ ] Add regression tests proving starter workspace fails, reference workspace passes, visible tests are useful, hidden tests stay hidden, and expected touched files are respected.
* [ ] Add Playwright smoke tests for selecting a bugfix scenario, switching tabs, editing primary file, running tests, restoring autosave, submitting, and viewing bugfix feedback.
* [x] Update `constitution/migration_tracker.md`.
* [ ] Update `constitution/migration_tracker.html` after Markdown content is finalized.

### ✅ Acceptance Criteria
* Bugfix has enough content to feel like a real product pillar.
* Beginner users have approachable debugging tasks.
* Advanced users have senior-signal production bugs.
* Release QA covers the complete bugfix loop.

### ⚙️ Proposed Decisions & Rationale
* **Beginner Ramp by Default**: The expanded library should make real-codebase debugging approachable before increasing difficulty.
* **Scenario Tests as Release Gate**: Every scenario must prove that the starter fails, the reference passes, and hidden tests stay private.

---

## Sprint 6-10 Test Plan

* [ ] Unit tests for scenario validators, bugfix phase detection, context selection, and autosave restore.
* [ ] API tests for chat context and hidden-test exclusion.
* [ ] Workspace runner tests for every bugfix scenario.
* [ ] Feedback tests for bugfix-specific scoring and copy.
* [ ] Playwright smoke tests for the core bugfix journey.

## Sprint 6-10 Assumptions

* Sprint 6-10 stays focused on bugfix platform work, not broad DSA cleanup.
* Incident debugging is the default realism style.
* Beginner ramp is the default difficulty strategy.
* Markdown is the planning source of truth; the HTML dashboard mirrors it after the Markdown content is finalized.

---

## Sprint 11: Bugfix Evidence, Scoring Algorithm, and Interview Authenticity (Planned)

We instrument the debugging journey itself so bugfix scoring reflects real interview behavior instead of only final code or visible test results. This sprint turns the researched market truth into a concrete evidence model: modern debugging interviews reward reproduction, navigation, hypothesis quality, minimal patches, verification, prevention, and healthy AI collaboration.

### 📋 Checklist & Deliverables
* [x] Add a `BugfixEvidenceEvent` model for session timeline events:
  * `session_started`
  * `incident_read`
  * `file_opened`
  * `test_or_doc_opened`
  * `hypothesis_created`
  * `file_edited`
  * `test_run`
  * `visible_failure_seen`
  * `hidden_result_received`
  * `ai_help_requested`
  * `prevention_explained`
  * `submission_created`
* [x] Add evidence summarization for reproduction before editing, files inspected, inspected tests/docs, expected touched files, verification, over-editing, root cause/prevention, and AI usage quality.
* [x] Instrument the live interview UI to emit evidence events for session start, incident read, file/test/doc opens, first edits, test runs, visible failures, AI help, hypothesis, prevention, and submission.
* [x] Add a hypothesis checkpoint before or during patching.
* [x] Capture the user's root-cause and prevention explanation at submit time.
* [x] Track AI usage quality:
  * used AI to interpret logs or choose the next inspection target
  * asked AI for the exact fix too early
  * pasted solution-like AI output without evidence
  * used AI to validate a hypothesis or regression test
* [x] Create a bugfix scoring algorithm with weighted categories:
  * Reproduction Discipline
  * Codebase Navigation
  * Evidence Gathering
  * Hypothesis Quality
  * Minimal Fix Quality
  * Verification Discipline
  * Over-Edit Control
  * Root Cause Understanding
  * Regression Prevention
  * AI Collaboration Quality
  * Communication
* [x] Feed the evidence timeline into feedback generation.
* [x] Add tests for score weighting, missing evidence penalties, over-edit penalties, AI shortcut penalties, and perfect-score edge cases.

### ✅ Acceptance Criteria
* A user cannot get a perfect bugfix score by only passing tests.
* The score can answer:
  * Did the user reproduce before editing?
  * Which files did they inspect?
  * Did they inspect tests or docs?
  * Did they form a hypothesis?
  * Did they patch the smallest area?
  * Did they run meaningful tests?
  * Did they over-edit unrelated files?
  * Did they understand prevention?
  * Did they use AI as a partner or as a shortcut?
* Feedback cites observable evidence from the session timeline.
* Hidden tests and hidden root-cause information never appear in scoring evidence shown to the user.
* Bugfix scoring is contextual: easy incidents weight guidance and reproduction more heavily, senior incidents weight hypothesis, minimality, and prevention more heavily.

### ⚙️ Proposed Decisions & Rationale
* **Evidence Before Opinion**: Bugfix feedback should be grounded in observable events so users trust the score and know exactly what to improve.
* **Process Is the Product**: In real debugging interviews, the interviewer evaluates how the candidate investigates under uncertainty, not only whether they eventually patch the code.
* **AI Collaboration as a Skill**: In the AI-era interview market, using AI well is a signal. Sprint 11 should score whether AI was used to sharpen investigation rather than bypass reasoning.

---

## Sprint 12: Bugfix Learning Loop, Recommendations, and Product Positioning (Planned)

We turn the evidence-based bugfix score into a learning system and a clear business-facing product pillar. The platform should communicate that bugfix is real-codebase debugging practice, not a DSA variant.

### 📋 Checklist & Deliverables
* [x] Add a dedicated Bugfix Readiness Score separate from DSA readiness.
* [x] Add a debugging skill profile model:
  * Reproduction
  * Navigation
  * Evidence Gathering
  * Hypothesis
  * Minimal Fix
  * Verification
  * Prevention
  * AI Collaboration
  * Communication
* [x] Extend recommendation types so bugfix recommendations are not forced through `DSAPattern`.
* [x] Add bugfix-first recommendation tracks:
  * Beginner Debugger
  * Frontend Regression Debugging
  * Backend/API Debugging
  * Data, Date, and Time Bugs
  * Distributed Systems Debugging
  * AI-Assisted Debugging
* [x] Add post-session report sections:
  * final diff
  * files inspected
  * tests/docs/logs inspected
  * tests run
  * root cause
  * minimality assessment
  * prevention idea
  * next recommended incident
* [x] Add practice mode vs interview mode:
  * Practice mode gives nudges, next-file suggestions, and scaffolded hypothesis prompts.
  * Interview mode withholds direct help and scores the user under realistic pressure.
* [x] Update dashboard/practice copy away from DSA-first language for bugfix surfaces.
* [x] Add analytics for bugfix product health:
  * bugfix start rate
  * completion rate
  * time to first reproduction
  * time to first edit
  * first inspected file role
  * visible-to-hidden failure rate
  * over-edit rate
  * AI shortcut rate
  * repeat bugfix practice conversion
* [x] Add beginner ramp UX that recommends easier incidents when evidence shows weak reproduction or navigation habits.
* [x] Add tests for recommendation mapping and report generation.

### ✅ Acceptance Criteria
* Dashboard can show debugging strengths and weaknesses without translating them into DSA patterns.
* The next recommended activity is based on actual bugfix evidence, not only scenario completion.
* Users receive a practical report that feels like a real interviewer debrief.
* Bugfix has a clear product promise: real codebase debugging practice for modern interviews.

### ⚙️ Proposed Decisions & Rationale
* **Learning Loop Over Content Library**: More scenarios help, but the business value comes from showing users what their debugging behavior says about readiness.
* **Two Modes, Two Jobs**: Practice mode teaches the workflow; interview mode measures readiness. Mixing them makes feedback less trustworthy.
* **Bugfix as a Pillar**: Product surfaces should position bugfix as a first-class reason to use the platform, especially for users tired of DSA-only prep.

---

## Sprint 13: Market QA, Scenario Governance, and Release Packaging (Planned)

We harden the bugfix pillar for release by adding governance, QA, and packaging that matches the market bar set by real-codebase interview tools.

### 📋 Checklist & Deliverables
* [x] Add scenario quality audit rows for bugfix incidents:
  * incident metadata completeness
  * starter workspace fails
  * reference workspace passes
  * visible tests are useful
  * hidden tests stay hidden
  * expected touched files are respected
  * first-screen text does not reveal root cause
* [x] Add scenario taxonomy and tags for marketable bugfix categories:
  * async race
  * null safety
  * idempotency
  * caching
  * auth/permissions
  * data validation
  * date/time
  * database consistency
  * retries
  * observability
  * frontend state
* [x] Add release QA scripts that audit every default bugfix scenario before deploy.
* [x] Add Playwright coverage for the evidence-driven bugfix journey:
  * open incident
  * inspect docs/tests
  * create hypothesis
  * edit file
  * run visible tests
  * submit
  * view evidence-based feedback
  * restore session
* [x] Add copy and packaging updates for bugfix-first surfaces:
  * Real Codebase Debugging
  * Production Incident Practice
  * AI-Era Debugging Interview Prep
* [x] Add a bugfix onboarding sample incident that demonstrates the full loop in under 10 minutes.
* [x] Add guardrails so DSA drills, micro-debugging drills, and real-codebase bugfix incidents are clearly separated in discovery.
* [x] Add release metrics and monitoring event names for the bugfix funnel.
* [x] Add the dedicated `app/admin/bugfix-quality` admin surface per `migration_qs.md`.

### ✅ Acceptance Criteria
* Bugfix scenarios can be audited before release without manual spot-checking every file.
* Users can distinguish real-codebase incidents from micro-debugging drills.
* The complete bugfix journey is covered by smoke tests and evidence assertions.
* The product can honestly market bugfix as a modern interview-prep pillar, not an experimental exercise type.

### ⚙️ Proposed Decisions & Rationale
* **Governance Keeps Realism From Decaying**: As the library grows, automated audits prevent scenarios from slipping back into single-file or root-cause-revealing exercises.
* **Release Packaging Matters**: The market already contains real-codebase assessment tools. CodeSparring's edge should be the candidate-learning version: guided practice, AI interviewer pressure, evidence-based feedback, and a readiness loop.
* **Micro-Debugging Has a Place**: Small bug drills are useful for onboarding, but they must be labeled differently so the default bugfix promise stays grounded in real codebase practice.

---

## Sprint 11-13 Test Plan

* [ ] Unit tests for evidence-event capture, score weighting, score normalization, and missing-evidence penalties.
* [ ] API tests proving hidden tests and root-cause rubric fields are excluded from AI/chat/feedback display contexts.
* [ ] Feedback tests proving bugfix reports cite files inspected, tests run, edited files, and prevention explanation.
* [ ] Recommendation tests proving bugfix weakness categories map to bugfix incidents instead of DSA patterns.
* [ ] Analytics tests proving bugfix evidence events are emitted once and do not leak code contents.
* [ ] Playwright tests for the full evidence-driven bugfix flow.

## Sprint 11-13 Assumptions

* Sprint 11-13 extends Sprint 6-10 rather than replacing it.
* The scoring algorithm should be transparent enough for user trust but not reveal hidden tests or exact scenario rubrics.
* Practice mode may provide more guidance than interview mode, but both modes must preserve the same incident realism.
* Bugfix remains the platform's primary real-codebase experience; DSA cleanup is only in scope when it prevents bugfix-first UX.

---

## Sprint 14: Production Hardening & Code Health (Planned)

We make the platform safe to ship by adding E2E tests, error monitoring, and breaking apart oversized files. No new features — pure reliability and maintainability.

### 📋 Checklist & Deliverables
* [ ] Install Playwright and configure E2E test infrastructure (project config, CI integration, test fixtures).
* [ ] Write E2E tests for the auth flow: sign-up, login, OAuth callback, logout, session persistence.
* [ ] Write E2E tests for the billing flow: free-to-Pro checkout, Stripe webhook processing, subscription sync, customer portal redirect.
* [ ] Write E2E tests for the core interview loop: start session, chat with AI, execute code, run tests, submit, view feedback.
* [ ] Write E2E tests for session management: autosave, restore, session history.
* [ ] Integrate Sentry (or equivalent) for error monitoring with source maps and user context.
* [ ] Wire feature flags to Firebase Remote Config or Vercel Edge Config for runtime toggling without deploys.
* [ ] Add health check monitoring and uptime alerting for critical API routes (chat, execute, checkout, webhook).

### ✅ Acceptance Criteria
* Playwright runs against a local dev server and catches regressions in auth, billing, and core interview flows.
* Production errors are captured with stack traces, user context, and breadcrumbs.
* Feature flags can be toggled remotely without redeployment.

### ⚙️ Proposed Decisions & Rationale
* **E2E Before Features**: Shipping new features on an untested billing flow risks revenue loss from silent breakages. Playwright on checkout and auth is the highest-ROI test investment.
* **Refactor Now, Not Later**: The 193KB interview page is the most-edited file in the codebase. Every sprint that adds bugfix features to it compounds the maintenance debt.

---

## Sprint 15: Ship the Bugfix Differentiator (Planned)

We finish the incomplete Sprint 8, 9, and 11 work to make the bugfix pillar fully end-to-end. This is CodeSparring's core competitive advantage — real-codebase debugging practice — and it must be shippable.

### 📋 Checklist & Deliverables
* [x] Complete Sprint 8: replace generic coding phases for bugfix with Reproduce, Inspect, Hypothesize, Patch, Verify, Prevent.
* [x] Complete Sprint 8: update interviewer prompt behavior to ask for hypothesis before fix, ask what evidence supports it, ask why the fix is minimal, ask what test prevents regression.
* [x] Complete Sprint 8: update AI Partner behavior to suggest next file/test to inspect, explain failing output, give nudges before solutions, avoid revealing the fix too early.
* [x] Complete Sprint 11: instrument the live interview UI to emit every evidence event that is locally observable in the current app.
* [x] Complete Sprint 11: add hypothesis checkpoint capture before or during patching.
* [x] Complete Sprint 11: capture root-cause and prevention explanation at submit time.
* [x] Complete Sprint 11: feed the evidence timeline into feedback generation.
* [x] Complete Sprint 9: update feedback generation for bugfix sessions.
* [x] Complete Sprint 9: include evidence in feedback (files inspected, tests run, edited files, root-cause explanation).
* [x] Complete Sprint 9: remove DSA-only wording from bugfix feedback and recommendations.
* [x] Build the bugfix onboarding sample incident (<10 min demo, Sprint 13 gap).
* [x] Complete Sprint 12: update dashboard/practice copy away from DSA-first language for bugfix surfaces.
* [x] Complete Sprint 12: add beginner ramp UX for users with weak reproduction/navigation habits.
* [x] Write Playwright E2E test for the full evidence-driven bugfix journey (Sprint 13 gap).
* [x] Smoke test bugfix end-to-end: select incident → inspect → hypothesize → patch → run tests → submit → view evidence-based feedback.

### ✅ Acceptance Criteria
* A user can complete a full bugfix session where the AI interviewer evaluates their debugging process, not just their final code.
* Feedback cites observable evidence (files opened, tests run, hypothesis quality).
* Bugfix scoring penalizes skipping reproduction, over-editing, and AI shortcutting.
* The bugfix onboarding incident is completable in under 10 minutes.
* All bugfix gaps from Sprints 7-13 are resolved.

### ⚙️ Proposed Decisions & Rationale
* **Consolidate All Bugfix Debt Into One Sprint**: Scattered incomplete items across Sprints 7-13 create confusion about what's actually shippable. Sprint 15 closes every bugfix gap in one focused push.
* **Bugfix Is the Launch Differentiator**: Competitor analysis shows no consumer platform offers AI interviewer + real code execution + evidence-based debugging scoring. This is what makes CodeSparring worth talking about.

---

## Sprint 16: Pricing, Monetization & Free Tier Optimization (Planned)

We adjust pricing based on competitive analysis and optimize the free tier for product-led growth. The goal is to undercut LeetCode Premium ($159/yr) while offering more value, and to make the free tier generous enough to build habits.

### Market Context
* LeetCode Premium: $159/yr. AlgoExpert: $99-$199/yr. NeetCode Pro: $119/yr.
* Current CodeSparring pricing ($25/mo, $225/yr) is above market without brand recognition.
* The proven consumer sweet spot is $10-$20/mo effective price billed annually.
* NeetCode's $349 lifetime tier drives conversions from price-sensitive committed users.

### 📋 Checklist & Deliverables
* [ ] Update `lib/config.ts` pricing: Pro Monthly from $25/mo → $19/mo.
* [ ] Update `lib/config.ts` pricing: Pro Annual from $225/yr ($19/mo) → $149/yr (~$12.50/mo).
* [ ] Add Lifetime tier to `PRICING_CONFIG`: $349 one-time payment, same features as Pro, no renewal.
* [x] Update free tier: `sessionsPerMonth` from 2 → 8 (2 per week).
* [ ] Create new Stripe price objects in Stripe dashboard for $19/mo, $149/yr, $349 lifetime.
* [ ] Update `.env` with new Stripe price IDs (`STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_YEARLY_PRICE_ID`, `STRIPE_PRO_LIFETIME_PRICE_ID`).
* [ ] Update `app/api/create-checkout/route.ts` to handle the new price IDs and lifetime as a one-time payment mode.
* [ ] Update `app/api/webhook/stripe/route.ts` to handle lifetime purchase events (one-time payment, no recurring subscription).
* [ ] Update `lib/stripe-helpers.ts` to recognize lifetime subscribers (no expiry, no renewal).
* [ ] Update `lib/quota-enforcement.ts` to treat lifetime as equivalent to Pro with no expiry check.
* [ ] Update `lib/pricing.ts` with new tier data and lifetime plan metadata.
* [ ] Update `lib/firestore-helpers.ts` to store and recognize `lifetime` subscription type.
* [ ] Update pricing page UI (`app/pricing/page.tsx`) with new prices, lifetime card, and savings callouts.
* [ ] Update landing page pricing section with new prices.
* [ ] Update upgrade flow and CTAs throughout the app.
* [ ] Grandfather existing subscribers at their current rate (add migration logic for active subscriptions).
* [ ] Update all tests referencing old prices (`quota-enforcement.test.ts` assertions).
* [ ] A/B test pricing page layout (if feature flag infrastructure from Sprint 14 is ready).

### Migration Note
* The local free-tier quota and related copy are updated to 8 sessions/month.
* Stripe price changes, lifetime checkout, env price IDs, webhook lifetime handling, and grandfathering are left open pending dashboard/env work; see `constitution/newQs.md`.

### ✅ Acceptance Criteria
* New users see $19/mo, $149/yr, $349 lifetime pricing.
* Existing subscribers are not disrupted (grandfathered).
* Free users get 2 sessions/week (8/month) tracked correctly in quota enforcement.
* Lifetime purchases are processed as one-time Stripe payments and grant permanent Pro access.
* All billing E2E tests pass with new pricing.

### ⚙️ Proposed Decisions & Rationale
* **Undercut LeetCode, Not Race to Bottom**: At $149/yr we're below LeetCode Premium ($159/yr) while offering AI interviewer, spaced repetition, and roadmaps they don't have. This is a value positioning play.
* **Lifetime Drives Committed Conversions**: NeetCode proves $349 lifetime converts price-sensitive users who would otherwise churn on monthly. The LTV trade-off is acceptable at this stage — each lifetime user is a walking referral source.
* **Free Tier Generosity Builds Habits**: 2 sessions/month is too restrictive to form a practice habit. 2/week lets users experience enough value to hit the "aha moment" before converting. This is the product-led growth engine.

---

## Sprint 17: Social Proof & Conversion Optimization (Planned)

We add the trust signals and conversion mechanisms that turn visitors into users and users into paying customers. Currently the platform has zero social proof — no testimonials, no user counts, no urgency signals.

### 📋 Checklist & Deliverables
* [ ] Build a testimonial collection system: post-session NPS follow-up asking for a quote (leverage existing NPS system).
* [ ] Add testimonial display component to landing page and pricing page.
* [ ] Add live activity signals to landing page: "X people practiced this week", "Y sessions completed today" (pulled from Firestore analytics).
* [ ] Build shareable session result cards (image generation): score, pattern, time — user can share to Twitter/LinkedIn/Reddit.
* [ ] Create comparison landing pages (SEO): "CodeSparring vs LeetCode", "CodeSparring vs AlgoExpert", "CodeSparring vs NeetCode", "CodeSparring vs interviewing.io".
* [ ] Add "success story" case study template page and publish 2-3 early user stories (even if they're beta testers).
* [ ] Add smart upgrade prompts at natural friction points:
  * After receiving strong feedback ("You scored 85% — unlock spaced repetition to retain this")
  * When hitting free session quota ("You've used 2 of 2 sessions this week")
  * After 3rd session ("You've completed 3 sessions — see your progress trend with Pro")
* [ ] Implement annual plan switch incentive: modal showing per-month savings when monthly subscribers hit month 3.
* [ ] Activate referral program with tracking dashboard for referrers and automated reward fulfillment.
* [ ] Add urgency/scarcity signal for lifetime tier: "Introductory price — limited time" badge.

### ✅ Acceptance Criteria
* Landing page displays at least placeholder testimonials and live activity count.
* Comparison pages rank for "[competitor] alternative" search queries.
* Upgrade prompts appear at natural friction points without being annoying (max 1 per session).
* Shareable result cards generate correctly and include CodeSparring branding.
* Referral program tracks invites, sign-ups, and conversions end-to-end.

### ⚙️ Proposed Decisions & Rationale
* **Social Proof Is Table Stakes**: Every successful competitor (AlgoExpert, NeetCode, LeetCode) prominently displays user counts, testimonials, and FAANG logos. Launching without this is leaving conversions on the table.
* **Comparison Pages Are High-Intent SEO**: People searching "LeetCode alternative" or "AlgoExpert vs NeetCode" are actively evaluating products. These pages convert at 3-5x normal blog traffic.
* **Upgrade Prompts at Value Moments**: Prompting after a user receives great feedback (not randomly) ties the upgrade to demonstrated value.

---

## Sprint 18: Onboarding, Activation & Retention (Planned)

We engineer the first-session experience to maximize the "aha moment" and build retention loops that reduce churn. Currently there is no guided onboarding — users land on the dashboard cold.

### 📋 Checklist & Deliverables
* [ ] Build guided first-session experience:
  * Step 1: Choose your track (DSA, Bugfix, System Design)
  * Step 2: Quick problem selection (curated easy problem or bugfix onboarding incident)
  * Step 3: AI interview with coaching prompts ("Try explaining your approach out loud")
  * Step 4: Get feedback with explanations of what each score means
  * Step 5: See your improvement path (roadmap preview)
* [ ] Track activation metrics: % of sign-ups who complete 1 full session within 24 hours.
* [ ] Add re-engagement email sequence:
  * Day 1: Welcome + "complete your first session" CTA
  * Day 3: "Here's what you'll learn" + problem recommendation
  * Day 7: "Most users who land offers practice 3x/week"
  * Day 14: "Your retention is dropping — here's your review schedule" (if inactive)
* [ ] Implement streak/consistency gamification on dashboard:
  * Daily practice streak counter
  * Weekly practice goal (sessions completed / target)
  * Streak recovery: miss 1 day without losing streak (freeze)
* [ ] Activate spaced repetition reminder emails (templates already built in `lib/email/templates.ts` — needs activation, scheduling, and testing).
* [ ] Build churn prevention flows:
  * Exit survey when canceling (capture reason)
  * Pause subscription option (1 month pause instead of cancel)
  * Win-back email 7 days after cancellation with limited-time discount
* [ ] Implement "interview countdown" activation: users set their interview date, dashboard shows countdown with urgency-based practice recommendations.

### ✅ Acceptance Criteria
* New users who complete onboarding have a >60% session completion rate within first visit.
* Streak counter displays correctly and handles timezone edge cases.
* Spaced repetition emails fire on schedule and link directly to the recommended review problem.
* Cancellation flow captures churn reason and offers pause as an alternative.
* Interview countdown drives urgency-based email cadence.

### ⚙️ Proposed Decisions & Rationale
* **Onboarding Is a Conversion Event**: The gap between sign-up and first completed session is where most users are lost. A guided experience eliminates decision paralysis.
* **Streaks Work**: NeetCode, Duolingo, and LeetCode all use streaks because they drive daily habit formation. The freeze mechanic prevents frustration.
* **Pause > Cancel**: Offering a pause option at cancellation time retains users who are between interview cycles. They come back when job hunting resumes.

---

## Sprint 19: Content Velocity & SEO Growth (Planned)

We scale the content engine to drive organic search traffic and establish CodeSparring as a thought leader in modern interview prep. Currently 14 blog posts — this sprint aims to build the pipeline for sustained content production.

### 📋 Checklist & Deliverables
* [ ] Publish 10+ high-SEO blog posts targeting:
  * "AI coding interview preparation 2026"
  * "How to practice debugging interviews"
  * "[Company] coding interview guide 2026" (Google, Meta, Amazon, Apple, Microsoft, Stripe, etc.)
  * "LeetCode alternatives 2026"
  * "System design interview preparation"
  * "Bugfix interview questions and answers"
  * "How companies are changing coding interviews with AI"
  * "Spaced repetition for coding interviews"
* [ ] Create free "CodeSparring 50" roadmap landing page (curated 50-problem set like NeetCode 75) — captures high-intent organic traffic.
* [ ] Build an "Interview Formats by Company" hub page linking to all company prep pages.
* [ ] Add structured FAQ schema to key landing pages for Google rich snippets.
* [ ] Create a "Modern Interview Prep Guide" long-form pillar page (3,000+ words) covering DSA, system design, bugfix, behavioral, and AI collaboration — links to all other content.
* [ ] Set up automated SEO monitoring: track keyword rankings, organic traffic, and top-performing pages.
* [ ] Add "Related Problems" and "Next Steps" sections to sample feedback pages to improve internal linking and time-on-site.
* [ ] Optimize page load performance: audit Core Web Vitals (LCP, INP, CLS) on all marketing pages and fix issues.

### ✅ Acceptance Criteria
* Total blog posts exceed 24 with a clear publishing calendar for ongoing production.
* "CodeSparring 50" roadmap page is live and captures email sign-ups from organic traffic.
* FAQ schema appears in Google Search Console as eligible for rich results.
* Core Web Vitals pass on all marketing pages (green on PageSpeed Insights).

### ⚙️ Proposed Decisions & Rationale
* **SEO Is the Long Game**: Competitors like Educative drive 70%+ of traffic from organic search. Blog content compounds — posts written now drive traffic for years.
* **"CodeSparring 50" Is a Growth Hack**: NeetCode 75 is one of the most-searched interview prep terms. A curated, opinionated problem set becomes a viral reference that drives sign-ups.
* **Pillar Content Strategy**: One comprehensive guide linking to many specific pages creates a content hub that Google rewards with topical authority.

---

## Sprint 20: Distribution Channels & Community Foundation (Planned)

We build distribution channels beyond the website. The VS Code extension, Chrome extension, and community infrastructure are future growth engines that compound over time. Discord and YouTube are deferred to post-user-acquisition — this sprint builds the scaffolding.

### 📋 Checklist & Deliverables
* [ ] Build VS Code extension MVP:
  * Problem browser panel showing available scenarios
  * Quick-launch button opening CodeSparring web in a panel or browser
  * Daily practice reminder notification
  * Session status display (streak, next review)
  * Publish to VS Code Marketplace
* [ ] Build Chrome extension MVP:
  * Practice reminder badge/notification (configurable frequency)
  * Quick-launch popup to start a session
  * "Practice this pattern" context menu on LeetCode/GitHub code
  * Publish to Chrome Web Store
* [ ] Set up Discord server structure (ready to open when user base reaches ~100 active users):
  * Channels: general, introductions, dsa-help, bugfix-help, system-design, interview-stories, feedback
  * Pro-only channels: study-groups, mock-partner-matching
  * Bot: daily problem suggestion, streak leaderboard
* [ ] Set up YouTube channel and branding (ready for content when founder is available):
  * Channel art, description, playlists structure
  * Record 3 pilot videos: product demo, "How I'd solve this bugfix", "Why LeetCode isn't enough anymore"
  * Add YouTube links to blog posts and landing page
* [ ] Implement affiliate/referral tracking for content creators:
  * Unique referral codes with custom commission rates
  * Dashboard showing clicks, sign-ups, conversions, payouts
  * API endpoint for affiliate stats
* [ ] Add "Share to Twitter/LinkedIn/Reddit" buttons on feedback pages and blog posts.

### ✅ Acceptance Criteria
* VS Code extension installs from Marketplace and opens CodeSparring sessions.
* Chrome extension shows practice reminders and launches sessions.
* Discord server is structured and ready to open (invite link ready, not publicly listed yet).
* YouTube channel is branded and has 3 pilot videos uploaded (can be unlisted initially).
* Affiliate system tracks end-to-end from click to conversion.

### ⚙️ Proposed Decisions & Rationale
* **Extensions Are Distribution, Not Features**: VS Code has 30M+ users. A well-placed extension gets organic installs from developers who never visited the website. The MVP is a launcher + reminder, not a full IDE.
* **Build Community Infrastructure Before You Need It**: Setting up Discord and YouTube channels now means they're ready when early users start arriving. Scrambling to set up community tools while onboarding users is chaotic.
* **Defer Community Activation**: With 0 active users, an empty Discord is worse than no Discord. The structure is built but the invite link is held until ~100 active users provide enough activity to sustain conversation.

---

## Sprint 21: Enterprise Foundation & Future Positioning (Planned)

We build the foundation for enterprise revenue and future competitive positioning. This sprint is about planting seeds — not launching an enterprise product, but having the technical foundations ready when inbound demand arrives.

### 📋 Checklist & Deliverables
* [ ] Build team/organization account model in Firestore:
  * Organization document with members, billing, and admin roles
  * Team billing: single payment for multiple seats
  * Team progress dashboard: admin can see all members' readiness scores
* [ ] Add SSO/SAML foundation:
  * SAML login flow with Firebase Auth custom provider
  * Organization-level auth policy (require SSO for org members)
* [ ] Build "AI Collaboration Interview" mode:
  * Candidate + AI pair-program on a real problem
  * AI provides suggestions, candidate evaluates, accepts, or modifies
  * Scoring evaluates: AI collaboration quality, critical thinking, validation discipline
  * Positioned for the "vibe coding" interview format trend
* [ ] Expand system design scenarios (add 5+ modern scenarios):
  * RAG architecture design
  * Vector database design
  * Multi-agent system design
  * Real-time notification system
  * AI-powered search system
* [ ] Build public API foundation for B2B assessment integration:
  * API key management
  * Assessment creation endpoint
  * Results webhook
  * Rate limiting and usage tracking
* [ ] Add "Enterprise" contact form and qualification flow on the enterprise pricing section.
* [ ] Build assessment export: generate PDF reports of user readiness for hiring managers or bootcamp partners.

### ✅ Acceptance Criteria
* Organizations can be created with multiple members under one billing account.
* SSO/SAML flow works end-to-end for at least one test IdP (Okta or Azure AD).
* AI Collaboration mode produces meaningful scores that differentiate "uses AI well" from "copies AI blindly".
* System design scenarios cover AI-era architectures that no competitor currently offers.
* Assessment API can create and return results for a basic coding assessment.

### ⚙️ Proposed Decisions & Rationale
* **Enterprise Is a Revenue Multiplier**: HackerRank charges $165-$375+/mo per seat. CodeSignal's starter is $19K/yr. Even a small enterprise tier at $50/seat/mo is a meaningful revenue stream.
* **AI Collaboration Interview Is the Future**: Google, Meta, and Canva now allow AI during interviews. No consumer platform trains candidates for this format. Building it now positions CodeSparring as the first mover.
* **Modern System Design Wins Senior Users**: RAG, vector search, and multi-agent architectures are what senior engineers actually build. Competitors still offer "design a URL shortener" — CodeSparring can own the 2026 system design question set.

---

## Sprint 14-21 Test Plan

* [ ] Playwright E2E tests for: auth flow, billing flow, core interview loop, bugfix journey, session restore, onboarding flow, upgrade/checkout, referral tracking.
* [ ] Unit tests for: new pricing tiers, lifetime subscription handling, quota enforcement with 8 sessions/month free, streak calculation, activation metrics, team/org billing.
* [ ] API tests for: affiliate tracking, assessment API, enterprise SSO, lifetime webhook handling.
* [ ] Performance tests for: Core Web Vitals on marketing pages, interview page load time after refactor.
* [ ] SEO validation for: structured data, sitemap completeness, comparison pages metadata.

## Sprint 14-21 Assumptions

* Sprint 14-21 runs in parallel with any remaining Sprint 7-13 cleanup. Sprint 15 explicitly consolidates all bugfix gaps.
* Pricing changes require creating new Stripe price objects in the Stripe dashboard before deploying code changes.
* Lifetime tier uses Stripe one-time payment mode, not subscription mode.
* Free tier sessions are tracked weekly (2 per week = 8 per month) using the existing monthly quota reset logic — implementation may need a weekly reset counter.
* Discord and YouTube are built but not publicly launched until user base reaches ~100 active users.
* Enterprise features are foundation-only — no enterprise sales, marketing, or support commitment until consumer traction is proven.
* The interview page refactor in Sprint 14 follows the dedicated plan in [refactorPlan.md](file:///Volumes/T7%20Shield/MockmateWebsiteT7/constitution/refactorPlan.md).
