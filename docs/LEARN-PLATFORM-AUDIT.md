# /learn Platform Audit — Python + SQL

> **RESOLUTION (2026-07-03):** Every finding below has been fixed on branch
> `claude/sql-curriculum-and-python-gaps` **except U3**, which is a deliberate deferral (see note at
> the end of this box). The fixes were built systematically (root-cause, not patch) and centralized
> where it reduced real duplication. Summary:
>
> - **Clipping (U1/U2/S3/P3, the reported bug):** fixed at the root. `CodeMirrorEditor` gained an
>   `autoHeight` mode (grow to content, scroll only past `maxHeight`). A new `ReadOnlyCodeBlock`
>   component now renders every read-only code panel (teach demos + both runners' reference views);
>   the editable Python/SQL/workspace editors grow too. No lesson content had to change; ~100 clipped
>   panels are fixed by 2 components.
> - **Python level routing (L1/L2):** ported `getNextLessonInLevel`/`getFirstLessonOfNextLevel`/
>   `listLessonsInLevel` to the Python registry (parity with SQL) + registry tests; `LessonPlayer`
>   now scopes "Up next" to the level and shows the level-complete hand-off card.
> - **Cross-lesson state bleed (L3):** `key={lesson.id}` on both players.
> - **Progress UX (L4/L5/L6):** shared `LessonErrorBanner` + `LessonLoadingState`; both players now
>   surface load/save errors, show a hydration skeleton, and persist partial progress via
>   `startSection`.
> - **Guard duplication (L7):** single `isSqlResultSet` in `types.ts`. **Sable hooks (L8):** added to
>   the SQL runner.
> - **SQL content:** S1 backticks un-escaped; S2 window-ranking demo made deterministic + table
>   updated; L2 titles/modules use colons; em dashes removed.
> - **Python content:** P1 real `while` example; P2 `__eq__`→unhashable note; P4 asyncio caveat; em
>   dashes removed.
> - **Verification:** `pnpm typecheck` clean, 60 tutorial/editor tests pass, lint clean (2 pre-existing
>   warnings only). AppleDouble `._*` already `.gitignore`d. A 3-member validation council
>   (React/logic, content, parity) reviewed the diff; it caught one real bug in the first S2 attempt
>   (tiebreaker over-applied to RANK/DENSE_RANK, which collapsed the tie) — corrected and re-verified
>   live in sqlite3 so the demo output matches the worked-example table.
> - **U3 — DEFERRED, not fixed.** The `min-w-[1080px]` workspace still scrolls horizontally as one
>   unit below ~1080px. A true fix is a responsive rewrite that stacks the 3-column tool on small
>   screens; that is a separate, higher-risk piece of work and was consciously left for a follow-up
>   rather than half-done here. It remains listed as P2 in §1.

**Status:** FIXED except U3 (deferred). Original findings retained below for the record.
**Date:** 2026-07-03
**Method:** Manual review of the render/logic layer + three parallel deep-reads of all 8 curriculum files (SQL L1-L4, Python L1-L4), with expected-output math hand-verified and the two highest-severity content bugs reproduced first-hand.

> **Interview-prep note (why this doc talks to me the way it does):** I (the repo owner) am actively preparing for **SWE, Data Engineering, and System Design** interviews. Where a fix in this codebase maps onto a concept an interviewer actually probes (React rendering model, SQL semantics, Python data model, complexity), the finding carries a short **"Interview nuance"** callout. Those are the transferable lessons, not just the patch. Keep doing this inline in future work.

---

## 0. The bug I reported (root cause + real scope)

The symptom: on the CTEs/aggregation lesson the worked-example panel shows only the top of the query — `FROM paid_orders` and `GROUP BY customer_id;` are cut off.

**Root cause.** The "Example query" pane in [TeachPanel.tsx:89](../components/tutorials/TeachPanel.tsx#L89) renders the demo in a CodeMirror with a **fixed `height={140}`**. The editor theme uses `line-height: 22px` + `8px` top/bottom padding ([CodeMirrorEditor.tsx:97-98](../components/editor/CodeMirrorEditor.tsx#L97)), so the usable area is `(140 − 16) / 22 ≈ **5.6 lines**`. The aggregation demo (`sql-l2-ctes`) is **8 lines**, so the last ~2.5 lines live below the fold behind a tiny internal scrollbar.

**This is systemic, not a one-off.** Measured across the whole curriculum:

| Read-only pane | Lessons over the visible line budget |
|---|---|
| Teach demo (`demoCode`, 140px ≈ 5.6 lines) | **46 of 76** demos, tallest = 21 lines |
| Reference solution ([ExerciseRunner.tsx:153](../components/tutorials/ExerciseRunner.tsx#L153) 140px / [SqlExerciseRunner.tsx:155](../components/tutorials/SqlExerciseRunner.tsx#L155) 160px) | **55 of 131** solutions, tallest = 33 lines shown in a ~6-line box |

**Interview nuance (frontend).** A **read-only** block has a *known* content height at render time, so giving it a fixed viewport + internal scroll is the wrong default — it hides content the Read phase exists to show. Fixed heights are only justified for the *editable* editors (you want a stable typing target and a predictable layout while the user types). The fix is to let read-only panes auto-size to their content (optionally capped with a "show more"). This is the kind of "know when a constraint is load-bearing vs. cargo-culted" judgment that comes up in frontend/system-design rounds.

---

## 1. UI / rendering findings

| # | Severity | Location | Finding |
|---|---|---|---|
| U1 | **P0** | [TeachPanel.tsx:89](../components/tutorials/TeachPanel.tsx#L89) | Teach demo clipped to ~5.6 lines; 46/76 demos affected (see §0). Make read-only demo auto-height. |
| U2 | **P1** | [ExerciseRunner.tsx:153](../components/tutorials/ExerciseRunner.tsx#L153), [SqlExerciseRunner.tsx:155](../components/tutorials/SqlExerciseRunner.tsx#L155) | Reference-solution panes fixed at 140/160px; 55/131 solutions clipped (one is 33 lines). Auto-height read-only. |
| U3 | P2 | [LessonPlayer.tsx:214](../components/tutorials/LessonPlayer.tsx#L214), [SqlLessonPlayer.tsx:236](../components/tutorials/SqlLessonPlayer.tsx#L236) | Whole workspace is `min-w-[1080px]` inside `overflow-x-auto`, so on a &lt;1080px laptop the entire 3-column lesson scrolls horizontally as one unit. Intentional today, but worth a responsive breakpoint that stacks columns instead. |

---

## 2. Logic / routing / state findings

| # | Severity | Location | Finding | User-visible symptom |
|---|---|---|---|---|
| L1 | **P0** | [registry.ts:58](../lib/tutorials/registry.ts#L58), [LessonPlayer.tsx:97-101,279-285](../components/tutorials/LessonPlayer.tsx#L97) | **Python "Next lesson" crosses level boundaries silently.** `getNextLesson` returns the global `listAllLessons()[i+1]` with no level-awareness. SQL was fixed (`getNextSqlLessonInLevel` + `getFirstLessonOfNextSqlLevel` + a "Level N complete" card); Python never got the parity port. | Finishing a Python level's last lesson shows a plain "Next lesson: &lt;first lesson of next level&gt;" and teleports the learner into Level N+1 with no acknowledgement; the `LEVEL N` badge jumps a level. |
| L2 | **P1** | [LessonPlayer.tsx:81-95](../components/tutorials/LessonPlayer.tsx#L81) | **Python "Up next" bleeds across levels** — sliced from `listAllLessons()` globally. SQL scopes to `listSqlLessonsInLevel`. | While still inside Level N, the left rail already lists Level N+1 lessons under the current level's outline, letting learners skip past the level gate. |
| L3 | **P0** | [python page.tsx:40](../app/learn/python/[levelSlug]/[lessonId]/page.tsx), [sql page.tsx:39](../app/learn/sql/[levelSlug]/[lessonId]/page.tsx) | **No `key={lessonId}` on the player.** Navigating lesson→lesson via `<Link>` reuses the component instance, so `active` section, the `didResume` ref, and child `useExerciseRun` state (`passed`/`attempts`/`results`) all persist. Meanwhile `useTutorialProgressSync` *does* reset the store. | Click an "Up next" lesson and you can land directly on **Practice** of a lesson you've never read, sometimes showing a stale "all tests passed" / result grid from the previous lesson. Affects both players. |
| L4 | P1 | [useTutorialProgressSync.ts:57,93](../components/tutorials/useTutorialProgressSync.ts#L57), [tutorial-store.ts:114](../lib/stores/tutorial-store.ts#L114) | Store `error` is set on load/save failure but **no component reads it**. | Progress load failure → learner silently sees a pristine lesson; save failure → no indication progress isn't persisting. CLAUDE.md requires handling these. |
| L5 | P2 | [LessonPlayer.tsx:51](../components/tutorials/LessonPlayer.tsx#L51), [SqlLessonPlayer.tsx:64](../components/tutorials/SqlLessonPlayer.tsx#L64) | `isLoading` gates the resume effect but nothing renders a skeleton while progress hydrates. | Returning learner briefly sees the lesson reset to Read/0% before saved position snaps in (looks like lost progress; compounds L3). |
| L6 | P2 | [tutorial-store.ts:47,89-96](../lib/stores/tutorial-store.ts#L89) | `startSection` ("in_progress") is **dead code** — zero call sites. Sections only go `not_started → completed`; the autosave "untouched" gate then treats partial engagement as pristine. | Partial progress (read Read, failed Apply) isn't persisted; outline's in-progress styling is unreachable. Wire it or delete it. |
| L7 | P3 | [SqlExerciseRunner.tsx:68-71](../components/tutorials/SqlExerciseRunner.tsx#L68) vs [TeachPanel.tsx:123-129](../components/tutorials/TeachPanel.tsx#L123) | Two copies of the `isResultSet` guard disagree (runner checks only `columns`; TeachPanel checks `columns`+`rows`). A columns-but-no-rows sentinel could slip past the runner guard into `SqlResultGrid`. DRY into one shared guard. |
| L8 | P3 | `SqlExerciseRunner.tsx` | SQL runner dropped the `onHintReveal`/`onReferenceReveal` hooks the Python `ExerciseRunner` wires for Sable. No impact today (Sable locked), latent fork divergence. |

**Interview nuance (React, L3).** This is a textbook **reconciliation** question. React keys a component by *position + type* in the tree; same route segment + same component type = same instance, so `useState`/`useRef` survive the "navigation." Changing `key` forces unmount/remount and fresh state. Interviewers love "why does my form keep the previous row's data when I click edit on a different row?" — same bug, same fix.

**Interview nuance (React, L1/L2).** The Python vs SQL divergence is a **single-source-of-truth** lesson: the level-boundary rule got encoded once in the SQL registry but duplicated-by-omission in the Python one. The clean fix ports the three helpers to `lib/tutorials/registry.ts` so both players consume the same boundary logic — the DRY principle the CLAUDE.md constitution calls out.

---

## 3. SQL content findings

**Correctness: clean.** Every Apply/Practice reference solution was hand-executed against its seed — **zero expected-output mismatches**, and no GROUP BY / join / NULL / window bugs in prose or demos. The hardest lessons (window ranking with ties, SCD2, as-of join, idempotent merge lookback) all check out. The DE-interview claims (ROW_NUMBER vs RANK vs DENSE_RANK tie semantics, AVG-ignores-NULL, NOT IN + NULL trap, WHERE-on-the-right-side collapsing a LEFT JOIN to INNER, ROWS vs RANGE default frame) are all accurate.

| # | Severity | Location | Finding |
|---|---|---|---|
| S1 | **P0** | [level4.ts:2452-2499](../lib/tutorials/sql/curriculum/level4.ts#L2452) | **`sql-l4-data-quality` reading is corrupted.** Backticks are double-escaped (`\\\`` in source → renders as literal `` \` ``). Both ` ```sql ` fences render as raw text and every inline code span shows visible backslashes. Isolated to this one lesson (10 occurrences). Fix: `\\\`` → `` \` ``. |
| S2 | P2 | [level4.ts:36-41](../lib/tutorials/sql/curriculum/level4.ts#L36) vs [:102](../lib/tutorials/sql/curriculum/level4.ts#L102) | `sql-l4-window-ranking` teach table asserts a specific tie order (Headphones=1, Earbuds=2) but the live demo `ORDER BY revenue DESC` has **no tiebreaker**, so the rendered tie order is arbitrary in SQLite (currently matches by luck of insertion order). Add `, product` to the demo ORDER BY. |
| S3 | P2 | [level2.ts:1866](../lib/tutorials/sql/curriculum/level2.ts#L1866) (`sql-l2-case`, 9 ln), [level3.ts:2099](../lib/tutorials/sql/curriculum/level3.ts#L2099) (`sql-l3-indexes`, ~12 ln), [level2.ts:796](../lib/tutorials/sql/curriculum/level2.ts#L796) (`sql-l2-left-join`, 8 ln), [level2.ts:1642](../lib/tutorials/sql/curriculum/level2.ts#L1642) (`sql-l2-ctes`, 8 ln) | demoCode over the 5.6-line teach budget (subset of U1). `sql-l3-indexes` is the worst — over half clipped. |
| S4 | P3 | [level2.ts:1987,1994,2001,2008,2015](../lib/tutorials/sql/curriculum/level2.ts#L1987); [level4.ts:31](../lib/tutorials/sql/curriculum/level4.ts#L31) | Em dashes in learner-facing text. Level 2's level + all four module **titles** use `" — "` while Levels 1/3/4 use a colon — both an em-dash violation and a cross-level inconsistency. `level4.ts:31` is em dash in running prose. (More em dashes exist in SQL comments/assertion names; lower priority.) |

**Interview nuance (S2, DE).** "Tie order is arbitrary without a tiebreaker" is *the* determinism gotcha in warehouse SQL. `ROW_NUMBER() OVER (ORDER BY revenue DESC)` gives a **different** answer run-to-run when revenues tie, which silently breaks dedup/"latest record" logic. Always add a unique tiebreaker (`, product` or an id) to any ranking window whose result you depend on. Interviewers plant ties on purpose.

---

## 4. Python content findings

**Correctness: clean.** No reference solution would raise or contradict its prose; every `referenceSolution` traced passes its own `testCases` (float results match integer expecteds via the tolerance contract; workspace refs satisfy hidden suites). No false claims about Python semantics.

| # | Severity | Location | Finding |
|---|---|---|---|
| P1 | P2 | [level1/index.ts:410-421](../lib/tutorials/curriculum/level1/index.ts#L410) | `py-l1-loops` — the **"while, break, continue"** section says "A while loop runs as long as its condition holds" but the code under it is a `for n in nums:` loop. The lesson never shows a runnable `while`. |
| P2 | P2 | [level2/index.ts:942-943](../lib/tutorials/curriculum/level2/index.ts#L942) | `py-l2-dunder-properties` teaches `__eq__` without noting that defining `__eq__` sets `__hash__ = None` → instances become **unhashable** (can't be dict keys / set members). Same latent gap for `@dataclass(eq=True)` unless `frozen=True`. |
| P3 | P2 | teach `demoCode`, L2-L4 (e.g. [level4/index.ts:212,758,1080](../lib/tutorials/curriculum/level4/index.ts#L212)) | **22 teach demos clipped** — essentially every class/decorator/descriptor/async demo in L2-L4. Because Python demos don't run live, the clipped tail is usually the `print(...)` payoff line the prose promises. Subset of U1. |
| P4 | P3 | [level4/index.ts:1522-1644](../lib/tutorials/curriculum/level4/index.ts#L1522) | `py-l4-asyncio` drives coroutines sequentially via `coro.send(None)` while the prose sells `gather` as concurrency. It *is* disclosed, but a learner could believe the sandbox showed real I/O overlap. Consider a stronger caveat. |
| P5 | P3 | em dashes in code comments/docstrings (L1 ~21, L4 ~6; enumerated in raw agent output) | **All learner-facing paragraph prose is em-dash clean.** Remaining em dashes live inside code comments/docstrings only — lower stakes, flag per zero-tolerance preference. |

**Interview nuance (P2, SWE).** `__eq__` without `__hash__` is a top-tier Python-data-model gotcha. Rule: if you make two "equal-by-value" objects, you must give them the **same** hash, or make the type immutable (`frozen=True`) — otherwise you break the hash invariant (equal objects must hash equal) and Python protects you by making the type unhashable. Comes up whenever you put custom objects in a `set` or use them as `dict` keys.

**Interview nuance (P1, teaching quality).** Minor, but conflating `for` and `while` is the kind of imprecision an interviewer reads as "doesn't actually know the difference." Worth a real `while` example (e.g. a retry/`while queue:` drain loop).

---

## 5. Repo hygiene (adjacent, not /learn content)

- **AppleDouble `._*` files** litter the working tree (`components/tutorials/._*.tsx`, `lib/tutorials/**/._*.ts`). Confirmed **none are tracked in git**, so this is local-FS noise (the T7 external volume), but it's the same class of file implicated in the commit-hang issue. A `find . -name '._*' -delete` and a `.gitignore` entry would keep it clean.
- **`app/devcheck-sql/`** is untracked (`??` in git status) and looks like a dev-only probe route. Confirm it's not meant to ship before any deploy.

---

## 6. Suggested fix order (when you greenlight)

1. **U1 + U2** — auto-height read-only demo/reference panes. Single change in `TeachPanel` + the two runners; fixes the reported bug and ~100 clipped blocks at once.
2. **S1** — un-escape the backticks in `sql-l4-data-quality` (one lesson, visibly broken).
3. **L3** — add `key={lessonId}` to both players (highest-impact latent state bug).
4. **L1 + L2** — port the three level-boundary helpers to the Python registry; adopt the SQL `NextStep` / level-complete pattern in `LessonPlayer`.
5. **P1, P2, S2** — the three real content/pedagogy corrections.
6. **L4/L5/L6** — surface load/save errors, a hydration skeleton, and wire-or-delete `startSection`.
7. **S3/P3 residue, S4/P5 em dashes** — polish sweep.

---

## Appendix: raw agent reports
Three subagents produced the underlying findings (SQL content, Python content, player/logic). Their full enumerations (every em-dash line number, every clipped lesson) are preserved in this session's transcript; this doc is the deduped, verified synthesis.
