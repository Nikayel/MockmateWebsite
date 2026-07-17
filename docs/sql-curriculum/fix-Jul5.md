# fix-Jul5 — Systemic fixes for /learn/sql feedback + prompt over-giving

> Scope: the shared SQL workspace grading/feedback pipeline and the shared exercise runner + author schema. Two systemic engine/schema/UI changes land once; the per-lesson content edits that follow are a mechanical sweep. Client-side sql.js only. No lesson gating. Backward compatible with L1/L2 single-file grids and the shared Python workspace player.
>
> **Round-2 revision note.** This version closes all three answer-disclosure surfaces, not just prompts: prompt text (Fix-2a), `starterCode` (Fix-2b), and `hints` progression (Fix-2c). It also makes the opacity fix measurable per level (not flagship-only), fixes a worker sentinel-detection false positive, gates the new expected/actual UI strings on failure, calls out that metadata/pragma checks are remediated by prose only, and reconciles the prompt-guard flag-set against the exact §5 worklist.
>
> **Round-2 completeness corrections (folded in).** Six further defects are now closed. (1) The flagship "after" assertion no longer rewrites a cardinality sentinel into a bare `SELECT`-all — that query returns 1 row in the CORRECT end state and would FAIL the right answer under the "zero rows = pass" convention. Cardinality/count checks now use a WHERE-guarded projection that stays empty on pass, or keep the sentinel plus an author `countQuery`; a new machine guard (§4.4-5) proves **every** `showViolatingRows` assertion returns zero rows against its own reference solution. (2) `Actual` is never the sentinel constant `1`: for un-rewritten count sentinels the worker either shows a true observed scalar (author `countQuery`) or **suppresses** the expected/actual strings entirely and relies on `explain` prose. (3) The `starterCode` guard is reconciled against the §5 worklist exactly as the prompt guard is, and every Apply starter that pre-writes a graded construct (window-ranking-apply, window-offset-apply, dedup-apply, funnel-conversion-apply, gaps-and-islands-apply, recursive-cte starters, …) is now S-tagged. (4) Global guards are staged coherently: they cannot be "landed in lockstep per level" because each scans the whole tree, so they ship **skipped/xfail** through the sweep and are flipped to enforcing in a final guard-enable PR that lands last. (5) `SENTINEL_SHAPE` now covers `pragma_foreign_key_list`, `pragma_index_info`, and a general `pragma_\w+` catch, and its `COUNT(*)` rule no longer over-matches projecting `HAVING COUNT(*)>1` queries. (6) The `starterCode` guard uses a narrower `STARTER_ANSWER_SQL` set that excludes harness-necessary constructs (`INSERT OR IGNORE`, `ON CONFLICT` used only to keep a script running past an expected rejection), with a documented per-exercise allowlist for the rare legitimate case.

---

## 1. Problem statement

Two distinct defects were reported by the user on `/learn/sql/modeling/sql-l3-constraints`:

**Defect A — opaque grading feedback.** When a workspace assertion fails, the learner sees only a bare violation count. On the practice exercise the user hit the message:

> **PRACTICE: exactly the one valid row survived all three bad inserts** — `1 row(s) violated this check`

That single line is the *entire* feedback. It does not say the actual `COUNT(*)` was 2 (not 1), which row leaked, or why. The assertion is authored as a sentinel query `SELECT 1 WHERE (SELECT COUNT(*) FROM dim_product) <> 1` (level3.ts, practice "rows" suite), so on *any* wrong count it returns exactly one dummy row and the grader prints the constant `"1 row(s) violated this check"` — identical whether the table held 0, 2, or 20 rows.

**Defect B — the graded answer is pre-disclosed on THREE surfaces.** The reported lesson is not just a prompt problem; the audit shows the graded SQL is handed to the learner on three separate surfaces, and moving it off one while leaving the other two is cosmetic:

- **Surface 1 — the prompt.** The practice *prompt* hands the learner the exact SQL they are meant to author:
  > a **non-negative** price: `CHECK (unit_price_cents >= 0)`; ... an **enum**: `CHECK (status IN ('active','discontinued'))` ... a composite `UNIQUE (supplier_id, sku)`
- **Surface 2 — the `starterCode`.** The editable file frequently pre-writes the graded construct: L5 gaps-and-islands-practice starter pre-writes both `ROW_NUMBER()` windows, funnel starter pre-writes the `MIN(CASE...)` pivot, sessionization starter pre-writes the `LAG` CTE, L4 window starters (level4.ts:145-147, 412-414, 1907-1913) hand the `OVER` clause, and L3 ddl-create-apply's starter comment leaks `(datetime('now'))` (level3.ts:78). Even after Surface 1 is de-given, the learner opens a file with the answer already typed.
- **Surface 3 — `hints[0]`.** Hints are already over-giving: `hint[0]` on many workspace lessons is the FULL verbatim answer (L4 scd-type1-practice hint[0] gives the entire `ON CONFLICT` statement, level4.ts:1433; L4 snowflake-practice hint[2] gives the whole query; extra-practice.ts final hints paste `HAVING COUNT(*) > 2`, `WHERE total_cents >= 5000`). If we surface `exercise.hints` through a new Hint button *and* move prompt syntax into hints, one Hint tap still hands the complete answer — the complaint is relocated one click deep, not resolved.

The graded skill (choosing and writing those constraints/windows/pivots) is therefore pre-written on every surface, so the exercise degrades to transcription. The workspace runner today renders **no Hint button at all**, which is *why* authors have been dumping syntax into the prompt and into `hint[0]` — there was no gated place to put it. The fix must add the gated place **and** enforce that literal answer-SQL lives only in the *final* gated hint, on all three surfaces at once.

### The l3 user bug, in learner terms

The learner's `dim_product` ended with **2 rows instead of 1**, tripping the practice "rows" assertion. Tracing the three intended schema mistakes against the four inserts the lesson asks for (one valid row, then `INSERT OR IGNORE` of a duplicate pair, a negative price, and a bad status):

1. **`supplier_id` declared as sole `PRIMARY KEY` instead of composite `UNIQUE(supplier_id, sku)`.** A single-column PK makes `supplier_id` unique by itself, so the duplicate `(supplier_id, sku)` pair is only rejected if it reuses the same `supplier_id`. If the learner gave the bad rows distinct `supplier_id`s (natural without the composite-key model), the row that should have been blocked lands anyway → count becomes 2. This is the root cause.
2. **The enum typo `CHECK(status IN('active','discounted'))`** ('discounted' vs 'discontinued') is invisible to grading: the schema check only matches the substring `'%status%IN%active%'`, and `'active'` is present, so it passes. A bad-status row can slip through or a legitimately valid row is silently dropped, shifting the count.
3. **`unit_price_cents` with a bare typeless `CHECK ... >= 0`** still enforces the constraint in SQLite and still matches `'%unit_price_cents%>=%0%'`, so the negative-price row is correctly rejected. A red herring for the count, but never acknowledged.

The assertion that would have localized the real bug — "the UNIQUE is composite over exactly `(supplier_id, sku)`" — is authored `isHidden: true` (level3.ts:1007), so the learner never even sees the check that points at their mistake. Net: the only feedback is a count-based failure on the row-count assertion, with the diagnostic assertions either fooled (weak fuzzy matchers) or invisible.

**Note on the shape of this specific check.** The surviving root cause here is a **cardinality** failure — two rows, both individually well-formed, where exactly one should exist. There is no per-row predicate that marks either row "the bad one" (the two rows may carry distinct `supplier_id`s and both look valid in isolation). This is exactly the class of check that CANNOT be rewritten into a bare projecting query and must instead use the cardinality patterns in §3.5 / §5. Recognizing that distinction is load-bearing for Fix 1.

---

## 2. Root causes (file:line evidence)

**(a) Grading emits only a violation COUNT and hides the assertion SQL.**
`public/workers/sql-sandbox-worker.js` `gradeWorkspace` L144-164: for each assertion it computes `violations = res.length ? res[0].values.length : 0` (L147) and pushes a row whose only failure text is the fixed template `` `${violations} row(s) violated this check` `` (L152). `res[0]` (the offending rows + columns) is already materialized in hand but is discarded. The emitted row shape is `{suite, name, passed, error, isHidden}` (L148-154) — no field for rows, columns, expected/actual, or reason. The `assertion.sql` text is passed *in* via `SqlWorkerData.assertions` (worker-runner.ts:15) but deliberately never emitted back out. Critically, for a sentinel-shaped check the emitted count is always the constant `1` regardless of the true table state, so "Actual" carries no information.

**(b) The workspace runner has no hint affordance, so authors dump syntax into the prompt AND into hint[0].**
`components/tutorials/WorkspaceExerciseRunner.tsx` reads `exercise.workspace` and `exercise.prompt` (L147) but never touches `exercise.hints` or `exercise.referenceSolution`. There is no Hint button, no `HintList`, and no `onHintReveal` prop on `WorkspaceExerciseRunnerProps` (L32-56). The goal line is a hardcoded string (L148). By contrast the single-file `SqlExerciseRunner.tsx` already surfaces progressive hints (L71 `const hints = exercise.hints ?? []`, L59 `hintsShown` state, L134-150 the Hint button, L181 `<HintList>`). Every L3/L4/L5 workspace exercise already carries authored `hints` arrays (script-exercise.ts:29 maps `hints: input.hints`), so the data exists — it is dead because nothing renders it. This absence is *why* the constraints practice prompt spells out the CHECK/UNIQUE SQL and *why* those hints are unordered (there was no reveal order to design against — every hint was invisible).

