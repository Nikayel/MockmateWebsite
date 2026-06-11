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

## Sprint 2: Python Browser Sandboxing (Planned)

Python execution is moved to the client by running Pyodide compiled to WebAssembly.

### 📋 Checklist & Deliverables
* [ ] Create `public/workers/python-sandbox-worker.js` loading Pyodide from jsDelivr CDN.
* [ ] Intercept Pyodide stdout and stderr buffers to redirect prints to console logs.
* [ ] Create `lib/workspace-execution/browser-python-runner.ts` to manage worker execution lifecycle and timeouts.
* [ ] Support Python-specific comment stripping and template wrapping (ListNode, TreeNode helpers).
* [ ] Add Pyodide downloading / initialization console feedback hooks.
* [ ] Write unit tests to verify the sandbox.

### ⚙️ Proposed Decisions & Rationale
* **Persistent Worker Instance**: Loading and initiating Pyodide WebAssembly takes ~2 seconds. To prevent this lag on every execute request, we will keep a persistent singleton Worker thread alive. Subsequent runs are near-instant (~20ms). If a loop hangs, we call `worker.terminate()` and reset the reference.

---

## Sprint 3: Main Execution Router Integration (Planned)

We integrate the sandboxed runners into the main user workspace flow, replacing backend Piston execution.

