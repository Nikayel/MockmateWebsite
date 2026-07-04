# Exercise Prompt Standard

The single source of truth for how `/learn` exercise **prompts** are written. It covers every
`prompt` field on an Apply, Practice, or extra-practice Drill exercise, in both the Python and SQL
curricula. Mechanical rules here are enforced by a test (see [Enforcement](#enforcement)); the
judgment rules are enforced by review against this document.

Applies to:

- `lib/tutorials/curriculum/level*/**` (Python)
- `lib/tutorials/sql/curriculum/**` (SQL)

Related: [[no-em-dashes-in-content]] style rule, and the `PROMPT_STANDARD` test at
`lib/tutorials/__tests__/prompt-standards.test.ts`.

---

## The golden rule: lead with the deliverable

The first sentence must tell the learner **what to build and what it produces**, in plain language.
Never open with abstract framing, a technique name, or the solution's internal structure and make the
learner hunt for the actual task.

**Good openers** (the deliverable is the subject):

- `Write a query that returns <columns>, filtered by <…>, sorted by <…>.`
- `Write a script that populates <table(cols)> with <…>.`
- `Create a <table/schema> with <…>.` (DDL tasks)
- `Implement \`func(args)\`: return <…>.` (Python)
- `Return <columns> for <rows> …` / `Sort <table> by <…> …` / `Join <a> to <b> …`

**Bad openers** (framing / technique / structure first):

- ~~`Author a three-stage transform with CTEs: the staging → intermediate → mart structure…`~~
- ~~`Model a playlists ↔ songs feature with three relationships…`~~
- ~~`Assemble a line-item fact by joining three tables…`~~
- ~~`Reconcile two daily snapshots…`~~
- ~~`Wire a three-table order schema…`~~

### Before / after

> **Before:** Author a three-stage transform with CTEs: the staging then intermediate then mart
> structure of production SQL. Stage 1 `paid_orders`… Stage 2 `per_customer`… Final: customers with
> more than 1 order AND revenue over 10000, returning `customer_id`, `order_count`, `revenue`…
>
> **After:** Write a query that returns one row per customer with `customer_id`, `order_count`, and
> `revenue`, keeping only customers who have more than 1 paid order and more than 10000 in total
> revenue, sorted by `revenue` descending. Revenue is the sum of each paid order line's
> `quantity * unit_price_cents`… Build it as three CTE stages like a production pipeline: `paid_orders`
> (…), `per_customer` (…), then a final `SELECT` that applies the filter and sort.

The technique ("three CTE stages") is still there. It just moved **after** the goal, as support.

---

## Voice by phase: Apply is direct, Practice is a real-world scenario

Apply and Practice teach the same skill but read differently on purpose.

- **Apply** is the guided first rep. Keep it **direct and deliverable-first** (the golden rule
  above): `Write a query against \`order_items\` that returns a single summary row with \`total_revenue\`
  and \`order_count\`…`. No preamble. It can read a little "robotic"; that clarity is the point while
  the learner is still forming the pattern.

- **Practice** is the transfer test, so frame it like a **real interview / on-the-job question**: open
  with one sentence of concrete business scenario (who you are, what the business needs), then state
  the deliverable and exact outputs immediately after. This is still the deliverable-led rule in
  spirit — the scenario is one sentence, and the required output appears right after it, so the
  learner never has to hunt.

  > **Good (Practice):** You're a data engineer who owns the nightly `orders` load. Before anything
  > downstream reads the table, you run a one-row source-health scorecard. Write a query that returns
  > `total_rows`, `distinct_customers`, `total_revenue` (NULL totals count as `0`), and
  > `avg_order_value` (plain `AVG`), in that order.

  The scenario sets stakes; the second sentence is a normal deliverable-led prompt. The blocklisted
  framing verbs (Author/Model/Assemble/Reconcile/Wire) are still banned as openers — a business
  scenario ("You're a DE…", "Finance needs…", "After a backfill…") is different from technique
  framing and is what we want for Practice.

Do not force a scenario onto an Apply, and do not let a Practice scenario grow past a sentence or two
or bury the deliverable. Extra-practice **Drills** keep their difficulty tag first and stay terse
(no scenario).

---

## Structure of a good prompt

1. **Lead sentence:** the imperative + the exact output. Name the output columns (and their order),
   the filters/thresholds, the grouping grain, and the sort.
2. **Constraints:** edge cases the grader checks (zero-row results, `0` vs `NULL`, re-run safety,
   distinct counts, tie-breakers).
3. **Guidance (optional):** which tables/columns to use and which technique (CTEs, a window function,
   an anti-join, conditional aggregation). Support, never the lead.

---

## Semantics: prompts are grounded, edits are prose-only

The prompt is a contract with the grader. Everything it asks for must match the exercise's
`referenceSolution` and `singleFile.expected` (or workspace grading) **exactly**: same columns and
order, same thresholds (`>` vs `>=`), same grouping grain, same sort direction, same identifiers.

When editing an existing prompt for clarity, **change only the `prompt` string**. Never touch
`referenceSolution`, `starterCode`, `hints`, `seedSql`, or `expected`. If the wording and the
reference solution disagree, the reference solution is the truth; reword to match it (or fix the
exercise deliberately as a separate, tested change).

---

## Style

- **No em dashes.** Use periods, commas, or parentheses. (Enforced.)
- **Write out relationship arrows.** No `↔`; say "many-to-many" or "playlists-to-songs". A `→` inside
  a concrete input→output example (e.g. `PRD-AUD-01 → AUD-01`) is fine; a `→` used as decorative
  prose structure is not. (`↔` is enforced; prefer prose elsewhere.)
- **Backtick code identifiers:** table names, column names, function names, SQL keywords, literals.
- **Voice:** direct and concrete, written for a data-engineering / software intern. No filler.
- **Drill tag:** every SQL extra-practice drill opens with a difficulty tag, `**Easy.**`,
  `**Medium.**`, or `**Hard.**`, then the clear imperative. (Enforced for SQL drills.)

### Opener verbs

Prefer a plain deliverable verb: **Write, Create, Return, Implement, Add, Define, Finish, Make,
Sort, Filter, Find, Join, Compute, Combine, Project, Extract, Produce, Cast, Normalize, Bucket**.

Do **not** open with these framing verbs (they describe the shape, not the task) — **Author, Model,
Assemble, Reconcile, Wire**. This blocklist is enforced; extend it in the test + here together if a
new offender shows up. `Build`/`Create` are allowed but still owe the reader the output shape in the
first sentence (`Build a X mart` must immediately say which table and columns it produces).

---

## Enforcement

`lib/tutorials/__tests__/prompt-standards.test.ts` runs under `pnpm test` and checks every Apply,
Practice, and Drill prompt across both curricula for the **mechanical** rules above:

- no em dash,
- no `↔`,
- does not lead with a blocklisted framing verb,
- non-empty and reasonably sized,
- SQL drills lead with a difficulty tag.

The **judgment** rule (lead with the deliverable) is not machine-checkable; it is enforced by review
against this document. Keep the test's blocklist and this doc in sync.

---

## Checklist for adding a new question

- [ ] The first sentence states the deliverable: what to write and exactly what it returns/does.
- [ ] Output columns (names + order), filters/thresholds, grouping grain, and sort are all stated.
- [ ] Every requirement matches the `referenceSolution` + `expected` (run the exercise; the grader
      passes on the reference).
- [ ] No em dashes, no `↔`; identifiers are in backticks.
- [ ] SQL drills open with a difficulty tag.
- [ ] `pnpm test` (prompt-standards + the curriculum tests) is green.
