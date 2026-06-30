# ARCHITECTURE — Python Curriculum (engineering source of truth)

Both agents build against this document. It is grounded in the real codebase (file paths and line
numbers verified). The guiding principle is **reuse, not rebuild**: every expensive subsystem
(execution, validation, quota, editor, results UI, persistence pattern) already exists.

---

## 0. New module layout

```
lib/tutorials/
  types.ts                 # content tree + exercise + progress types          (Agent 1)
  registry.ts              # listLevels/getLevel/getLesson/getExerciseById     (Agent 1)
  exercise-scenarios.ts    # adapts a PythonExercise -> Scenario for /api/execute (Agent 1)
  progress.ts              # Firestore service (Admin SDK, server-only)         (Agent 1)
  progress-client.ts       # client fetch wrappers                              (Agent 1)
  curriculum/
    index.ts               # assembles PYTHON_LEVELS from level1..4             (Agent 1 shell)
    level1/index.ts        # CONTENT — 1 sample single-file lesson now          (Agent 1 sample, then Agent 2)
    level2/index.ts        # CONTENT shell                                      (Agent 2)
    level3/index.ts        # CONTENT — 1 sample workspace lesson now            (Agent 1 sample, then Agent 2)
    level4/index.ts        # CONTENT shell                                      (Agent 2)
lib/stores/tutorial-store.ts                 # Zustand, mirrors case-lab-store  (Agent 1)
components/tutorials/*                        # UI                              (Agent 1)
app/learn/python/...                         # routes                          (Agent 1)
app/api/tutorials/progress/route.ts          # progress API                    (Agent 1)
docs/python-curriculum/*                     # this blueprint pack
```

Modify (surgical): `app/api/execute/route.ts` (1 line), `firestore.rules` (1 block), the route
middleware matcher (auth gate). Optionally the dashboard page (progress overlay).

---

## 1. Data model — `lib/tutorials/types.ts`

Content tree is authored content (like `CaseLab`); progress is per-user state (like `CaseLabRun`).
Exercises **reuse the exact field shapes** the executor already understands, so grading needs zero
new execution code.

```ts
import type { DifficultyLevel, WorkspaceScenarioConfig } from "@/lib/scenarios/types"

export type PythonLevelId = 1 | 2 | 3 | 4
export type LessonSection = "teach" | "apply" | "practice"
export type ExerciseExecutionMode = "single-file" | "workspace"

/** Teach: pure reading + an optional non-graded runnable demo. */
export interface TeachSection {
  markdown: string          // self-contained explanation (rendered by MarkdownRenderer)
  demoCode?: string         // optional snippet the learner can Run to "see it work"
  estimatedMinutes: number
}

/**
 * A graded exercise. Mirrors DSAScenario.testCases (single-file) and
 * WorkspaceScenarioConfig (workspace) so /api/execute runs it unchanged.
 */
export interface PythonExercise {
  id: string                       // namespaced, e.g. "py-l1-variables-apply" (used as scenarioId)
  prompt: string                   // markdown task description
  executionMode: ExerciseExecutionMode
  starterCode: string              // single-file: editor seed; workspace: ignored (files carry it)
  hints: string[]
  referenceSolution?: string       // single-file model answer (gated reveal)

  // single-file grading — SAME shape as DSAScenario.testCases (lib/scenarios/types.ts:175)
  testCases?: Array<{
    input: Record<string, unknown> // KEYED args (arg-name -> value); see section 4
    expected: unknown
    description: string
    orderMatters?: boolean
    compareAsSet?: boolean
  }>

  // workspace grading — full reuse of WorkspaceScenarioConfig (lib/scenarios/types.ts:110)
  workspace?: WorkspaceScenarioConfig
}

export interface PythonLesson {
  id: string                       // "py-l1-variables"
  title: string
  summary: string                  // one line, for the module list
  estimatedMinutes: number
  difficulty: DifficultyLevel      // reuse "easy" | "medium" | "hard"
  skills: string[]                 // browse/filter tags
  teach: TeachSection
  apply: PythonExercise            // guided: more hints; reference revealed after N attempts
  practice: PythonExercise         // combined challenge: hidden reference + hidden tests
}

export interface PythonModule {
  id: string                       // "py-l1-fundamentals"
  title: string
  description: string
  lessons: PythonLesson[]
}

export interface PythonLevel {
  id: PythonLevelId
  slug: "fundamentals" | "intermediate" | "applied" | "engineering"
  title: string                    // "Level 1 — Python Fundamentals"
  tagline: string
  defaultExecutionMode: ExerciseExecutionMode  // L1/L2 "single-file", L3/L4 "workspace"
  estimatedHours: number
  modules: PythonModule[]
}

// ---- progress (per-user state) ----
export type SectionStatus = "not_started" | "in_progress" | "completed"

export interface TutorialLessonProgress {
  userId: string                   // SERVER-derived from auth token; never trusted from client
  lessonId: string
  levelId: PythonLevelId
  sections: Record<LessonSection, SectionStatus>
  lessonStatus: SectionStatus      // completed when practice completed
  lastExerciseScore?: number       // % tests passed on practice
  startedAt: string                // ISO
  updatedAt: string                // ISO
  completedAt?: string             // omit when undefined (Firestore rejects undefined)
}
```

