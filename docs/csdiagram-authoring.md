# Authoring lesson diagrams (`csdiagram`)

Any `/learn` lesson can render an interactive or static diagram by dropping a fenced
`csdiagram` block into its `teach.markdown`. The block is **data, not code**: you
describe *what* to show as JSON, and a React component renders it. No new dependency,
no per-lesson component.

```
```csdiagram
{ "type": "join", "kind": "left", ... }
```
```

The Markdown pipeline (`lib/markdown/components.tsx`) intercepts the `language-csdiagram`
fence, validates the JSON against a Zod schema (`lib/tutorials/diagrams/schema.ts`), and
dispatches to the matching component (`components/tutorials/diagrams/CsDiagram.tsx`). A bad
spec renders a small inline error, never crashes the lesson.

## When to use one (and when not to)

Diagrams help when **the picture IS the concept** — a JOIN pairing rows, a window frame
sliding, a name pointing at an object. They hurt as decoration. Rules of thumb:

- **One diagram per lesson**, max. Reinforce the single hardest idea; don't illustrate everything.
- Don't add a diagram where a GFM table or the runnable demo already teaches it well.
- Static diagram (pipeline, er, comprehension, table) unless motion is the lesson (join,
  window-frame, group-by, python-memory, call-stack).

## The types

| type | motion | teaches |
|---|---|---|
| `pipeline` | static | SQL logical execution order (FROM→WHERE→GROUP BY→HAVING→SELECT→ORDER BY) |
| `join` | triggered | INNER/LEFT/RIGHT/FULL/ANTI row-matching, NULL-fill, fan-out |
| `window-frame` | triggered | running total / moving average as the frame slides |
| `group-by` | triggered | rows → groups → one aggregate row per group |
| `er` | static | tables, PK/FK, relationship cardinality |
| `python-memory` | triggered | names → heap objects, aliasing, mutation |
| `call-stack` | triggered | recursion / wrapping push-and-pop |
| `comprehension` | static | a comprehension next to its equivalent loop |
| `table` | static | a highlightable example table (LAG/LEAD, SCD versions, before/after) |
| `ladder` | **animated** | magnitudes separated by orders of scale, revealed smallest first: the latency ladder (L1 to RAM to SSD to disk to cross-region), cost tiers, storage tiers |
| `topology` | animated by default, **static under `reveal: "all"`** | a system drawn as boxes and edges: clients, load balancers, services, stores, caches, queues, CDNs, zones |

`pipeline` is not SQL-only despite the row above. Any ordered left-to-right sequence renders
through it, and several System Design lessons use it. Pass `title` when the pipeline is not about
SQL: without it the frame heading reads "Order of evaluation" and screen readers announce "SQL
logical execution order", which is what three System Design lessons shipped before it was fixed.

See `lib/tutorials/diagrams/schema.ts` for the exact fields of each — it is the source of
truth and the error messages point at the offending field.

### The density cap is per INSTANCE, not per type

`ladder` and an ordinarily-staged `topology` animate, so they cost the same attention as an
interactive widget and share its budget: **at most one simulation or animated diagram per lesson**,
enforced by `lib/tutorials/widgets/__tests__/sim-density.test.ts`.

The predicate is `isHeavyDiagram(spec)` from `lib/tutorials/system-design/coverage.ts`, which is the
single definition; do not re-declare it and do not read `ANIMATED_DIAGRAM_TYPES` directly. A
`topology` authored with `reveal: "all"` renders as a still picture with no controls, no
`useStepPlayer` and no motion, so it is EXEMPT, exactly as `er` and `table` are. The cap exists to
bound attention, and a still picture costs what a still picture costs.

Every other type on this list is static and uncapped. So a lesson that already carries a `calc`
widget cannot take a staged `topology`, but it can take a `reveal: "all"` one, and as many `table`
diagrams as the material justifies. Check what a lesson already has with `pnpm audit:sd --lessons`
before authoring, because the cap is a test failure, not a warning.