### 📋 Checklist & Deliverables
* [ ] Update `useCodeExecution` hook in [useCodeExecution.ts](file:///Volumes/T7%20Shield/MockmateWebsiteT7/lib/hooks/useCodeExecution.ts) to direct JS/TS and Python runs to the browser-js-runner and browser-python-runner.
* [ ] Update `useTestExecution` hook in [useTestExecution.ts](file:///Volumes/T7%20Shield/MockmateWebsiteT7/lib/hooks/useTestExecution.ts) to execute workspace scenario tests client-side.
* [ ] Bypass Piston `/api/execute` endpoint for Python and JS/TS.
* [ ] Provide "Coming Soon" or fallback alerts for other programming languages.
* [ ] Verify all scenario tests pass.

---

## Sprint 4: AI Validation Retry Loop Fix (Planned)

We fix the interviewer chat response validation retry loop to semantically verify regenerated responses.

### 📋 Checklist & Deliverables
* [ ] Update `validateWithRetry` in `lib/interview/response-validation.ts` to accept an asynchronous `generateAI` callback.
* [ ] Invoke semantic evaluation recursively on the newly-regenerated replies inside the retry loop.
* [ ] Clean up chat handler in [route.ts](file:///Volumes/T7%20Shield/MockmateWebsiteT7/app/api/chat/route.ts) by passing the generator callback.
* [ ] Verify retry flow via automated tests.

### ⚙️ Proposed Decisions & Rationale
* **Decoupled Responses Verification**: The current retry loop regenerates responses but fails to run the semantic checks against the new output. By accepting the async generator function directly inside the loop, the validation checker recursively inspects regenerated replies, ensuring the final text matches the interview policy before outputting.

---

## Sprint 5: Bugfix UI/UX Redesign (Planned)

We migrate the file navigation in Bugfix scenarios (which use workspace execution) from a sidebar list to a horizontal tabbed interface inside the code editor to improve focus and mimic modern IDEs.

### 📋 Checklist & Deliverables
* [ ] Create `constitution/bugfix/ux-flow.md` to establish strict UI and UX requirements for Bugfix scenarios.
* [ ] Update `app/interview/_components/EditorColumn.tsx` to render a top-level tab bar showing all files in the `workspaceContext`.
* [ ] Visually differentiate `editable`, `readonly`, and `test` file roles within the new tab bar (using icons, colors, or badges).
* [ ] Update `app/interview/_components/ProblemPanel.tsx` to remove the old "Workspace Files" list and replace it with brief helper text directing the user to the editor tabs.
* [ ] Verify that switching tabs properly updates the editor content and retains any modified state.

### ⚙️ Proposed Decisions & Rationale
* **Tabbed Interface Over Sidebar List**: Code navigation feels most natural when integrated directly into the editor view (tabs). The current sidebar list in the chat/problem panel fragments the coding experience. By keeping all codebase files as tabs above the editor, we reduce cognitive load and replicate a standard IDE (like VS Code), which is critical for bugfix interviews where candidates must switch between the entry point, the dependency files, and tests rapidly.

---

## Sprint 6: Bugfix Constitution, Model, and QA (Planned)

We define what "real bugfix" means and enforce it with scenario metadata and validation. The goal is to make bugfix feel like incident debugging in a real codebase, not a DSA problem with a broken line.

### 📋 Checklist & Deliverables
* [ ] Extend bugfix scenario metadata with incident fields: `userReport`, `observedSymptoms`, `reproductionSteps`, `visibleLogs`, `successCriteria`, `debuggingSkills`, `expectedTouchedFiles`, and `rootCauseRubric`.
* [ ] Update `BugFixScenario` types to support the new metadata without breaking existing scenarios.
* [ ] Add a scenario validator for bugfix quality.
* [ ] Ensure default bugfix discovery only includes workspace-based real-codebase scenarios.
* [ ] Hide or reclassify single-file/DSA-like bugfixes as `micro-debugging`.
* [ ] Update `constitution/bugfix/ux-flow.md` with the canonical incident flow: read incident report, reproduce failure, inspect files, form hypothesis, patch minimally, verify, and explain root cause/prevention.
* [ ] Add tests for the bugfix scenario validator.

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
* [ ] Add bugfix-specific problem panel sections: Incident Report, Repro Steps, Expected Behavior, Visible Logs, and Success Criteria.
* [ ] Keep file navigation exclusively inside editor tabs.
* [ ] Add dirty-state indicators to editable file tabs.
* [ ] Preserve active file and unsaved edits across tab switches.
* [ ] Add read-only enforcement for docs, tests, and support files.
* [ ] Add `Reset file` for editable files.
* [ ] Add `Reset workspace` for all editable files.
* [ ] Improve test console states for visible test failure, hidden test failure, runtime error, syntax error, and runner/service failure.
* [ ] Persist full workspace restore state: `workspaceContext`, `activeWorkspacePath`, edited file contents, test results, and console output.

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
* [ ] Replace generic coding phases for bugfix with: Reproduce, Inspect, Hypothesize, Patch, Verify, and Prevent.
* [ ] Pass structured workspace context to chat, including file path, file role, file description, active file, recently opened files, edited files, visible test summary, and console logs.
* [ ] Replace "first 5 files" AI context selection with role-aware prioritization.
* [ ] Ensure hidden files and hidden test content never enter AI context.
* [ ] Update interviewer prompt behavior to ask for hypothesis before fix, ask what evidence supports the hypothesis, ask why the fix is minimal, and ask what test would prevent regression.
* [ ] Update AI Partner behavior to suggest the next file/test to inspect, explain failing output, give nudges before solutions, and avoid revealing the exact fix too early.
* [ ] Add tests for bugfix context builders and prompts.

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
* [ ] Add bugfix scoring categories: Reproduction, Codebase Navigation, Hypothesis Quality, Root Cause, Fix Quality, Verification, Prevention, and Communication.
* [ ] Update feedback generation for bugfix sessions.
* [ ] Include evidence in feedback: files inspected, tests run, final edited files, failing cases, passing cases, and root-cause explanation.
* [ ] Add bugfix recommendation categories: async race, null safety, idempotency, mutation/reference bugs, numerical precision, auth/permissions, caching, retries, state sync, and data validation.
* [ ] Extend recommendation types beyond `DSAPattern`.
* [ ] Add bugfix-first recommendations to dashboard/practice surfaces.
* [ ] Add beginner ramp track: Quick Investigation, Guided Incident, Production Regression, and Senior Debugging.
* [ ] Remove DSA-only wording from bugfix feedback and recommendations.

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
* [ ] Add 12-15 new incident-style bugfix scenarios.
* [ ] Target scenario mix: 5 easy beginner-ramp scenarios, 7 medium production-regression scenarios, and 3 hard senior-signal scenarios.
* [ ] Cover these domains: frontend state, API validation, auth/permissions, billing/webhooks, database consistency, retries/idempotency, caching, file upload, timezone/date bugs, logging/observability, and flaky async behavior.
* [ ] Add regression tests proving starter workspace fails, reference workspace passes, visible tests are useful, hidden tests stay hidden, and expected touched files are respected.
* [ ] Add Playwright smoke tests for selecting a bugfix scenario, switching tabs, editing primary file, running tests, restoring autosave, submitting, and viewing bugfix feedback.
* [ ] Update `constitution/migration_tracker.md`.
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
* [ ] Add a `BugfixEvidenceEvent` model for session timeline events:
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
* [ ] Track whether the user reproduced the failure before editing.
* [ ] Track which files the user inspected, including sequence, role, and time spent.
* [ ] Track whether the user inspected visible tests, docs, logs, or support files.
* [ ] Add a hypothesis checkpoint before or during patching.
* [ ] Track whether the patch touched the smallest expected area using `expectedTouchedFiles`.
* [ ] Track meaningful verification: visible tests run, repeated test runs, changed failure output, and final pass/fail state.
* [ ] Detect over-editing of unrelated editable files.
* [ ] Capture the user's root-cause and prevention explanation at submit time.
* [ ] Track AI usage quality:
  * used AI to interpret logs or choose the next inspection target
  * asked AI for the exact fix too early
  * pasted solution-like AI output without evidence
  * used AI to validate a hypothesis or regression test
* [ ] Create a bugfix scoring algorithm with weighted categories:
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
* [ ] Feed the evidence timeline into feedback generation.
* [ ] Add tests for score weighting, missing evidence penalties, over-edit penalties, AI shortcut penalties, and perfect-score edge cases.

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
* [ ] Add a dedicated Bugfix Readiness Score separate from DSA readiness.
* [ ] Add a debugging skill profile to dashboard surfaces:
  * Reproduction
  * Navigation
  * Evidence Gathering
  * Hypothesis
  * Minimal Fix
  * Verification
  * Prevention
  * AI Collaboration
  * Communication
* [ ] Extend recommendation types so bugfix recommendations are not forced through `DSAPattern`.
* [ ] Add bugfix-first recommendation tracks:
  * Beginner Debugger
  * Frontend Regression Debugging
  * Backend/API Debugging
  * Data, Date, and Time Bugs
  * Distributed Systems Debugging
  * AI-Assisted Debugging
* [ ] Add post-session report sections:
  * final diff
  * files inspected
  * tests/docs/logs inspected
  * tests run
  * root cause
  * minimality assessment
  * prevention idea
  * next recommended incident
* [ ] Add practice mode vs interview mode:
  * Practice mode gives nudges, next-file suggestions, and scaffolded hypothesis prompts.
  * Interview mode withholds direct help and scores the user under realistic pressure.
* [ ] Update dashboard/practice copy away from DSA-first language for bugfix surfaces.
* [ ] Add analytics for bugfix product health:
  * bugfix start rate
  * completion rate
  * time to first reproduction
  * time to first edit
  * first inspected file role
  * visible-to-hidden failure rate
  * over-edit rate
  * AI shortcut rate
  * repeat bugfix practice conversion
* [ ] Add beginner ramp UX that recommends easier incidents when evidence shows weak reproduction or navigation habits.
* [ ] Add tests for recommendation mapping, report generation, dashboard copy, and bugfix analytics events.

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
* [ ] Add an admin scenario quality dashboard for bugfix incidents:
  * incident metadata completeness
  * starter workspace fails
  * reference workspace passes
  * visible tests are useful
  * hidden tests stay hidden
  * expected touched files are respected
  * first-screen text does not reveal root cause
* [ ] Add scenario taxonomy and tags for marketable bugfix categories:
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
* [ ] Add release QA scripts that audit every default bugfix scenario before deploy.
* [ ] Add Playwright coverage for the evidence-driven bugfix journey:
  * open incident
  * inspect docs/tests
  * create hypothesis
  * edit file
  * run visible tests
  * submit
  * view evidence-based feedback
  * restore session
* [ ] Add copy and packaging updates for bugfix-first surfaces:
  * Real Codebase Debugging
  * Production Incident Practice
  * AI-Era Debugging Interview Prep
* [ ] Add a bugfix onboarding sample incident that demonstrates the full loop in under 10 minutes.
* [ ] Add guardrails so DSA drills, micro-debugging drills, and real-codebase bugfix incidents are clearly separated in discovery.
* [ ] Add release metrics and monitoring for the bugfix funnel.

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