**(c) No author field for a learner-facing "what / why / how-to-fix".**
`SqlAssertion` is only `{suite, name, sql, isHidden?}` (lib/tutorials/types.ts:190-196). There is no channel for an explanation, a fix hint, an expected/actual value, a true-count query, or a diagnostic projection. Even a well-named assertion ("exactly the one valid row survived all three bad inserts") cannot tell the learner *which* insert leaked. The fuzzy matchers (`'%status%IN%active%'`, `'%CHECK%status%'`) additionally pass on typo'd DDL, and the one precise diagnostic is `isHidden`.

**(d) Result tables aren't tied to the failing check.**
`SqlWorkspaceResult.tsx` re-runs seed+script and renders every resulting table by name via `SqlResultGrid` (L116-125), and it sits as a sibling of `TestResultsPanel` in the runner (WorkspaceExerciseRunner.tsx L251-257). But it is never referenced by any failing assertion row — there is no `id`/anchor per table and no link from a failed check into the data it ran against. For schema-metadata assertions on empty DDL tables (ddl-create, indexes-practice), the grid shows nothing at all, so those failures are fully opaque; those cases can only be remediated with authored prose (see §5, metadata note).

**(e) `starterCode` pre-writes the graded construct.**
Beyond the `starterCode === referenceSolution` drills, many workspace `starterCode` files pre-type the exact construct under grading (see §1 Surface 2 evidence: level3.ts:78, level4.ts:145-147/412-414/1907-1913, plus L5 gaps/funnel/sessionization starters, plus every Apply starter that hands the ranking/offset/pivot clause — window-ranking-apply, window-offset-apply, dedup-apply, funnel-conversion-apply, gaps-and-islands-apply, recursive-cte starters). Nothing today prevents a starter from shipping the answer, and no test guards it. `window-ranking-drill2`'s starter (a genuine comment-stub scaffold) is the pattern the others should follow. A subset of starters DO legitimately carry `INSERT OR IGNORE` / `ON CONFLICT` purely as harness scaffolding — to keep the script running past an *expected* rejection (e.g. primary-keys-practice) — and those are NOT the graded answer; the starter guard must not ban them (see §4.4-3).

---

## 3. Fix 1 — Instructive grading feedback (pipeline)

Goal: on a failed **visible** assertion the learner sees (i) a plain-English reason, (ii) the real expected-vs-actual value (never a sentinel constant), and (iii) up to 5 offending rows with columns, linked to the visible result table. **Hidden** assertions stay masked exactly as today.

Two assertion shapes are supported and must be authored deliberately:

- **Per-row check** — the query projects the *genuinely bad* rows and is empty on pass (`SELECT <cols> WHERE <per-row cond>`). Set `showViolatingRows`. Each returned row IS a violation, so the real violation count is meaningful.
- **Cardinality / aggregate check** — the failure is "the table has the wrong number of rows / the wrong total," with no per-row predicate. You may NOT rewrite this into a bare `SELECT`-all (that returns rows in the correct state and would fail the right answer). Instead use ONE of:
  - a **WHERE-guarded projection** that returns rows only when the cardinality is wrong: `SELECT <cols> FROM t WHERE (SELECT COUNT(*) FROM t) <> <target>` — empty on pass, surfaces the surviving rows on fail (set `showViolatingRows`), or
  - the **sentinel kept as-is** (`SELECT 1 WHERE (SELECT COUNT(*) …) <> <target>`) plus an author `countQuery` so the worker can show the TRUE observed count as "Actual" (never the sentinel `1`).

### 3.1 Author schema extension (`lib/tutorials/types.ts` L189-196)

```ts
/** One assertion query — the dbt "count of violations = 0" convention (zero rows = pass). */
export interface SqlAssertion {
  suite: string
  name: string
  /**
   * Query that MUST return zero rows on success. On failure, its returned rows ARE the offending set.
   * For a cardinality/aggregate check with no per-row predicate, use a WHERE-guarded projection
   * (`... WHERE (SELECT COUNT(*) FROM t) <> <target>`) or a `SELECT 1` sentinel — NEVER a bare
   * SELECT-all, which returns rows in the correct end state and would fail the reference solution.
   */
  sql: string
  isHidden?: boolean
  /**
   * Learner-facing plain-English sentence shown on failure: what the check means and what a failure
   * implies. No SQL. Never shown for hidden assertions. Example:
   * "Your table ended with more than one row, so an INSERT that should have been rejected landed."
   *
   * REQUIRED (enforced by the assertion-standards guard, §4.4-4) for any VISIBLE assertion whose `sql`
   * is a sentinel/metadata shape (`SELECT 1 WHERE ...`, a scalar `SELECT COUNT(*) ...`, or any
   * `pragma_*`/`sqlite_master` query), because such a check can never project meaningful offending
   * rows and prose is its ONLY remediation.
   */
  explain?: string
  /**
   * Optional nudge toward the likely cause (still no literal answer SQL). Example:
   * "Check that uniqueness is a composite UNIQUE(supplier_id, sku), not a single-column PRIMARY KEY."
   */
  fixHint?: string
  /**
   * When true (visible assertions only), the worker returns up to `SAMPLE_ROW_CAP` rows from `sql`
   * plus its columns so the learner sees the actual offending data. Authors set this ONLY on
   * queries that return zero rows against the reference solution and project meaningful columns
   * (a per-row `SELECT <cols> WHERE <cond>`, or a WHERE-guarded cardinality projection), never on a
   * `SELECT 1` sentinel or a pragma/metadata query. Enforced empty-on-reference by guard §4.4-5.
   * Ignored (never returned) when `isHidden` is true.
   */
  showViolatingRows?: boolean
  /**
   * Optional human phrasing of the target, e.g. "exactly 1 row". Rendered as the Expected value.
   * The ACTUAL value is NEVER authored: it is either the real violation count (per-row projections)
   * or the scalar returned by `countQuery` (cardinality sentinels), computed by the worker.
   */
  expectedDescription?: string
  /**
   * Optional scalar query whose single cell is the TRUE observed value for a cardinality/aggregate
   * sentinel (e.g. "SELECT COUNT(*) FROM dim_product"). When set, the worker renders its result as
   * the "Actual" value on failure, so a sentinel never shows the opaque constant "1 violation(s)".
   * Use ONLY for sentinel-shaped checks; per-row projections already report a meaningful count.
   */
  countQuery?: string
  /** Unit label for `countQuery`'s scalar, default "row(s)". e.g. "row(s)", "duplicate pair(s)". */
  countUnit?: string
}
```

`SqlWorkerData.assertions` (worker-runner.ts:15) and the `SqlWorkspaceConfig.assertions` cast (workspace-runner.ts:21) widen to carry the new optional fields. `scriptExercise` (script-exercise.ts) needs **no change** — it already spreads `input.assertions` through. These fields are all optional, so every existing assertion literal compiles unchanged and every green test stays green.

### 3.2 Worker changes (`public/workers/sql-sandbox-worker.js` `gradeWorkspace` L144-164)

Capture the already-materialized `res[0]`, cap the rows, and attach richer fields. **Never** attach sample rows/explain to a hidden assertion, and **never** derive an "Actual" count from a sentinel row count.

Three round-2 corrections are baked in here:

- **Sentinel detection no longer keys off column arity.** The prior `cols.length === 1 && …` heuristic misclassified legitimate single-column diagnostic projections (`SELECT sku FROM dim_product WHERE …`) as sentinels and suppressed exactly the rows the author opted into. We instead trust the author's explicit `showViolatingRows` opt-in and, as a defensive backstop, detect a *true* sentinel by value content — a single column **whose only cell is the literal constant `1`** — rather than by column count.
- **`expected`/`actual` never render the sentinel constant `1`.** For a per-row projection, `actual` is the real violation count (each row is a violation). For a cardinality sentinel, `actual` comes from the author's `countQuery` (a real observed scalar); if there is no `countQuery`, the count strings are **suppressed entirely** (null) and the row relies on `explain` prose. The opaque `"1 violation(s)"` is therefore impossible.
- **`expected`/`actual` strings are gated on `!passed`.** Passing visible checks keep rendering the existing "pass"/"pass" affordance; only failed rows get value strings.