---

## 2. Registry — `lib/tutorials/registry.ts`

Mirror `lib/labs/case-labs/index.ts`.

```ts
import { PYTHON_LEVELS } from "./curriculum"
import type { PythonLevel, PythonModule, PythonLesson, PythonLevelId, PythonExercise } from "./types"

export function listLevels(): PythonLevel[]
export function getLevel(id: PythonLevelId): PythonLevel | undefined
export function getLevelBySlug(slug: PythonLevel["slug"]): PythonLevel | undefined
export function getModule(levelId: PythonLevelId, moduleId: string): PythonModule | undefined
export function getLesson(lessonId: string): PythonLesson | undefined              // flat search
export function getLessonLocation(lessonId: string): { level: PythonLevel; module: PythonModule; lesson: PythonLesson } | undefined
export function getNextLesson(lessonId: string): PythonLesson | undefined          // linear progression
export function getExerciseById(exerciseId: string): PythonExercise | undefined    // searches every lesson's apply+practice — used by execution
```

`curriculum/index.ts` assembles `export const PYTHON_LEVELS: PythonLevel[] = [level1, level2, level3, level4]`.
Add a unit test asserting all lesson/exercise ids are globally unique.

---

## 3. Execution wiring — the one critical reuse

`/api/execute` is the single execution authority. Verified facts (`app/api/execute/route.ts`):
- Request body: `{ code?, scenarioId, language, sessionId?, workspaceFiles? }` (line 45-52).
- Line 269: `enforceQuota(request, { requireAuth: true })` — signed-out callers already 401.
- **Line 334**: `const scenario = getScenarioById(scenarioId)` — the resolution point.
- Line 346: `if (isWorkspaceScenario(scenario))` → `executeWorkspaceScenario({ scenario, edits: normalizeWorkspaceEdits(workspaceFiles) })`; response maps `results[]` to `{ description, passed, input, expected, actual, error, isHidden }` (line 373-381).
- Else (single-file): reads `scenario.testCases` (line 391-394), runs `executeWithPiston(fullCode, language, testCase.input)` per case, validates with `validateResult` (property-based + legacy), returns `{ success, results, summary }`.

**The change (one line).** Add `lib/tutorials/exercise-scenarios.ts`:

```ts
import { getExerciseById } from "./registry"
import type { Scenario } from "@/lib/scenarios"

/** Adapt a tutorial PythonExercise to the Scenario shape /api/execute already understands. */
export function getTutorialExerciseScenario(id: string): Scenario | undefined {
  const ex = getExerciseById(id)
  if (!ex) return undefined
  if (ex.executionMode === "workspace" && ex.workspace) {
    // isWorkspaceScenario checks executionMode === "workspace" && workspace present
    return { id: ex.id, type: "add-functionality", executionMode: "workspace", workspace: ex.workspace,
             title: ex.id, difficulty: "medium", companies: [], description: ex.prompt, tags: [],
             estimatedTime: 0 } as unknown as Scenario
  }
  // single-file -> DSA-like: /api/execute only needs type + testCases for this branch
  return { id: ex.id, type: "dsa", testCases: ex.testCases ?? [], title: ex.id, difficulty: "easy",
           companies: [], description: ex.prompt, tags: [], estimatedTime: 0 } as unknown as Scenario
}
```