**Choose staged when the ORDER is the lesson** ("we add a cache here, and here is what that costs")
and `reveal: "all"` when the STRUCTURE is the lesson ("this is what the finished system looks
like"). Do not reach for `reveal: "all"` merely to dodge the cap: if the build order teaches
something, staging it is worth displacing a simulation for.

### Cross-field rules the schema enforces

- **`ladder`** is NOT a sequence or message diagram. It draws bars whose lengths compare magnitudes,
  not actors exchanging messages over time. If you want messages between participants, that is the
  `sequence` WIDGET family in `cswidget`, not this. 3 to 12 bands, ordered smallest to largest, and
  `value` must ascend across them.
  `scale: "log"` gives each decade equal travel, which is what makes a latency ladder's cliffs
  visible; `linear` flattens them into one bar and eleven slivers.
- **`topology`**: 2 to 16 nodes and 1 to 24 edges. Under the default `reveal: "staged"`, every node
  must appear in exactly one stage and every stage requires a non-empty `note` tying what it adds
  back to a requirement. Under `reveal: "all"` there is no sequence to justify, so `stages` must be
  OMITTED entirely (supplying both is rejected). The 16-node ceiling is deliberate: it is the guard
  that keeps a free-form graph from re-entering. Past it the material wants splitting, not shrinking.

  **Layout defaults to `tb` (vertical) and you should almost always leave it there.** Wrapped labels
  are wider than truncated ones, and measured over the corpus a left-to-right chain of them put 10
  of 14 diagrams over 720px with a worst case of 1,549px, which is unreadable on a phone. Vertical
  put 0 of 14 over 720px. Write `"layout": "lr"` only for a genuine left-to-right request flow that
  you have checked actually fits.

  **`kind: "feedback"` is the edge that closes a loop**: outcomes back to training, a retry back to
  the queue, a compensating reversal back to the ledger. It is excluded from layering (as
  `replication` is) and drawn as a curved return arc. Use it rather than a plain `sync` edge
  whenever the arrow points upstream; the layout will detect the cycle either way, but naming it
  says the loop is deliberate. Node labels are no longer truncated, so write the qualifier the ASCII
  carried beside the box ("Redis (atomic Lua)") rather than dropping it.

  **`groups`** draws up to four dashed swimlanes behind their members: offline training plane
  against online serving plane, speed against batch layer, hot against cold path, EU against US. A
  node may belong to at most one group. Reach for this instead of the `zone` node kind when what you
  mean is a container rather than a box.

## Authoring rules that avoid real bugs

1. **Use the lesson's own data.** Mirror `demoSeedSql` / `demoCode` / the prose so the
   diagram and the runnable demo teach the same thing. Wrong data in a diagram is worse
   than no diagram.
2. **The fence must sit on its own, after a complete paragraph.** Put the opening
   ` ```csdiagram ` on its own line with a blank line before it, and the closing ` ``` ` on
   its own line. A diagram jammed mid-sentence leaves trailing text on the closing-fence
   line — per CommonMark the fence never closes, so the diagram fails to render *and* the
   following prose is swallowed. End the sentence with its period, then start the fence.
3. **Backtick escaping.** `teach.markdown` is a TypeScript template literal, so the three
   fence backticks must be written escaped (`` \`\`\`csdiagram ``). The easiest safe path is
   to build the fence with a script that `JSON.stringify`s the spec, rather than hand-editing.
4. **Single quotes inside code strings.** In a `python-memory`/`call-stack` `code` value use
   single quotes (`bad('a')`), never double quotes, so the JSON stays valid inside the
   template literal.
5. **Data integrity is validated.** A `join` `on` key must be a real column, every table row
   width must match its columns, and every `python-memory` name must point at an object
   defined in that step. Break one and `parseDiagramSpec` rejects it.

## Guardrails

`lib/tutorials/diagrams/__tests__/content-integrity.test.ts` renders **every** authored
diagram through the real Markdown pipeline and fails CI if a fence swallows prose or a spec
is invalid. Run `pnpm test` after adding a diagram. The other suites in that folder cover the
parser, the SQL compute, and per-type rendering.
