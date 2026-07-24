# Authoring lesson widgets (`cswidget`)

Any `/learn` lesson can render a stateful interactive by dropping a fenced `cswidget`
block into its `teach.markdown`. Like `csdiagram`, the block is **data, not code**: you
describe the interaction as JSON and a React component renders it. No new dependency,
no per-lesson component, no server calls — widget state is pure client state, ungraded
and unpersisted.

```
```cswidget
{ "type": "check", "kind": "predict", ... }
```
```

The Markdown pipeline (`lib/markdown/components.tsx`) intercepts the `language-cswidget`
fence, validates the JSON against a Zod schema (`lib/tutorials/widgets/schema.ts`), and
dispatches through a lazily loaded body (`components/tutorials/widgets/CsWidget.tsx`),
so lessons without widgets ship zero widget bytes. A bad spec renders a small inline
error, never crashes the lesson.

**Two fences, one split:** `csdiagram` is for stateless staged statics; `cswidget` is
for anything the learner *does* — checks, sims, steppers. If there is no learner
decision inside it, it is a diagram or a table, not a widget.

## The `check` family

Zero-stakes retrieval practice: the learner commits an answer, gets immediate
explanatory feedback, and can retry freely. Two kinds:

### `predict` — MCQ with exactly one correct option

```json
{
  "type": "check",
  "kind": "predict",
  "prompt": "A timeout fires on a call to service B. What does A know about what B did?",
  "options": [
    {
      "label": "B failed and did no work",
      "feedback": "Tempting, but a timeout is ambiguous: the request may have been lost, the response may have been lost, or B may just be slow."
    },
    {
      "label": "Nothing certain",
      "correct": true,
      "feedback": "Right. Lost request, lost response, slow peer, and dead peer all look identical from A. That is why retries need idempotency."
    }
  ]
}
```

- 2 to 5 options; **exactly one** carries `"correct": true`.
- `feedback` is **mandatory on every option** and must say why that option is right, or
  why it is tempting but wrong. "Incorrect, try again" is not feedback.

### `classify` — sort items into 2-3 buckets

```json
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each system by its behavior during a partition.",
  "buckets": ["CP", "AP"],
  "items": [
    { "label": "etcd", "bucket": "CP" },
    { "label": "Cassandra (CL=ONE)", "bucket": "AP", "feedback": "Both sides accept writes and reconcile later." }
  ],
  "reveal": "Real systems are rarely globally CP or AP; consistency is usually tunable per operation."
}
```

- 2 to 3 unique buckets, 2 to 8 items; every `item.bucket` must be a declared bucket.
- Per-item `feedback` is optional; wrong answers fall back to naming the right bucket.
- `reveal` (both kinds) shows after a fully correct answer — use it on cumulative checks.

## Placement rules (binding, from INTERACTIVITY-PLAN.md)

- **Dosage:** about one check per 300 words of teach, clamped to 2-4 per lesson.
- **Misconception-first:** a misconception check sits AFTER the paragraph that sets up
  the question but BEFORE the paragraph that resolves it, so the learner commits a
  prediction and then reads the correction. Consolidation checks follow their chunk.
- **One cumulative check** closes every teach (after the Recap paragraph), synthesizing
  the lesson and bridging into the design write. Put the wrap-up in `reveal`.
- **Every check targets a NAMED misconception** or likely confusion. If you cannot name
  what the learner would get wrong, the check is filler — cut it.
- **Density cap:** at most one sim OR animated widget per lesson, plus checks; never
  turn a teach into a widget wall.

## String hygiene (hard CI rejects)

Learner-visible strings (prompt, labels, feedback, reveal) must contain:

- **No em or en dashes.** Use commas, colons, or periods.
- **No backticks, no backslashes, no `${`.** The teach is a TS template literal; any of
  these corrupts it. Quote code-ish tokens with single quotes: `'SELECT ... FOR UPDATE'`.

## Fence hygiene (same hazards as csdiagram)

1. **The fence sits on its own lines, after a complete paragraph.** Blank line before the
   opening fence, closing fence on its own line. A fence jammed mid-sentence never closes
   (CommonMark), so nothing renders AND the following prose is swallowed. CI catches this.
2. **Backtick escaping:** in the level `.ts` files the fence backticks are written escaped
   (`` \`\`\`cswidget ``). Generate insertions with a script rather than hand-editing.
3. **JSON only in the body.** Double quotes are fine inside the template literal.

## A11y (what the frame gives you, what a family must do)

`WidgetFrame` owns one polite live region per widget (`useWidgetA11y().announce`), the
reduced-motion flag, and the always-visible Reset. Families use native inputs only
(radios in fieldset/legend, toggle buttons with aria-pressed, ranges with
aria-valuetext), move focus to feedback on commit, mark decorative SVG `aria-hidden`,
and pair every status with an icon AND a word — never color alone.

## Guardrails

`lib/tutorials/diagrams/__tests__/content-integrity.test.ts` walks Python + SQL +
System Design lessons, validates every `csdiagram` AND `cswidget` fence, renders each
fence-bearing teach through the real Markdown pipeline (no swallowed prose, no leaked
JSON), and asserts byte-identical double-render — unseeded randomness fails CI.
Schema-level rejections live in `lib/tutorials/widgets/__tests__/schema.test.ts`; the
pipeline and SSR-safety guards in `components/tutorials/widgets/__tests__/`. Run
`pnpm test` after authoring.

## The sim families (`calc`, `hash-ring`, `sequence`)

All three are hands-on interactives dispatched through the same fence. Field-level
truth is `lib/tutorials/widgets/families/*.ts`; the binding pedagogy ramp:

- **`calc`** (formula sliders): mandatory `predictPrompt` (2-4 one-tap options, no
  marked answer) and `workedExample` narrating arithmetically correct initial
  values. Inputs unlock one at a time; expressions use the whitelisted mini-grammar
  (`+ - * / ^`, parens, `ceil floor round sqrt log10 min max pow`) over input ids
  and PRIOR output ids; at most one sparkline. `percent` outputs emit fractions.
- **`hash-ring`** (consistent hashing): mandatory ramp fields; `maxNodes` must
  exceed `initialNodes`; everything is seeded, so the same spec renders the same
  ring. Open in `modulo` mode so the shatter story plays before the ring fixes it.
- **`sequence`** (stepped timelines): actors 2-6, steps 2-30, max 3 failure
  toggles. A step's `when` ("drop" / "!drop") carries happy and failure paths in
  one spec; with all toggles OFF at least 2 steps must remain. request/response/
  event steps need `to`; only timer/note are single-actor. Keep labels under 30
  chars; use `state` maps when a counter or race is the story; 1-2 `predict` steps
  at the pivotal moment.

Density cap reminder: at most ONE sim or animated widget per lesson, plus checks.