Then edit `app/api/execute/route.ts:334`:

```ts
const scenario = getScenarioById(scenarioId) ?? getTutorialExerciseScenario(scenarioId)
```

That is the whole integration. Everything downstream — Piston single/multi-file exec, `validateResult`,
`enforceQuota`, `checkRateLimit`, analytics, and the service-error vs. user-error handling — applies
automatically. **Verify `isWorkspaceScenario`'s exact predicate** in `lib/workspace-execution` and
shape the workspace adapter object to satisfy it; adjust the cast minimally if it reads more fields.

> Confirm the adapter's `type` field doesn't trip `buildFullCode` (route line 215): for single-file
> we use `type: "dsa"` precisely so `buildFullCode` is a no-op. Keep it `dsa`.

**Decision (v1): tutorial runs share the existing execution quota/rate-limit.** Simplest and DRY. If
beginners start hitting interview limits, add a separate "learning" quota lane as a fast-follow
(noted in Agent 1 backlog, not v1 scope).

---

## 4. Single-file grading contract (authors must follow)

The Python single-file path wraps the learner's code and calls a function with the test `input`.
`executeWithPiston` emits `__RESULT__:`/`__LOGS__:` markers (`lib/piston.ts:567-568`) that
`parseExecutionOutput` reads. Practical rules for authors (Agent 2):

- The learner implements a **named function**; the prompt states the exact signature, e.g.
  "implement `def to_celsius(f): ...`".
- Each `testCases[i].input` is a **keyed object** mapping argument names to values, e.g.
  `{ input: { f: 212 }, expected: 100, description: "boiling" }`.
- `expected` is compared by the existing validator (numbers within tolerance; arrays exact or
  set-like via `orderMatters:false`/`compareAsSet`; strings case-sensitive by default; deep object
  equality). Use `orderMatters:false` for order-insensitive outputs.
- Always provide `referenceSolution` (a correct implementation) so the player can gate-reveal it.

Confirm the exact wrapper expectations by reading the Python branch of `lib/piston.ts` before writing
the first lesson; the single-file sample lesson built by Agent 1 is the canonical example.

---

## 5. Workspace grading contract (L3/L4 authors must follow)

Reuse `WorkspaceScenarioConfig` (`lib/scenarios/types.ts:110`) verbatim:

```ts
interface WorkspaceScenarioConfig {
  language: "python"
  primaryFilePath: string        // the main file the learner edits
  editableFilePaths: string[]    // must include primaryFilePath
  visibleTestPaths: string[]     // >= 1 visible test file
  hiddenTestPaths: string[]      // >= 1 hidden test file
  testRunnerPath: string         // entry the runner executes
  files: WorkspaceScenarioFile[] // { path, content, role: editable|readonly|test|docs, language, hidden? }
  referenceFiles?: WorkspaceScenarioFile[]
}
```

The test runner must print results as JSON behind the marker the executor parses:

```python
print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))
# results: [{ "suite": str, "name": str, "passed": bool, "error": str|None, "isHidden"?: bool }]
```

**Copy a working Python example** rather than inventing the runner:
`lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace.ts` (runner at line ~482),
`bugfix-feature-pipeline-nan-workspace.ts` (~186), `bugfix-event-aggregation-retries.ts` (~179),
`bugfix-comment-thread-merge.ts` (~180). Re-frame the workspace from "fix this bug" to "build/extend
this module". Validate against the existing workspace validator (`lib/workspace-execution/validators.ts`):
≥1 visible test, ≥1 hidden test, `testRunnerPath` set, primary file editable.

---

## 6. Routes & pages — `app/learn/python/...` (logged-in only)