```js
const SAMPLE_ROW_CAP = 5

// A TRUE sentinel is a single column whose every surviving cell is the literal constant 1
// (the `SELECT 1 WHERE <cond>` convention). Content-based, NOT arity-based, so a single-column
// diagnostic projection (e.g. SELECT sku ... WHERE ...) is never misclassified.
function isConstantSentinel(resultSet) {
  const cols = resultSet.columns || []
  if (cols.length !== 1) return false
  return resultSet.values.every((r) => r.length === 1 && r[0] === 1)
}

// Runs an author-provided scalar count query and returns "<n> <unit>", or null if absent/failing.
function computeActualCount(db, assertion) {
  if (!assertion.countQuery) return null
  try {
    const c = db.exec(assertion.countQuery)
    const n = c.length && c[0].values.length ? c[0].values[0][0] : 0
    return `${n} ${assertion.countUnit || "row(s)"}`
  } catch (_) {
    return null
  }
}

for (const assertion of assertions || []) {
  try {
    const res = db.exec(assertion.sql)
    const violations = res.length ? res[0].values.length : 0
    const passed = violations === 0
    const hidden = !!assertion.isHidden
    const sentinel = res.length ? isConstantSentinel(res[0]) : false

    // Offending rows: ONLY for a visible, failing, opted-in, NON-sentinel projection.
    // Column arity is NOT used (a 1-column diagnostic is legitimate).
    let sampleRows = null
    let sampleColumns = null
    if (!passed && !hidden && assertion.showViolatingRows && res.length && !sentinel) {
      sampleColumns = res[0].columns || []
      sampleRows = res[0].values.slice(0, SAMPLE_ROW_CAP)
    }

    // ACTUAL / EXPECTED (failing visible rows only), in precedence order:
    //   1. countQuery present  -> real observed scalar (works for kept sentinels AND projections).
    //   2. non-sentinel        -> real violation count (each returned row is a violation).
    //   3. sentinel, no count  -> SUPPRESS both (null); rely on explain. Never show "1 violation(s)".
    let expected = null
    let actual = null
    if (!passed && !hidden) {
      const real = computeActualCount(db, assertion)
      if (real) {
        expected = assertion.expectedDescription ?? null
        actual = real
      } else if (!sentinel) {
        expected = assertion.expectedDescription ?? "0 violations"
        actual = `${violations} violation(s)`
      }
      // sentinel && no countQuery -> expected/actual stay null (explain-only)
    }

    results.push({
      suite: assertion.suite,
      name: assertion.name,
      passed,
      error: passed
        ? null
        : hidden
          ? `${violations} row(s) violated this check`
          : buildFailureMessage(assertion, violations, sentinel),
      isHidden: hidden,
      // Enrichment — omitted (null) for hidden checks and for passing checks, so nothing leaks
      // through the marker JSON and passing visible rows keep their existing pass/pass display.
      explain: passed || hidden ? null : (assertion.explain ?? null),
      fixHint: passed || hidden ? null : (assertion.fixHint ?? null),
      expected,
      actual,
      sampleColumns,
      sampleRows,
    })
  } catch (error) {
    results.push({
      suite: assertion.suite, name: assertion.name, passed: false,
      error: error && error.message ? error.message : String(error),
      isHidden: !!assertion.isHidden,
    })
  }
}
```

```js
// Richer than the bare count, but still no assertion SQL. For a sentinel WITHOUT explain we do NOT
// fall back to the opaque constant count; the §4.4-4 guard forbids that state on any visible sentinel.
function buildFailureMessage(assertion, violations, sentinel) {
  if (assertion.explain) return assertion.explain
  if (sentinel) return "This check did not pass. See the check description."
  const target = assertion.expectedDescription ? `Expected ${assertion.expectedDescription}. ` : ""
  return `${target}${violations} row(s) violated this check`
}
```

**Idempotency messages (L179-192).** Keep the existing structure; make the unscoped message name the delta plainly and add an `explain`:

```js
error: first === second ? null
  : scoped
    ? "Running your load twice changed the graded tables — the second run must be a no-op. A DROP/CREATE/INSERT rebuild or an upsert (ON CONFLICT / INSERT OR IGNORE) makes it idempotent."
    : `Not idempotent: the first run left ${first} row(s), the second left ${second}. Re-running your script must not add rows.`,
```

### 3.3 Pass-through (marker → main thread → run hook)

- `lib/workspace-execution/types.ts` `WorkspaceTestResult` (L20-26): add the optional enrichment fields so the parsed marker is typed. `sampleRows`/`sampleColumns` widen the contract but stay optional:

```ts
export interface WorkspaceTestResult {
  suite: string
  name: string
  passed: boolean
  error: string | null
  isHidden?: boolean
  explain?: string | null
  fixHint?: string | null
  expected?: string | null
  actual?: string | null
  sampleColumns?: string[] | null
  sampleRows?: Array<Array<string | number | null>> | null
}
```

- `workspace-marker.ts` (`parseWorkspaceMarker` L18-31) and `worker-runner.ts` (onmessage L58-102) need **no logic change** — they carry the JSON array opaquely; only the type widened. `executeWorkspaceScenarioSqlClientSide` (workspace-runner.ts:60-70) passes `parsed` straight through.
- `lib/tutorials/test-result-mapping.ts` `RawResultRow` (L8-18): add the same optional fields. Then extend the **visible** branch of `mapResultRow` (L37-46) to thread them, and compose the error string. Because the worker now emits `expected`/`actual` as **null** on a failing sentinel (not the constant `1`), the mapper must NOT coerce those nulls back to "pass"/"fail" on a failing row — a null Expected/Actual on a failing row means "suppressed, show explain only," which the panel renders as an absent block (§3.4):

```ts
// VISIBLE branch (L37-46) — hidden branch (L24-35) is UNCHANGED, so masking holds.
const parts = [row.error, row.fixHint].filter(Boolean)
return {
  description,
  passed: row.passed,
  input: row.input ?? row.suite ?? null,
  // Passing rows keep today's "pass"/"pass". Failing rows show the real value, or null when the
  // worker deliberately suppressed it (sentinel with no countQuery) — panel omits the block then.
  expected: row.expected ?? (row.passed ? "pass" : null),
  actual: row.actual ?? (row.passed ? "pass" : null),
  error: parts.length ? parts.join(" ") : row.error,
  sampleColumns: row.sampleColumns ?? null,
  sampleRows: row.sampleRows ?? null,
}
```

`TestResult` (TestResultsPanel.tsx L16-23) gains optional `sampleColumns?: string[] | null; sampleRows?: ... | null`, and `expected`/`actual` become nullable. Single-file rows never set the sample fields, so L1/L2 grids are untouched.

### 3.4 UI (`TestResultsPanel.tsx` + `SqlWorkspaceResult.tsx`)

Two adjustments in the expanded body of a **failed** row (TestResultsPanel.tsx L174-201):

1. **Guard the Expected/Actual block on non-null values.** Today L183-194 render Expected/Actual unconditionally. Because a failing sentinel now passes `expected: null, actual: null` (explain-only), render that block only when both are present (or when the row passed). A failing sentinel then shows just the `explain`/`fixHint` prose — never a blank or "fail"/"fail" line.

2. **Render sample rows when present:**

```tsx
{!result.passed && result.sampleRows && result.sampleColumns && (
  <div className="mt-1 overflow-x-auto">
    <div className="text-muted-foreground mb-1">Rows that failed this check:</div>
    <table className="text-xs">
      <thead><tr>{result.sampleColumns.map((c) => <th key={c} className="px-1 text-left">{c}</th>)}</tr></thead>
      <tbody>
        {result.sampleRows.map((r, i) => (
          <tr key={i}>{r.map((v, j) => <td key={j} className="px-1 font-mono">{v === null ? "NULL" : String(v)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

Tie-in to the result grid (root cause d): give each table in `SqlWorkspaceResult.tsx` a stable anchor `id={`rt-${table.name}`}` (L116-125), and when an assertion `suite` names a table, render a "See the `orders` table" link in the failed row that scrolls to it. This is UI-only wiring; no sql.js change.

### 3.5 Before/after for the l3 constraints practice

Requires the content sweep (§5) to (i) convert the "rows" cardinality check to a form that stays empty on pass, (ii) add `explain`/`expectedDescription`/`countQuery`, and (iii) un-hide or duplicate the composite-UNIQUE diagnostic as a visible (explain-only, metadata) check.

**Why the naive rewrite is wrong.** A first instinct is to make the assertion `SELECT supplier_id, sku, status, unit_price_cents FROM dim_product` with `showViolatingRows`. But in the CORRECT end state `dim_product` holds exactly one valid row, so that query returns 1 row → `violations = 1` → `passed = false`. It **fails the reference solution** and labels the single legitimate row a "violation." Cardinality checks have no per-row offending predicate, so the "project the offending rows" recipe does not apply. Use the WHERE-guarded projection instead (empty on pass, surfaces the surviving rows only when the count is wrong).

**Before** (single line, all a learner gets):
```
PRACTICE: exactly the one valid row survived all three bad inserts — 1 row(s) violated this check
```

**After** — assertion authored as a WHERE-guarded cardinality projection:
```ts
{
  suite: "dim_product",
  name: "Exactly the one valid row survives the three bad inserts",
  // Returns NO rows when the table holds exactly one row (the correct end state); surfaces the
  // surviving rows ONLY when the count is wrong. Passes the reference solution (guard §4.4-5).
  sql: "SELECT supplier_id, sku, status, unit_price_cents FROM dim_product WHERE (SELECT COUNT(*) FROM dim_product) <> 1",
  showViolatingRows: true,
  expectedDescription: "exactly 1 row",
  countQuery: "SELECT COUNT(*) FROM dim_product",
  countUnit: "row(s)",
  explain: "More than one row survived. An INSERT OR IGNORE that should have been rejected landed instead.",
  fixHint: "Uniqueness must be a composite UNIQUE(supplier_id, sku), not a single-column PRIMARY KEY, or the duplicate pair is allowed.",
}
```
renders (Actual comes from `countQuery`, so it is a real count, never the sentinel `1`, and its unit matches Expected):
```
Exactly the one valid row survives the three bad inserts   [FAIL]
Expected: exactly 1 row
Actual:   2 row(s)
More than one row survived. An INSERT OR IGNORE that should have been rejected landed instead.
Uniqueness must be a composite UNIQUE(supplier_id, sku), not a single-column PRIMARY KEY, or the duplicate pair is allowed.
Rows that failed this check:
  supplier_id | sku    | status  | unit_price_cents
  10          | A-1    | active  | 500
  11          | A-1    | active  | 500      ← the extra row that should not exist
