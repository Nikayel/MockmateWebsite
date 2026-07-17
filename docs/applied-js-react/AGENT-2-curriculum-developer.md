# AGENT 2 — Applied JS & React curriculum developer (run with `/loop`)

> Part of the **Applied JavaScript & React: Zero to Hero curriculum pack**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)
> **Read order each iteration:** [`CONTENT.md`](./CONTENT.md) (find the next lesson + its `content/<moduleId>.md` file) → [`curriculum-map.json`](./curriculum-map.json) / [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) (the authoritative fields: `id`, `liveDemo`, `applyPrompt`, `thinkAbout`, `modelAnswerOutline`, `skills`, `difficulty`, `estimatedMinutes`) → author one `AppliedLesson` in `lib/tutorials/applied-js-react/curriculum/levelN/`. Start only after [`AGENT-1`](./AGENT-1-engineer.md) is green.

The content-author runbook: turn `docs/applied-js-react/CONTENT.md` (and the per-module files in
`docs/applied-js-react/content/`) into real `AppliedLesson` objects in
`lib/tutorials/applied-js-react/curriculum/levelN/`, authoring lessons **continuously, back to back,
one commit per lesson**, each verified to render, run its live demo, and reveal. Mirrors the SQL and
system-design courses' `AGENT-2-curriculum-developer.md`. **Start only after AGENT 1's Definition of
Done is green and merged** — the `AppliedLesson` type + registry + `AppliedLessonPlayer` + the
js-runnable demo runner (sandboxed JS execution with console + visualizer surface) + the react-demo
widget registry + the Apply/Practice free-response save-and-reveal flow + at least one js-runnable and
one react-demo proof lesson must already exist. If any of those are missing, stop and say so; do not
build engine plumbing here.

This course is **not** free-response only. Every lesson pairs a written nuance with a **live demo the
learner runs** and a **code snippet they read**, then an Apply they answer as free response and reveal.
So "green" for a lesson means five things, not a passing test run:

1. the lesson **renders** end to end in the `AppliedLessonPlayer` (Learn, code snippet, demo, Apply, Practice),
2. the **code snippet displays** (the exact broken/nuanced source the lesson is about),
3. the **live demo runs and visualizes the nuance** — the js-runnable source (with its variants) executes and
   the console/visualizer shows the timing, the race firing, the extra re-renders, or the leak; or the named
   react-demo widget mounts and shows what `visualizes` describes,
4. the **Apply/Practice save-and-reveal flow works** — the learner types an answer, saves it, then reveals, and
5. the **model answer** displays and is genuinely high quality (corrected code + mechanism + how to spot it +
   the production symptom).

---

## How to run it

```
/loop author every remaining applied-js-react lesson continuously, back to back with no waiting between lessons, following docs/applied-js-react/AGENT-2-curriculum-developer.md
```

**Run this as one continuous batch — do NOT pause or wait between lessons.** As soon as you finish and
commit a lesson, immediately pick the next unwritten one and keep authoring. Author as many lessons as
you can in each turn (a whole module or several is normal); only yield when your context window is
genuinely running low. When you yield, `/loop` re-enters this runbook automatically and you resume at the
next unwritten lesson with the same no-waiting cadence. Never schedule an idle wait, never stop to "check
in," and never end a turn early while lessons remain and context is available. The ONLY reasons to stop
are: (a) every lesson in `CONTENT.md` is authored and rendering (see Stop condition), or (b) AGENT 1's
machinery is missing (stop and say so). Order is always curriculum order (level → module → lesson).

Don't forget to commit **after each lesson** (not at the end of a batch) so no work is lost if a turn
ends. The course is 12 levels / 58 modules / 161 lessons (49 js-runnable demos, 112 react-demo widgets),
so this run is long — 160+ commits over the whole run is normal, and more than that is still fine. One
lesson per commit, lessons authored back to back.

---

## Per lesson (repeat back to back, no waiting)

Do these steps for one lesson, commit, then **immediately** repeat for the next unwritten lesson in the
same turn. Do not stop or wait between lessons.

1. **Find the next lesson.** Read `CONTENT.md` (and the relevant file under `content/`) top to bottom and
   pick the first lesson whose `id` (`ajr-l{N}-{slug}`) is not yet present in
   `lib/tutorials/applied-js-react/curriculum/levelN/`. Lesson ids are stable — never invent, rename, or
   reorder them; copy the id verbatim from `curriculum-map.json`.
2. **Read the source fields.** Each lesson in the contract carries: `learnFocus`, `liveDemo`
   (`{ kind: "js-runnable" | "react-demo", runs, visualizes }`), `applyPrompt`, `thinkAbout` (the guiding
   questions), `modelAnswerOutline` (already ordered as fix/corrected-code → mechanism → spot-in-review →
   production-symptom → misconception), plus `difficulty`, `estimatedMinutes`, and `skills`. Also read the
   two or three neighboring lessons already authored in that level file so your voice, structure, imports,
   and demo conventions match.