```
app/learn/python/
  layout.tsx                       # shared header + auth guard wrapper
  page.tsx                         # SERVER: level selector (4 cards). listLevels()
  [levelSlug]/page.tsx             # SERVER: module + lesson list. getLevelBySlug()
  [levelSlug]/[lessonId]/page.tsx  # CLIENT: the Lesson Player (Teach -> Apply -> Practice)
```

- **Server components** for the static selector + module list (content is imported, not user data);
  hydrate the per-user progress overlay client-side (mirrors how roadmap hydrates its store).
- **Client component** for the Lesson Player (owns editor, run, results, section stepper, autosave).
  Model the 3-column layout on `app/labs/[labId]/page.tsx`.
- **Auth (hard gate):** add `/learn/python/:path*` to the existing middleware protected-route matcher
  (the `firebase-auth-token` cookie set in `lib/auth-context.tsx`), AND an in-page `useAuth()` guard
  that redirects to `/login` when `initialized && !user`. Progress requires a real user.

---

## 7. Components — `components/tutorials/` (reuse `components/ui/` first)

| Component | Reuses / mirrors |
|-----------|------------------|
| `LevelSelector` + `LevelCard` | `ui/Card`, `ui/Badge`, `ui/Progress`; models on `app/labs/page.tsx` gallery + roadmap cards |
| `ModuleList` | `ui/Collapsible`, `ui/Badge` |
| `LessonRow` | mirrors `components/labs/CaseLabRow.tsx`; completion check icon |
| `LessonPlayer` | `ui/Tabs` or stepper (Teach/Apply/Practice) + `ui/Resizable`; orchestrates store + progress hook |
| `TeachPanel` | `components/ui/MarkdownRenderer.tsx`; optional "Run demo" button -> `/api/execute` (demo treated like a no-test run or skipped) |
| `ExerciseRunner` | **adapt from `components/labs/stations/BuildStation.tsx`**; single editor (single-file) or file-tabs (workspace); uses `CodeMirrorEditor` + `CodeMirrorErrorBoundary` (`components/editor`) |
| `ExerciseResults` | **reuse `components/interview/TestResultsPanel.tsx`** for single-file; compact list (BuildStation style) for workspace |
| `ProgressSidebar` | mirrors `components/labs/MilestoneRail.tsx`; section status + lesson nav; `ui/Progress` |
| `useTutorialProgressSync` (hook) | mirrors `useCaseLabRunSync.ts`: debounced autosave + load-on-mount, best-effort |

Runner calls (from `ExerciseRunner`, copying `BuildStation`):
- single-file: `POST /api/execute { scenarioId: exercise.id, language: "python", code }`
- workspace: `POST /api/execute { scenarioId: exercise.id, language: "python", workspaceFiles: edits }`

On all-pass, mark the section `completed` via the progress hook and unlock the next lesson.

---

## 8. Progress persistence

**New Firestore collection `user_tutorial_progress`**, doc id `${uid}__${lessonId}` (per-user-per-lesson
— small docs, trivial rules, no 1MB/contention risk). Kept separate from `user_learning_state` (which
is SM-2 interview-problem state — a different contract; do not overload it).

`lib/tutorials/progress.ts` (Admin SDK, server-only) mirrors `lib/labs/case-lab-runs.ts` exactly:
- A **Zod input schema** (`tutorialProgressInputSchema`) WITHOUT `userId`/timestamps (server-owned).
- `getLessonProgress(userId, lessonId)` — ownership-checked, returns null if missing/not owned.
- `listUserProgress(userId)` — `where("userId","==",uid)` only (auto single-field index), filter/sort
  in memory (same as `getActiveCaseLabRun`). Powers the dashboard/level % overlay.
- `upsertLessonProgress(userId, input)` — set/merge, stamps `updatedAt`, preserves `startedAt`, sets
  `completedAt` when `lessonStatus === "completed"`, OMITS undefined fields.

`lib/tutorials/progress-client.ts` mirrors `case-lab-runs-client.ts`: attach `getCurrentUserToken()`,
`withTimeout`, degrade to `null` when signed out / on failure.