```

The learner now sees the count is 2, both surviving rows, the plain-English reason, and the root-cause nudge — directly answering both halves of the complaint. Against the reference solution the same assertion returns zero rows and passes, satisfying guard §4.4-5.

(If a lesson's cardinality check has no natural columns to surface, keep the `SELECT 1` sentinel, drop `showViolatingRows`, and rely on `countQuery` + `explain`. The Actual still shows the true observed count; only the sample-row table is absent.)

---

## 4. Fix 2 — Hints affordance + de-giving across all three surfaces

Fix-2 is not "move SQL from prompt to hint." It is: give the workspace a gated hint affordance, then enforce that literal answer-SQL appears **only in the final gated hint** — never in the prompt (Surface 1), never pre-written in `starterCode` (Surface 2), and never in a non-final hint (Surface 3).

### 4.1 Add progressive hints to `WorkspaceExerciseRunner.tsx` (reuse the single-file mechanism)

Mirror `SqlExerciseRunner.tsx` exactly; the data (`exercise.hints`) already exists.

1. **Imports:** add `Lightbulb` to the lucide import (L4) and `import { HintList } from "./HintList"`.
2. **State/derive:** `const hints = exercise.hints ?? []` and `const [hintsShown, setHintsShown] = useState(0)`.
3. **Prop:** add to `WorkspaceExerciseRunnerProps` (L32-56) — keep optional so the Python player and callers stay unchanged:
   ```ts
   /** Fires when the learner reveals a hint (1-based index, total). Drives Sable. Optional. */
   onHintReveal?: (index: number, total: number) => void
   ```
4. **Button:** in the button row (L213-240, beside Run tests / Reset) drop in the identical gated Hint button:
   ```tsx
   {hints.length > 0 && (
     <Button variant="outline" disabled={hintsShown >= hints.length} className="gap-2"
       onClick={() => setHintsShown((n) => { const next = Math.min(n + 1, hints.length); if (next > n) onHintReveal?.(next, hints.length); return next })}>
       <Lightbulb className="h-4 w-4" />
       {hintsShown === 0 ? "Hint" : `Hint ${Math.min(hintsShown + 1, hints.length)}`}
     </Button>
   )}
   ```
5. **Panel:** render `<HintList hints={hints.slice(0, hintsShown)} total={hints.length} />` just above `<TestResultsPanel />` (L251). `HintList` needs no change (it renders nothing until the first reveal, is collapsible, markdown-renders, and auto-reopens — HintList.tsx L15-71).
6. **Goal copy:** make L148 hint-aware, e.g. append `" Stuck? Tap Hint."` when `hints.length > 0`.
7. **Wire the player:** `SqlLessonPlayer.tsx` L193-205 — pass a real `onHintReveal` handler to the `WorkspaceExerciseRunner` (and, for parity, to `SqlExerciseRunner` at L208-215, which is currently omitted). Both runner props are dead today; this is the same fix single-file needs. The Python `LessonPlayer` may pass nothing (prop is optional) — no Python scope creep.

Because this affordance only reveals hints **one at a time in author order**, the hint *order* now carries meaning — which is exactly why §4.2c below requires a graded progression rather than a "safe sink."

### 4.2 The three-surface de-giving standard

The graded construct (a `CHECK`/`UNIQUE`/`FOREIGN KEY` clause, a window function + `OVER` frame, a pivot `MIN(CASE...)`, an upsert `ON CONFLICT`, etc.) is the *deliverable*. It may appear in exactly one place: the final gated hint. Apply this to every workspace exercise in §5.

#### 4.2a Prompt standard (Surface 1)

- **Lead with the deliverable.** Apply: `"Write a script that creates ..."`; Practice: open with a real-world scenario, then `"Write a script that ..."`.
- **State rules in business/data terms, not SQL.** e.g. instead of `CHECK (status IN ('active','discontinued'))` write *"reject any status other than active or discontinued"*; instead of `UNIQUE (supplier_id, sku)` write *"a supplier cannot list the same SKU twice, but two suppliers may share a SKU."*
- **Move the syntax to a gated hint.** The literal `CHECK(...)`/`UNIQUE(...)`/window clause becomes the last hint, revealed on demand via the new Hint button.
- Keep output-contract facts (column names, enum *domain values* as prose, thresholds) in the prompt — those are the deliverable, not syntax.
- No em dashes. Apply stays direct; Practice stays scenario-framed. Apply prompts **may name a technique** (e.g. "use a window function"); they must not paste the literal clause. That distinction is what the guard in §4.4 encodes, so the guard flags literal syntax, not technique names.

#### 4.2b `starterCode` standard (Surface 2)

A starter must never ship the graded construct pre-written. The target scaffold is the `window-ranking-drill2` pattern: table/CTE skeleton plus a comment stub naming *what* to write, not the clause itself.

- If `starterCode` currently contains the graded DDL/window/pivot, replace that region with a comment-stub scaffold, e.g.
  ```sql
  CREATE TABLE dim_product (
    -- add the columns and constraints described in the prompt:
    -- price cannot be negative, status limited to the two allowed values,
    -- and a supplier cannot list the same SKU twice
  );
  ```
- **Preserve harness scaffolding.** Some starters legitimately include `INSERT OR IGNORE` / `ON CONFLICT` *not* as the graded answer but to keep the script running past an expected rejection (e.g. primary-keys-practice). That scaffolding stays; it is the graded *pivot/window/constraint clause* that becomes a stub, not the harness insert. The starter guard (§4.4-3) is scoped to respect this.
- Preserve any *given* scaffolding that is legitimately provided (seed references, unrelated columns, boilerplate) so the exercise still runs.
- This action is `S` in §5 and now applies to **every** workspace exercise whose starter pre-writes the graded construct, not only the byte-identical `starterCode === referenceSolution` drills. The full S-set is derived mechanically by running `STARTER_ANSWER_SQL` over all current starters (§4.3) — every hit is tagged S.
- **Verify each scaffolded starter still runs its reference solution to a pass** after the graded region becomes a stub (the reference solution replaces the stub; the surrounding harness must still execute). This is a per-exercise check in the sweep, not just a guard.

#### 4.2c Hint-progression standard (Surface 3)

Because one Hint tap now reveals `hints[0]`, a full-answer `hints[0]` is as bad as a full-answer prompt. Every workspace exercise's hints must escalate:

- **`hints[0]` — approach in prose.** Names the strategy, no SQL. ("You need the database itself to reject bad rows, so reach for table constraints.")
- **Intermediate hints — name the construct.** ("Uniqueness across two columns is a table-level `UNIQUE(...)`; range and enum rules are column `CHECK`s.") A construct *name* is allowed; a complete answer line is not.
- **Final hint — the literal SQL.** The clause removed from the prompt/starter lands here and only here.

The sweep must *soften* existing `hints[0]`s that paste the full answer (L4 scd-type1-practice, snowflake-practice, extra-practice finals, etc.), reordering so literal SQL sinks to the last hint. This is action `H` in §5, now defined as "author a graded 0→N progression, not merely confirm the syntax exists somewhere."

### 4.3 Reconciling the guard scope against the worklist

The new machine guards must flag exactly the §5 worklist and produce **zero false positives** against Apply prompts/starters the audit rated acceptable. Three scoping decisions, one per guarded surface:

- **Workspace prompts (L3/L4/L5)** are machine-guarded for literal answer-SQL (§4.4-1). Before enabling, run the guard against the current tree and confirm its flag-set equals the set of `P`-tagged **workspace** exercises in §5 and does *not* flag any exercise the audit rated `ok`/`acceptable`. If a regex flags an approved Apply prompt (e.g. one that says "use a window function" without pasting `OVER(...)`), narrow that regex to require literal punctuation (a following `(`, a backtick-fenced expression) rather than the technique word.
- **Workspace `starterCode` (L2 drills + L3/L4/L5)** are machine-guarded with the narrower `STARTER_ANSWER_SQL` (§4.4-3). **Before enabling, run `STARTER_ANSWER_SQL` over every current workspace/drill starter and reconcile the hit-set against the §5 `S`-tags exactly as for prompts.** Every hit MUST be an `S` row (add any missing exercise to §5 — this round added window-ranking-apply, window-offset-apply, dedup-apply, funnel-conversion-apply, gaps-and-islands-apply, and the recursive-cte starters), and every `S` row MUST be a hit or be justified. Any starter that hits ONLY on a harness construct (`INSERT OR IGNORE`/`ON CONFLICT` kept to run past an expected rejection) is excluded by `STARTER_ANSWER_SQL`'s construction (§4.4-3); if a starter genuinely needs a graded-looking construct as harness, add it to the documented `STARTER_GUARD_ALLOWLIST` with a one-line reason. The guard's final flag-set must be empty at enable time.
- **Single-file prompts (L1/L2)** are **review-only**, not machine-guarded for prose technique mentions (those legitimately name operators). The one machine check that *does* apply to them is a narrow "literal enum tuple / literal comparison expression inside backticks" pattern (§4.4-2), which catches `` `('draft','deprecated')` `` and `` `total_cents >= 5000` `` without flagging "use BETWEEN." L1/L2 `P` rows are otherwise verified by the acceptance-criteria review pass, explicitly marked review-only so no one assumes a guard covers them.

### 4.4 Machine guards (`prompt-standards.test.ts` + `reference-solutions.test.ts` + a new assertion-standards guard)

Five guards make the sweep verifiable and regression-proof. All are additive; existing assertions stay green. Because each guard scans the **whole tree**, they ship **skipped/xfail** and are flipped to enforcing only after the sweep completes (§6).

**(1) Workspace-prompt answer-SQL guard** (`prompt-standards.test.ts`). Thread `executionMode` onto `PromptRef` (additive) so the guard targets `course === "sql" && executionMode === "workspace"`.

```ts
// Literal SQL that IS the graded skill must live in the FINAL hint, not a workspace prompt.
const ANSWER_SQL = [
  /\bCHECK\s*\(/i, /\bUNIQUE\s*\([^)]*,/i, /\bPRIMARY\s+KEY\s*\(/i,
  /\bON\s+DELETE\s+(CASCADE|RESTRICT|SET\s+NULL)/i, /\bON\s+CONFLICT\s*\(/i,
  /\bINSERT\s+OR\s+IGNORE\b/i, /\bDEFAULT\s*\(?\s*datetime\(/i,
  /\bOVER\s*\(/i, /\b(ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|NTILE)\s*\(/i,
  /`[^`]*\b(>=|<=|<>|=|IN)\b[^`]*`/,  // backtick-fenced literal comparison/enum expression
]
it("no SQL workspace prompt embeds literal answer SQL (put it in a hint)", () => {
  const bad = PROMPTS.filter(
    (r) => r.course === "sql" && r.executionMode === "workspace" &&
      ANSWER_SQL.some((re) => re.test(r.prompt))
  )
  expect(bad.map(label), "move literal DDL/CHECK/UNIQUE/window SQL from the prompt into a gated hint").toEqual([])
})
```

Note the round-2 changes vs the draft: dropped the over-broad bare `/\bSELECT\s+DISTINCT\b/i`, `/\bGROUP\s+BY\s+\w+\.\w+/i`, and `/\bIS\s+NOT\s+\w+\.\w+/i` patterns (they flagged approved Apply prompts that legitimately name the technique); the comparison-operator pattern is now **only** matched inside backticks. Before enabling, prove the flag-set equals the §5 workspace `P` rows (§4.3).

**(2) Single-file literal-expression guard** (`prompt-standards.test.ts`, narrow). Applies to `course === "sql" && executionMode !== "workspace"`. Reuses only the backtick-fenced enum/comparison pattern from list (1) — nothing that would flag a prose operator mention. This machine-covers the L1/L2 `P` rows whose offense is a pasted literal (`` `('draft','deprecated')` ``, `` `total_cents >= 5000` ``, `` `total_cents / 100.0` ``) while leaving pure technique-naming as review-only.

**(3) `starterCode` answer-SQL guard** (`reference-solutions.test.ts`, extended). Uses a **narrower** `STARTER_ANSWER_SQL` than the prompt set: it forbids only constructs that are unambiguously the graded answer and **excludes harness-necessary constructs** (`INSERT OR IGNORE`, `ON CONFLICT`) that a starter legitimately keeps to run past an expected rejection. A small documented `STARTER_GUARD_ALLOWLIST` handles the rare exercise that needs a graded-looking construct purely as harness scaffolding.

```ts
// Graded-only subset. Excludes INSERT OR IGNORE and ON CONFLICT (harness constructs — a starter may
// keep them to run past an expected rejection; they are not the graded skill). DEFAULT (datetime(
// stays because in ddl-create it IS the graded default clause.
const STARTER_ANSWER_SQL = [
  /\bCHECK\s*\(/i, /\bUNIQUE\s*\([^)]*,/i, /\bPRIMARY\s+KEY\s*\(/i,
  /\bON\s+DELETE\s+(CASCADE|RESTRICT|SET\s+NULL)/i, /\bDEFAULT\s*\(?\s*datetime\(/i,
  /\bOVER\s*\(/i, /\b(ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|NTILE)\s*\(/i,
  /\bMIN\s*\(\s*CASE\b/i,  // the graded pivot
]
// Exercises that legitimately carry a graded-looking construct as pure harness scaffolding.
const STARTER_GUARD_ALLOWLIST = new Set<string>([/* e.g. "primary-keys-practice" — reason documented */])

it("no workspace starterCode pre-writes the graded construct", () => {
  const bad = ALL_WORKSPACE_EXERCISES.filter(
    (e) => e.starterCode && !STARTER_GUARD_ALLOWLIST.has(e.slug) &&
      STARTER_ANSWER_SQL.some((re) => re.test(e.starterCode))
  )
  expect(bad.map((e) => e.slug), "replace pre-written DDL/window/pivot in starterCode with a comment-stub scaffold").toEqual([])
})
it("no drill starterCode equals its referenceSolution", () => {
  const bad = ALL_DRILLS.filter((d) => norm(d.starterCode) === norm(d.referenceSolution))
  expect(bad.map((d) => d.slug)).toEqual([])
})
```

This is the guard that makes Surface 2 systemic rather than spot-fixed. Its flag-set is reconciled against the §5 `S`-tags before enabling (§4.3), and every remaining scaffolded starter is re-run against its reference solution to confirm it still passes (§4.2b).

**(4) Assertion-opacity guard** (new `assertion-standards.test.ts`, or a block in `reference-solutions.test.ts`). Makes the opacity fix measurable across every level, not just the flagship. Every **visible** `SqlAssertion` whose `sql` is a sentinel/metadata shape MUST carry an `explain`. The pragma coverage is broadened and the `COUNT(*)` rule is tightened so it does not force `explain` onto a projecting `HAVING COUNT(*)>1` query that already surfaces rows:

```ts
const SENTINEL_SHAPE = [
  /^\s*SELECT\s+1\b/i,                       // SELECT 1 WHERE ... sentinels
  /\bSELECT\s+COUNT\s*\(\s*\*\s*\)/i,        // SCALAR count sentinel (not `SELECT col, COUNT(*) ... HAVING`)
  /\bpragma_\w+\b/i,                         // table_info, index_list, foreign_key_list, index_info, ...
  /\bsqlite_master\b/i,
]
it("every visible sentinel/metadata assertion carries an explain", () => {
  const bad = ALL_ASSERTIONS.filter(
    (a) => !a.isHidden && !a.showViolatingRows &&   // a projecting check that surfaces rows is exempt
      SENTINEL_SHAPE.some((re) => re.test(a.sql)) && !a.explain
  )
  expect(bad.map((a) => `${a.lessonSlug}:${a.name}`),
    "a sentinel/metadata assertion can never project offending rows, so it MUST set explain").toEqual([])
})
```

The `/\bpragma_\w+\b/i` catch closes the round-2 hole where `pragma_foreign_key_list` (foreign-keys-* `ON DELETE` checks) and `pragma_index_info` (l3 composite-UNIQUE diagnostic, level3.ts:1007) escaped the required `explain`. Re-run the guard and confirm every FK/index/PK-shape assertion across L3 is flagged and given `explain` before claiming coverage. The scalar-`SELECT COUNT(*)` pattern (rather than a bare `COUNT(*)`) plus the `!a.showViolatingRows` exemption keeps a projecting `HAVING COUNT(*)>1` diagnostic from being forced to carry redundant prose.

**(5) `showViolatingRows`-is-empty-on-reference guard** (new, in `reference-solutions.test.ts`). Proves that no `showViolatingRows` assertion fails the correct answer — the exact defect the flagship rewrite would have introduced. For every workspace exercise, run seed + `referenceSolution` in the sql.js harness, then run each `showViolatingRows` assertion's `sql` and assert it returns **zero rows**:

```ts
it("every showViolatingRows assertion returns zero rows against its own reference solution", async () => {
  const failures: string[] = []
  for (const e of ALL_WORKSPACE_EXERCISES) {
    const db = await loadReferenceDb(e)  // seed + referenceSolution, same harness as sql-sandbox tests
    for (const a of e.assertions.filter((x) => x.showViolatingRows)) {
      const res = db.exec(a.sql)
      const n = res.length ? res[0].values.length : 0
      if (n !== 0) failures.push(`${e.slug}:${a.name} -> ${n} rows`)
    }
    db.close()
  }
  expect(failures, "a showViolatingRows query must be EMPTY on the reference solution (0 rows = pass)").toEqual([])
})
```

This is the guard that would have caught the flagship bug and makes the "project the offending rows" recipe safe to apply across the sweep. It runs against the existing reference-solution harness, so it adds no new execution surface.

Threading `executionMode` and exposing `ALL_ASSERTIONS`/`ALL_WORKSPACE_EXERCISES` collections is additive; the existing five prompt-standard assertions (L61-100) are unchanged and stay green.

### 4.5 Example — constraints-practice, all three surfaces

> **Prompt before:** "...a **non-negative** price: `CHECK (unit_price_cents >= 0)`; ... an **enum**: `CHECK (status IN ('active','discontinued'))`; ... a composite `UNIQUE (supplier_id, sku)`."
> **Prompt after:** "A supplier catalog load keeps landing bad rows. Write a script that creates `dim_product` so the database itself rejects them: a price can never be negative, a status must be either `active` or `discontinued`, and a supplier can never list the same SKU twice (though two different suppliers may share a SKU). Then run the four inserts below; exactly the one valid row should survive."
>
> **`starterCode` after** (comment-stub scaffold, not the answer; the four inserts stay because they are harness, not the graded constraint):
> ```sql
> CREATE TABLE dim_product (
>   -- columns: supplier_id, sku, status, unit_price_cents
>   -- constraints: price never negative; status limited to the two allowed values;
>   -- a supplier cannot list the same SKU twice (composite uniqueness)
> );
> -- then the four inserts from the prompt (kept as-is; they are the test harness, not the answer)
> ```
>
> **Hints after (graded progression):**
> - hint[0] (prose): "Make the database reject bad rows for you with table constraints, instead of validating in application code."
> - hint[1] (names constructs): "Range and enum rules are column `CHECK` constraints. 'A supplier cannot list the same SKU twice' is uniqueness across two columns."
> - hint[2] (literal SQL, final only): "`UNIQUE(supplier_id, sku)` at the table level (not a single-column key). `CHECK(unit_price_cents >= 0)` and `CHECK(status IN ('active','discontinued'))` as column checks."

---

## 5. Content remediation checklist (loop-agent worklist)

All rows are per-exercise. **Action key:**
- `P` = de-give prompt (move syntax to the final gated hint, keep deliverable + rules-in-prose).
- `E` = add `explain`/`expectedDescription`/`fixHint` (and `countQuery` for cardinality sentinels) to that exercise's assertions and, where the check has genuinely bad rows to surface, rewrite the assertion `sql` to project offending columns + set `showViolatingRows`. **Never rewrite a cardinality/aggregate check into a bare `SELECT`-all** (it fails the reference solution); use a WHERE-guarded projection or a sentinel + `countQuery` (§3.5). **Every visible sentinel/metadata assertion must end with a non-empty `explain` (guard §4.4-4); every `showViolatingRows` assertion must be empty against its reference solution (guard §4.4-5).**
- `S` = replace `starterCode` that pre-writes the graded construct (whether byte-identical to `referenceSolution` OR merely pre-typing the graded DDL/window/pivot) with a comment-stub scaffold (§4.2b), preserving harness inserts. **The S-set is derived mechanically by running `STARTER_ANSWER_SQL` over every starter (§4.3); the rows below are the reconciled result.** Re-run the reference solution against the scaffolded starter.
- `H` = author a graded hint progression (§4.2c): `hints[0]` prose, intermediate names construct, only the final hint carries literal SQL; soften any existing full-answer `hints[0]`.

Every workspace exercise already has authored `hints`, so `H` is usually reorder + soften, not new authoring. Order is by level.

**Assertion-rewrite decision (applies to every `E`):**
- **Per-row bad rows exist** (an individual row is identifiably wrong): project them — `SELECT <bad cols> WHERE <per-row cond>`, empty on pass, set `showViolatingRows`.
- **Cardinality / aggregate check** (wrong row count or wrong total, no per-row predicate — e.g. the l3 "exactly one row survives"): use a WHERE-guarded projection (`... WHERE (SELECT COUNT(*) FROM t) <> target`) with `showViolatingRows`, OR keep the sentinel and add `countQuery` so Actual shows the true observed count. Do NOT project all rows unconditionally.
- **Metadata / pragma check** (see next note): explain-only, no `showViolatingRows`.

**Metadata / empty-table note (applies to every `E` on a pragma/`sqlite_master`/empty-DDL check):** these run against zero-row DDL tables and their result sets are schema metadata, not learner rows, so `showViolatingRows` is **inapplicable** — do not try to make them project offending rows. Their ONLY remediation is authored `explain`/`expectedDescription`/`fixHint` text that names the missing constraint/index concretely (e.g. "`fact_sales` has no index on `customer_sk`, so the join scan is unindexed"). Lessons in this category: ddl-create-apply, ddl-create-practice, indexes-practice, foreign-keys-* schema-shape checks (`pragma_foreign_key_list`), primary-keys-practice PK-shape checks, and any `pragma_table_info`/`pragma_index_list`/`pragma_foreign_key_list`/`pragma_index_info`/`sqlite_master LIKE` assertion.

### Level 1 — single-file (assertions n/a; prompt de-giving only; L1 `P` rows are review-only per §4.3, machine-covered only where a backtick literal exists)

| Exercise | Verdict | Offending snippet | Action |
|---|---|---|---|
| in-between-like-practice | over-giving | `TMP-%`, `('draft','deprecated')`, "NOT BETWEEN" | P, H |
| expressions-apply | borderline | `qty * unit_price_cents` | P, H |
| where-basics-apply | borderline | `status='paid'` and `total_cents >= 5000` | P, H |
| where-basics-practice | borderline | `total_cents > 0` | P, H |
| in-between-like-apply | borderline | `('AUD','HOM')`, `2000..9000` | P, H |
| null-logic-apply | borderline | `email IS NULL` | P, H |
| null-logic-practice | borderline | IS-NULL-as-value technique lecture | P, H |
| boolean-and-or-apply | borderline | full parenthesized WHERE | P, H |
| cast-types-apply | borderline | `total_cents / 100.0` | P, H |
| cast-types-practice | borderline | `amount_cents / 100.0` | P, H |
| strings-apply | borderline | `LOWER(TRIM(email))` | P, H |
| dates-practice | borderline | `strftime('%w', ...)` | P, H |

### Level 2 — single-file + drills (assertions n/a; `S` now also flags starters that pre-type the graded construct, not just byte-identical ones)

| Exercise | Verdict | Offending snippet | Action |
|---|---|---|---|
| having-practice | over-giving | `WHERE status='paid'` + "two-condition HAVING" | P, H |
| inner-join-practice | over-giving | full join recipe with keys | P, H |
| ctes-practice | over-giving | three named CTE stages + bodies | P, H |
| ctes-drill2 | over-giving | two chained CTEs named + final WHERE | P, S, H |
| aggregates-practice | borderline | names `AVG`, pre-decides COALESCE split | P, H |
| aggregates-drill3 | borderline | "conditional aggregation" + CASE shell in starter | P, S |
| self-join-practice | borderline | `FULL OUTER JOIN` on `customer_id` | P, H |
| set-ops-practice | borderline | `EXCEPT` (twice) | P, H |
| subqueries-practice | borderline | "correlated subquery" | P, H |
| subqueries-drill1/2/3 | borderline | scalar / IN / correlated named | P |
| case-practice | borderline | "conditional aggregation" | P, H |
| inner-join-drill2 | borderline | 3-table chain dictated | P |
| left-join-drill2 | borderline | "anti-join pattern" | P |
| ctes-drill1 | borderline | CTE name `big_orders` + literal predicate | P, H |
| ctes-drill3 | borderline | CTE name + join-back plan | P, S |
| inner-join-drill3 | ok (prompt) | starter == reference | S |
| left-join-drill3 | ok (prompt) | starter == reference | S |
| group-by-apply | ok (prompt) | hint #3 leaks internal `orderMatters` field | H (reword hint) |
| left-join-practice | ok (prompt) | starterCode comment leaks "COALESCE the SUM" | S (reword scaffold) |

### Level 3 — workspace (needs `E` on assertions + `P` + `S` where starter pre-writes DDL + render hints)

| Exercise | Verdict | Offending snippet | Action |
|---|---|---|---|
| constraints-practice ★flagship | over-giving | `CHECK(unit_price_cents>=0)`, `CHECK(status IN(...))`, `UNIQUE(supplier_id,sku)` | P, E, S, H; rewrite the "rows" check as a WHERE-guarded cardinality projection + `countQuery` (§3.5, NOT a bare SELECT-all); also un-hide/duplicate the composite-UNIQUE diagnostic (level3.ts:1007, `pragma_index_info`, explain-only metadata) as a visible check |
| constraints-apply | over-giving | enum list `('pending','paid','shipped','cancelled')` | P, E, S, H |
| ddl-create-practice | over-giving | literal `DEFAULT` clauses + `datetime('now')` | P, E, S, H |
| ddl-create-apply | borderline (opaque) | starter leaks `(datetime('now'))` (level3.ts:78) | P, E, S |
| foreign-keys-practice | over-giving | per-rel `ON DELETE` policies + literal DELETE | P, E, S, H |
| normalize-1nf-practice | over-giving | recipe + `WHERE product_N IS NOT NULL` | P, E, H |
| junction-tables-practice | over-giving | `position INTEGER NOT NULL`, `UNIQUE(a,b)`, composite PK | P, E, S, H |
| indexes-practice | over-giving (opaque, metadata) | dictates `fact_sales(customer_sk)`/`(product_sk)` | P, E (explain-only), H |
| insert-populate-apply | borderline | `UPPER(TRIM(sku))` | P, E |
| primary-keys-practice | borderline | `UNIQUE`, `INSERT OR IGNORE` (INSERT OR IGNORE is HARNESS — keep it; allowlisted in §4.4-3) | P, E, S |
| foreign-keys-apply | borderline | `ON DELETE RESTRICT`, guarded-insert skeleton | P, E, S |
| normalize-1nf-apply | borderline | `WHERE product_b IS NOT NULL` | P, E |
| normalize-2nf-3nf-apply | borderline | `INSERT … SELECT DISTINCT` | P, E |
| denormalization-apply | borderline | CTAS + literal DROP | P, E |
| cardinality-practice | borderline (inversion) | hands FK placement (Apply leaves it) | P, E |
| junction-tables-apply | borderline | full junction structure spelled | P, E, S |
| (all 24 L3 exercises) | — | every visible sentinel/metadata assertion must carry `explain`; every FK/index/PK-shape check (`pragma_foreign_key_list`/`pragma_index_info`) included | E (enforced by guard §4.4-4; metadata lessons are explain-only) |

### Level 4 — workspace (window/upsert starters routinely pre-write the clause → `S` added; reconciled via §4.3)

| Exercise | Verdict | Offending snippet | Action |
|---|---|---|---|
| scd-type2-practice | over-giving | `stg.city IS NOT dim.city` + literal SCD2 assigns | P, E, H |
| scd-type1-practice | over-giving (hint[0]) | hint[0] = entire `ON CONFLICT` statement (level4.ts:1433) | H (soften hint[0]), P |
| idempotent-merge-practice | over-giving | `>= date(MAX(event_ts), '-3 days')` | P, E, H |
| data-quality-practice | over-giving | `('active','churned','prospect')` tuple | P, E, H |
| fact-types-practice | over-giving | `SUM(revenue)/SUM(order_count)` + `* 1.0` | P, E, H |
| snowflake-practice | over-giving (hint[2]) | full join path + `GROUP BY c.category_manager`; hint[2] = whole query | P, E, H (soften hint[2]) |
| capstone-practice | over-giving | `sale_date >= effective_from AND sale_date < effective_to` | P, E, H |
| window-frames-apply | borderline | `SUM(...) OVER (...)`; starter hands `OVER` (level4.ts:145-147) | P, S |
| window-ranking-apply | borderline | starter hands `ROW_NUMBER() OVER` (level4.ts window-ranking-apply starter) | P, S |
| window-offset-apply | borderline | starter hands `LAG(...) OVER` | P, S |
| dedup-apply | borderline | starter hands `ROW_NUMBER()` dedup window | P, S |
| idempotent-merge-apply | borderline | `ON CONFLICT(sku) DO UPDATE` (graded upsert in prompt; ON CONFLICT in starter only if harness) | P, S |
| star-build-practice | borderline | `SELECT DISTINCT` | P |
| explain-practice | borderline | exact index columns | P, E (explain-only) |
| capstone-apply | borderline | literal `effective_to='2026-03-01', is_current=0` | P |
| window-ranking-practice | borderline | maps cols to ROW_NUMBER/RANK/DENSE_RANK; starter hands windows (level4.ts:412-414) | P, S |
| window-ranking-drill1/3, window-offset-drill1/2/3 | borderline | names window fn; starter == reference (level4.ts:1907-1913) | P, S |
| window-ranking-drill2 | borderline | names `RANK()` (starter is already a real scaffold) | P |

L4 assertion opacity is a relative strength (value-embedding names), but the §4.4-4 guard still requires an `explain` on any L4 assertion that is a sentinel/metadata shape; add `showViolatingRows` (per-row form) or `countQuery` (cardinality form) on the value-diff assertions where the sentinel hides data.

### Level 5 — workspace + single-file (opaque EXCEPT-reconciliation checks + pre-writing starters)

| Exercise | Verdict | Offending snippet | Action |
|---|---|---|---|
| gaps-and-islands-practice | over-giving (starter) | starter pre-writes both `ROW_NUMBER()` windows | S, P, H |
| gaps-and-islands-apply | borderline (starter) | starter pre-writes the `ROW_NUMBER()` island CTE; prompt spells full row-number-diff algorithm | P, S |
| funnel-practice | over-giving (starter) | starter pre-writes the `MIN(CASE...)` pivot | S, P, H |
| funnel-conversion-apply | over-giving (starter) | starter pre-writes the `MIN(CASE...)` pivot | S, P |
| sessionization (practice) | over-giving (starter) | starter pre-writes the `LAG` CTE | S, P, H |
| recursive-cte (apply/practice starters) | over-giving (starter) | starter pre-writes the `WITH RECURSIVE` body | S, P |
| cohort-retention-apply | over-giving | `strftime('%Y-%W', MIN(event_date))` | P, H |
| as-of-scd2-join-apply | over-giving | `>= effective_from AND < effective_to` | P, H |
| sessionization-apply | over-giving | `user_id || '-' || session_number` + full recipe | P, S, H |
| cdc-changelog-apply-apply | over-giving (opaque) | `ON CONFLICT(pk) DO UPDATE` + 3-step recipe | P, E, S, H |
| cdc-changelog-apply-practice | over-giving (opaque) | `WHERE excluded.version > target.version` | P, E, H |
| system-design-round-reasoning-apply | over-giving | `latest_offset - committed_offset` | P, H |
| incremental-watermark-backfill-practice | over-giving (opaque) | delete-then-reinsert method + literal DELETE | P, E, H, S |
| window-frames-and-qualify-apply | borderline | names `LAST_VALUE` + full-partition frame | P |
| window-frames-and-qualify-practice | borderline | `NTILE(4)` + named-WINDOW mandate | P, S |
| json-variant-flatten-apply | borderline | "cast to REAL" near-literal | P |
| fact-grains-accumulating-snapshot-apply | borderline (partial) | literal `DELETE FROM ...;` | P, E |
| incremental-watermark-backfill-apply | borderline (partial) | delete-then-reinsert recipe | P, E |
| medallion-streaming-capstone-apply | borderline (opaque) | stage-by-stage recipe + "lead with DELETE" | P, E |
| medallion-streaming-capstone-practice | borderline (opaque) | reveals sessionization insight | P, E |

L5 opaque EXCEPT-reconciliation checks (`matches_expected_end_state`, `gold_reconciles_to_silver`, `partition_matches_source`, `published_matches_staged`, `sessionization_correct`): these run against populated tables and each returned row IS a genuinely diverging key, so `showViolatingRows` DOES apply (contrast the L3 pragma checks, which are explain-only) — rewrite each to project the diverging keys and set `showViolatingRows` + `explain` so a failure names which pk/day/session is wrong. Confirm each rewritten check returns zero rows against its reference solution (guard §4.4-5).

### Starter reconciliation footnote

Before enabling guard §4.4-3, run `STARTER_ANSWER_SQL` over every current workspace/drill starter and confirm the hit-set equals the union of `S`-tagged rows above. The round-2 audit surfaced window-ranking-apply, window-offset-apply, dedup-apply, funnel-conversion-apply, gaps-and-islands-apply, and the recursive-cte starters as previously-untagged hits — all are now S-tagged. Any starter hitting only on `INSERT OR IGNORE`/`ON CONFLICT` harness constructs is excluded by `STARTER_ANSWER_SQL`'s construction; if one genuinely needs a graded-looking construct as harness (primary-keys-practice), it goes in `STARTER_GUARD_ALLOWLIST` with a reason. The guard's flag-set must be empty at enable time.

---

## 6. Sequencing & ownership

**Phase 0 — shared engine/schema/UI (must land first, single owner, one branch, no parallelism).** These touch shared files that every content edit depends on:
1. `types.ts` `SqlAssertion` field additions (`explain`, `fixHint`, `showViolatingRows`, `expectedDescription`, `countQuery`, `countUnit`) + `SqlWorkspaceGrading`; `WorkspaceTestResult`, `RawResultRow`, `TestResult` widening (with nullable `expected`/`actual`).
2. `public/workers/sql-sandbox-worker.js` `gradeWorkspace` enrichment + `isConstantSentinel` + `computeActualCount` + `buildFailureMessage` + `!passed`-gated, sentinel-suppressed expected/actual + idempotency copy.
3. `worker-runner.ts` / `workspace-runner.ts` type widening (no logic change).
4. `test-result-mapping.ts` visible-branch threading with null-preserving Expected/Actual (hidden branch untouched).
5. `TestResultsPanel.tsx` sample-rows render + null-guarded Expected/Actual block; `SqlWorkspaceResult.tsx` table anchors.
6. `WorkspaceExerciseRunner.tsx` hints affordance + `onHintReveal` prop; `SqlLessonPlayer.tsx` wiring.
7. The five machine guards (§4.4): the two `prompt-standards.test.ts` additions, the `reference-solutions.test.ts` `starterCode` guard, the `showViolatingRows`-empty-on-reference guard, and the new `assertion-standards` opacity guard.

**Guard staging (round-2 correction).** The guards CANNOT be "landed in lockstep with the first level they validate," because each one scans the **whole tree** — the instant guard (1) or (3) is enforcing, it also evaluates the still-unswept L1/L2/L4/L5 exercises and reds the tree. There is no per-level scoping. Therefore:

- Land the guard *code* in Phase 0 but ship each whole-tree guard **`.skip`/xfail** (or behind an `ENFORCE_SWEEP_GUARDS` flag defaulting off). The rest of Phase 0 stays fully green.
- Flip the guards to enforcing in a **final guard-enable PR that lands LAST**, after every level's content sweep is merged. That PR is the moment the flag-set reconciliations (§4.3) are proven equal to the §5 worklist and must be empty.
- The "let later levels only add passing rows" framing is **removed** — it only holds for an append-only check, and these are global scans, not append-only.

Land Phase 0 (guards skipped) as one reviewed PR; run full `pnpm test` + `pnpm typecheck` + `pnpm build` before any content work starts. Nothing in Phase 0 changes existing behavior for lessons that don't set the new fields (expected/actual gated on `!passed` and suppressed for sentinels, so passing checks are byte-identical to today; the sweep guards are skipped), so the tree stays green.

**Phase 1 — content sweep (parallelizable per level/lesson via worktree isolation).** Each level file (`level1.ts` … `level5.ts`, `extra-practice.ts`) is an independent file, so one loop agent per file can run in a separate git worktree without collision. Within a file, edits are per-exercise and mechanical. Order the levels L3 → L5 → L4 → L2 → L1 by user impact (L3 is the reported lesson; L3/L5 have the opaque-assertion work and the pre-writing starters; L1/L2 are prompt-only). Each agent, per exercise: apply the §5 actions (all four surfaces — prompt, starter, hints, assertions — as tagged), **re-run the exercise's reference solution against the scaffolded starter to confirm it still passes**, then run the exercise's slice of `reference-solutions.test.ts` + `prompt-standards.test.ts` + `assertion-standards.test.ts` + `teach-demos.test.ts` + (for drills) `extra-practice.test.ts` before committing. Because the whole-tree guards are still skipped during the sweep, run each agent's *own-level* checks by temporarily un-skipping the guard filtered to that level's exercises (or run the guard's regex over just that file). Commit as the user only, no Claude co-author, per repo memory; check `git log` first (a concurrent committer sweeps main).

**Phase 2 — guard-enable PR (lands last).** Un-skip all five guards, run the §4.3 reconciliations (prompt flag-set == §5 `P` workspace rows; starter flag-set == §5 `S` rows; `STARTER_GUARD_ALLOWLIST` justified; every `showViolatingRows` assertion empty on its reference), and confirm every flag-set is empty. Full `pnpm test` + `typecheck` + `build` green.

**Parallel-safe vs must-serialize:** Phase 0 shared files must all land before Phase 1 starts (the hint affordance must exist before prompts/starters can be de-given; `showViolatingRows`/`countQuery`/`explain` must exist before assertions are rewritten; the `isConstantSentinel` + sentinel-suppression fixes must exist before single-column diagnostics and cardinality checks are authored). Phase 1 per-level edits are safe to parallelize because they touch disjoint files. The only shared Phase 1 concern is the test files carrying the five guards — they land in final form in Phase 0 (skipped) and are flipped once, in Phase 2, so no two content agents race on them.

---

## 7. Acceptance criteria / definition of done

**Fix 1 (instructive feedback):**
- On a failed **visible** assertion the panel shows the real expected-vs-actual value, the author `explain`, the `fixHint`, and up to 5 offending rows with columns. Verify by opening `/learn/sql/modeling/sql-l3-constraints`, submitting a schema with `supplier_id` as sole `PRIMARY KEY`, and confirming the practice "rows" check shows `Actual: 2 row(s)` (from `countQuery`, not the sentinel `1`), the two surviving rows, and the composite-key nudge — not `1 row(s) violated this check`.
- **No "Actual" ever shows the sentinel constant `1`.** For every un-rewritten count sentinel across all levels, "Actual" is either a real observed scalar (`countQuery`) or the count strings are absent (explain-only). Add a sql-sandbox test asserting a `SELECT 1 WHERE (SELECT COUNT(*)…) <> 1` sentinel with `countQuery` reports the true count, and one without `countQuery` reports `expected: null, actual: null` (explain shown, no phantom "1").
- **Every `showViolatingRows` assertion passes its own reference solution** (guard §4.4-5, zero offenders). Explicitly re-verify the flagship: the WHERE-guarded cardinality projection returns zero rows against the reference and 2 rows against the buggy submission.
- A **passing** visible assertion still renders "pass"/"pass" (expected/actual gated on `!passed`); confirm no snapshot/e2e that asserts the old "pass" strings breaks.
- A single-column diagnostic projection (`SELECT sku ... WHERE ...` with `showViolatingRows`) renders its rows and is NOT suppressed as a sentinel (regression test for the `isConstantSentinel` fix); a genuine `SELECT 1 WHERE ...` sentinel with a stray `showViolatingRows` renders no phantom "1" row.
- A learner who typos an enum (`'discounted'`) sees which value/row is wrong: the status assertion is now exact-value (not `'%status%IN%active%'`), reports the offending row, and explains the mismatch.
- **Hidden** assertions still show only "Hidden test" + the generic masked message — confirmed by `test-result-mapping` unit tests on the unchanged hidden branch.
- Idempotency failures name the row-count delta and explain the fix.
- **Opacity is systemic, not flagship-only:** the §4.4-4 guard passes with zero offenders — every visible sentinel/metadata assertion across all five levels carries an `explain`, including FK (`pragma_foreign_key_list`) and index-info (`pragma_index_info`) checks. State the per-level completion count in the PR description (L3: all 24 exercises' visible sentinel/metadata assertions carry `explain`; L4/L5 likewise), so "systemic" is a counted fact.
- Verify: `pnpm test lib/workspace-execution/__tests__/sql-sandbox.test.ts` and `lib/tutorials/__tests__` green; extend sql-sandbox tests with cases asserting (a) `sampleRows`/`explain` appear for a visible failing per-row projection, (b) they are `null`/absent for a hidden one, (c) a single-column diagnostic is not suppressed, (d) a passing visible row omits expected/actual enrichment, (e) a cardinality sentinel with `countQuery` shows the true scalar, and (f) a cardinality sentinel without `countQuery` suppresses both count strings.

**Fix 2 (three-surface de-giving):**
- **Affordance:** the Hint button and `HintList` render on L3/L4/L5 workspace lessons; clicking reveals one hint at a time and fires `onHintReveal`. Verify by clicking through sql-l3-constraints.
- **Surface 1 (prompts):** every SQL **workspace** prompt is free of literal answer-SQL — the §4.4-1 guard passes with zero offenders, and its flag-set was reconciled against the §5 `P`-tagged workspace rows with zero false positives on audit-approved Apply prompts (§4.3). L1/L2 literal-in-backticks prompts pass the §4.4-2 narrow guard; L1/L2 prose technique mentions are signed off in the review pass (review-only, documented as such).
- **Surface 2 (starterCode):** the §4.4-3 guards pass — no workspace `starterCode` contains `STARTER_ANSWER_SQL` (outside the documented allowlist), and no drill's `starterCode` equals its `referenceSolution`. The `STARTER_ANSWER_SQL` hit-set was reconciled against the §5 `S`-tags (§4.3) with zero unexplained hits, and every scaffolded starter was re-run against its reference solution to a pass. Spot-verify gaps-and-islands-practice, gaps-and-islands-apply, funnel-practice, funnel-conversion-apply, sessionization, dedup-apply, window-ranking-apply, window-offset-apply, and the recursive-cte starters now ship comment-stub scaffolds, not the pre-written clause; verify primary-keys-practice's harness `INSERT OR IGNORE` is preserved (allowlisted).
- **Surface 3 (hints):** on sample-checked lessons (scd-type1-practice, snowflake-practice, extra-practice finals), `hints[0]` is prose, and literal answer-SQL appears only in the final hint. One Hint tap no longer reveals the complete answer.
- All pre-existing prompt-standard assertions (no em dash, no bidi arrow, no vague opener, non-empty, drill difficulty tags) still pass.

**Whole-tree:**
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all green — with the five sweep guards **enforcing** (Phase 2 landed).
- Reference-solutions, teach-demos, registry, extra-practice, sql-sandbox, workspace-preview, and the new assertion-standards + showViolatingRows-empty suites remain green (extended, not broken).

---

## 8. Risks & non-goals

**Risks:**
- **sql.js limits.** Enrichment is free (the assertion result set is already materialized at worker L147; `countQuery` is one extra scalar exec per failing sentinel). `showViolatingRows` only yields meaningful data when the assertion projects real per-row-bad columns or is a WHERE-guarded cardinality projection that stays empty on pass; a bare `SELECT`-all cardinality "rewrite" would return rows in the correct state and fail the reference solution — forbidden, and caught by guard §4.4-5. Sentinel `SELECT 1 WHERE ...` and metadata/pragma checks are remediated by `explain` prose plus (for cardinality) `countQuery`; the `isConstantSentinel` guard prevents a lone `1` from ever rendering as "offending data" or as an "Actual" count, while never suppressing a legitimate one-column diagnostic. Cap at 5 rows to bound marker size and render cost. No server execution is introduced.
- **Over-rewriting Apply into vagueness.** Apply prompts are meant to be direct; de-giving means moving *literal syntax* out, not removing guidance. Apply may *name* a technique; it must not paste the clause. The §4.4-1 regexes are tuned (technique words dropped, comparison operators matched only inside backticks) so approved Apply prompts stay green; keep column names, thresholds, and enum *domain values* (as prose) in the prompt.
- **Starter scaffolds that no longer run.** Replacing a pre-written construct with a comment stub must not break the seed/boilerplate (including harness `INSERT OR IGNORE`/`ON CONFLICT` that keeps the script running past an expected rejection) the exercise needs to execute. The starter guard uses the narrower `STARTER_ANSWER_SQL` that excludes those harness constructs, and each scaffolded starter is re-run against its reference solution to confirm the lesson still loads and the reference still passes.
- **Guard false positives / flag-set drift.** All five guards ship skipped in Phase 0 and are flipped in a final Phase-2 PR after every level is swept; at that point the prompt and starter flag-sets are proven equal to the §5 worklist with zero unexplained offenders, and `STARTER_GUARD_ALLOWLIST` entries are justified. Because the guards are whole-tree scans, they are NOT staged per-level and NOT framed as "append-only."
- **Live UI display change.** Gating expected/actual on `!passed` and suppressing them for sentinels-without-`countQuery` means currently-passing visible checks are byte-identical to today, and failing sentinels show explain-only rather than a bogus "1 violation(s)". Confirm no snapshot/e2e depends on a failing row's old "fail"/"fail" or `1 row(s) violated` string; the null-preserving mapper (§3.3) and null-guarded panel block (§3.4) handle the suppressed case.

**Non-goals:**
- No Python content changes. The Python workspace player shares `WorkspaceExerciseRunner`; all new props are optional and the Python `LessonPlayer` passes none, so Python behavior is unchanged. The prompt guard is scoped to `course === "sql"`.
- No lesson gating (lessons stay ungated). No new UI framework, no physics graph, no Mermaid.
- No change to L1/L2 single-file grading — they already show actual-vs-expected grids and must not regress; `sampleRows` is never set on single-file rows. L1/L2 de-giving is prompt/starter/hint content only.
- Not re-authoring every assertion's difficulty or restructuring the curriculum; the sweep is a mechanical four-surface de-give + enrich, not a redesign.
