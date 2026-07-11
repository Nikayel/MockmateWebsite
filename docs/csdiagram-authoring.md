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

See `lib/tutorials/diagrams/schema.ts` for the exact fields of each — it is the source of
truth and the error messages point at the offending field.

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