`lib/stores/tutorial-store.ts` mirrors `lib/stores/case-lab-store.ts` (Zustand) for player state.

**API** `app/api/tutorials/progress/route.ts` — thin, wrapped in `withAuth` (`lib/auth-helpers.ts`):
- `GET ?lessonId=...` → `getLessonProgress` (player resume)
- `GET` (no param) → `listUserProgress` (overlay)
- `PUT` → `upsertLessonProgress` (Zod-validated body)

**`firestore.rules`** — append a block modeled on the existing `caseLabRuns` block
(`firestore.rules:364-380`), owner-only read/create/update/delete (defense-in-depth; authoritative
writes go through Admin SDK):

```
match /user_tutorial_progress/{docId} {
  allow read:   if isAuthenticated() && documentExists() && resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() && documentExists()
                && resource.data.userId == request.auth.uid
                && request.resource.data.userId == request.auth.uid;
  allow delete: if isAuthenticated() && documentExists() && resource.data.userId == request.auth.uid;
}
```

**Streaks** are optional in v1. If added, **extract** the timezone day-boundary helper from
`lib/learning-state.ts` into a shared module and have both call it — do NOT copy-paste it
(CLAUDE.md forbids duplicating scheduling logic).

---

## 9. Reuse vs Extend vs Build-new

| Concern | Decision | Specifics |
|---|---|---|
| Piston single/multi-file exec | Reuse as-is | `lib/piston.ts`, `executeWorkspaceScenario` |
| Result validation | Reuse as-is | `validateResult`/`validateResultEnhanced` |
| Quota / rate-limit / analytics | Reuse as-is | inside `/api/execute` |
| Execute scenario resolution | **Extend (1 line)** | `getScenarioById(id) ?? getTutorialExerciseScenario(id)` |
| Editor | Reuse as-is | `CodeMirrorEditor`, `CodeMirrorErrorBoundary` |
| Results UI | Reuse as-is | `components/interview/TestResultsPanel.tsx` |
| Workspace scenario shape | Reuse as-is | `WorkspaceScenarioConfig` |
| Auth (server/client) | Reuse as-is | `withAuth`/`verifyAuth`, `useAuth` |
| UI primitives | Reuse as-is | `Card`, `Tabs`, `Collapsible`, `Badge`, `Progress`, `Resizable`, `MarkdownRenderer` |
| Persistence service | Build new (mirror) | `progress.ts` mirrors `case-lab-runs.ts` |
| Registry / store / sync hook | Build new (mirror) | mirror `case-labs/index.ts`, `case-lab-store.ts`, `useCaseLabRunSync.ts` |
| Progress collection + rules | Build new | `user_tutorial_progress` + rules block |
| Content tree types | Build new | `lib/tutorials/types.ts` |

**DRY guardrails (CLAUDE.md):** do NOT add a second execute endpoint; do NOT fork `TestResultsPanel`;
do NOT copy streak math — extract it.

---

## 10. The lesson schema contract (what Agent 2 must satisfy)

Each authored lesson is one `PythonLesson` object exported from the correct
`lib/tutorials/curriculum/levelN/` file and added to that level's `modules[].lessons[]`:
1. **Unique ids**: lesson `py-l{N}-{slug}`, exercises `py-l{N}-{slug}-apply` / `py-l{N}-{slug}-practice`.
2. `teach.markdown` is self-contained; optional `teach.demoCode` runs with no input.
3. **Single-file (L1/L2)**: `executionMode:"single-file"`, `starterCode` defines a named function,
   `testCases[]` use keyed `input` → `expected`, include `referenceSolution` + `hints[]`.
4. **Workspace (L3/L4)**: `executionMode:"workspace"` + a complete `WorkspaceScenarioConfig` that
   passes the workspace validator and whose runner prints `__WORKSPACE_TEST_RESULTS__:` JSON.
5. Include `estimatedMinutes`, `difficulty`, `skills[]`.
6. **Acceptance**: registers in the registry; `pnpm typecheck` + `pnpm lint` pass; the Lesson Player
   runs Apply + Practice **green** against `/api/execute`.