3. **Author the `AppliedLesson` object** in the level file (create `levelN/` and its `index.ts` barrel if
   this is the level's first lesson, matching how the SQL curriculum wires `curriculum/index.ts`). Build
   each part from the contract:
   - **Learn** (the read): expand `learnFocus` into a self-contained write-up of the runtime nuance. A
     learner who read only the Learn should be able to run the demo and attempt the Apply. Center it on the
     concrete mechanism (event loop, capture, re-render trigger, dependency contract, leak), not vocabulary.
     End with a one-line recap.
   - **Live demo** (the centerpiece — every lesson has one):
     - If `kind` is **`js-runnable`**: author the actual runnable JS **demo source and its variants** (for
       example a broken variant and a fixed variant, or a toggle the learner flips) so the runner executes it
       and the console/visualizer shows exactly what `visualizes` describes (the timing, the additive bars,
       the stale value, the leak counter). The source must really run on AGENT 1's runner and really produce
       the visible difference — do not describe a demo, ship one.
     - If `kind` is **`react-demo`**: reference the **widget id** AGENT 1 registered for this lesson and set
       what it should visualize, matching the `runs`/`visualizes` contract (the frozen spinner, the wasted
       renders lighting up, the last-response-wins race, the orphaned timer). Confirm the id exists in the
       react-demo registry before you wire it; if it is missing, that is an AGENT 1 gap — stop and say so.
   - **Code snippet** (what they read): include the exact broken or nuanced source the lesson is about, the
     snippet the Apply refers to. It must be the real code, copy-paste runnable in spirit, not pseudocode.
   - **Apply** (guided free-response, save + reveal): lead the prompt with the deliverable ("Predict the exact
     log order…", "Explain why… and rewrite it so…", "Diagnose why React skips the update and fix it"), carry
     over the `thinkAbout` questions, and provide the model answer, gated behind the reveal.
   - **Practice** (harder real-world variant): a deeper, higher-scale, or more production-shaped twist on the
     same nuance — same free-response save-and-reveal shape, its own model answer.
   - **Model answer** (the reveal payload — must stand on its own as the thing a learner self-compares
     against): give the **corrected code** first, then the **mechanism** (why the runtime does this), then
     **how to spot it in review** (the pattern to grep your eyes for), then the **production symptom** (what
     the user or on-call sees), and name the **misconception** it corrects. This maps one-to-one onto the
     ordered `modelAnswerOutline` bullets — expand each into real prose and real code, do not paste the
     outline.
4. **Register it** so the player can find it — add the lesson to its module in the level file and make sure
   the level flows through the applied-js-react registry (parallel to `lib/tutorials/sql/registry.ts`).
5. **Verify** (below).
6. **Commit** this one lesson with a message like
   `content(ajr): L{N} {slug} ({module}, {level-slug})`, then **immediately go back to step 1 for the next
   unwritten lesson in the same turn.** Do not pause, do not wait, do not end the turn. Keep this author ->
   verify -> commit -> next cycle running continuously until context runs low or the course is complete.

Keep changes scoped to the one lesson plus the minimal wiring it needs. Do not touch AGENT 1's engine, the
player, the demo runner, the widget registry, or other levels' content.

---

## Verifying a lesson (demo runs + code shows + reveal works)

For each authored lesson confirm:

- `pnpm typecheck` passes — the `AppliedLesson` object satisfies AGENT 1's type (this is the one automated
  gate; run it every iteration).
- `pnpm lint` is clean on the touched files.
- The lesson **renders** in the `AppliedLessonPlayer`: Learn markdown, the code snippet, the live demo, the
  Apply prompt, and the `thinkAbout` questions all display without a crash or empty section.
- The **code snippet shows** — the exact source the Apply refers to is visible and readable.
- The **live demo runs and visualizes the nuance**: for a `js-runnable` lesson the source executes on the
  runner and the console/visualizer shows the timing / race / extra renders / leak (flip each variant and
  confirm the visible difference); for a `react-demo` lesson the named widget mounts and shows what
  `visualizes` describes. A demo that renders but does not actually move is a fail — fix it before committing.
- The **save-and-reveal flow works**: type into the Apply free-response box, save it, then reveal — and the
  **model answer displays**. Repeat for Practice.
- **Model-answer quality bar** — read the revealed answer as a senior reviewer would. It must give corrected
  code that actually fixes the snippet, explain the runtime mechanism, tell the learner how to spot the
  pattern in review, and name the production symptom. If it reads like a generic checklist or the code does
  not compile in your head, rewrite it before committing.

Content style (enforce on every lesson):
- Apply/Practice prompts **lead with the deliverable** — "Predict…", "Explain why… and rewrite…",
  "Diagnose… and fix…", "Choose and justify…" — not abstract framing or a technique lecture.
- **No em dashes** in learner-facing prose (Learn, prompts, model answers). Use normal sentence punctuation.
- Every lesson **centers on concrete code plus a live demo**: real snippets, real runtime behavior, real
  failure modes. Syntax is cheap; teach the nuance the demo makes visible.
- Concrete senior-engineer voice: real APIs, real timing, real tradeoffs, the actual production symptom.

---

## Stop condition

Stop the loop when **every lesson in `CONTENT.md` has an authored `AppliedLesson` object that renders in the
player, runs its live demo and visualizes the nuance, shows its code snippet, and saves-and-reveals a
high-quality model answer**, and `pnpm typecheck` + `pnpm lint` are clean across the whole
`lib/tutorials/applied-js-react/curriculum/` tree. At that point the 12 levels / 58 modules / 161 lessons
are fully authored; report the final lesson count and stop. Until then, each iteration authors the next
lessons back to back, one commit each, and the loop continues.
