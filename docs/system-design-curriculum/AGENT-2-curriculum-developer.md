# AGENT 2 — system-design curriculum developer (run with `/loop`)

> Part of the **[Learn System Design curriculum pack](./README.md)**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [RESEARCH](./RESEARCH.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)
> **Read order each iteration:** [`CONTENT.md`](./CONTENT.md) (find the next lesson + its `content/<moduleId>.md` file) → [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) / [`curriculum-map.json`](./curriculum-map.json) (ids, `thinkAbout`, `modelAnswerOutline`) → author one `DesignLesson` in `lib/tutorials/system-design/curriculum/levelN/`. Start only after [`AGENT-1`](./AGENT-1-engineer.md) is green.

The content-author runbook: turn `docs/system-design-curriculum/CONTENT.md` (and the per-module files
in `docs/system-design-curriculum/content/`) into real `SystemDesignLesson` objects in
`lib/tutorials/system-design/curriculum/levelN/`, one lesson per iteration, each verified to render and
reveal. Mirrors the SQL course's `AGENT-2-curriculum-developer.md`. **Start only after AGENT 1's
Definition of Done is green and merged** — the `SystemDesignLesson` type + registry + `SystemDesignLessonPlayer`
+ the free-response save-and-reveal flow + at least one proof lesson must already exist. If any of those
are missing, stop and say so; do not build engine plumbing here.

System design is **free-response** — there is no code execution, no sql.js runner, and no test cases to
run green. Verification is therefore about rendering and the save/reveal UX, not a passing grade:

1. the lesson renders end-to-end in the `SystemDesignLessonPlayer`,
2. the **Apply** (and **Practice**) free-response save-and-reveal flow works — the learner can type an
   answer, save it, then reveal, and
3. the **model answer** displays and is genuinely high quality.

---

## How to run it

```
/loop author every remaining system-design lesson continuously, back to back with no waiting between lessons, following docs/system-design-curriculum/AGENT-2-curriculum-developer.md
```

**Run this as one continuous batch — do NOT pause or wait between lessons.** As soon as you finish
and commit a lesson, immediately pick the next unwritten one and keep authoring. Author as many
lessons as you can in each turn (a whole module or several is normal); only yield when your context
window is genuinely running low. When you yield, `/loop` re-enters this runbook automatically and you
resume at the next unwritten lesson with the same no-waiting cadence. Never schedule an idle wait,
never stop to "check in," and never end a turn early while lessons remain and context is available.
The ONLY reasons to stop are: (a) every lesson in `CONTENT.md` is authored and rendering (see Stop
condition), or (b) AGENT 1's machinery is missing (stop and say so). Order is always curriculum order
(level → module → lesson).

Don't forget to commit **after each lesson** (not at the end of a batch) so no work is lost if a turn
ends. The course is 12 levels / ~208 lessons, so this run is long — 200+ commits over the whole run is
normal, and more than that is still fine. One lesson per commit, lessons authored back to back.

---

## Per lesson (repeat back to back, no waiting)

Do these steps for one lesson, commit, then **immediately** repeat for the next unwritten lesson in the
same turn. Do not stop or wait between lessons.

1. **Find the next lesson.** Read `CONTENT.md` (and the relevant file under `content/`) top to bottom
   and pick the first lesson whose `id` (`sd-l{N}-{slug}`) is not yet present in
   `lib/tutorials/system-design/curriculum/levelN/`. Lesson ids are stable — never invent, rename, or
   reorder them; copy the id verbatim from the content contract.
2. **Read the source fields.** Each lesson in the contract carries: `learnFocus`, `applyPrompt`,
   `thinkAbout` (the guiding questions), `modelAnswerOutline`, plus `difficulty`, `estimatedMinutes`,
   and `skills`. Also read the two or three neighboring lessons already authored in that level file so
   your voice, structure, and imports match.
3. **Author the `SystemDesignLesson` object** in the level file (create `levelN/` and its `index.ts`
   barrel if this is the level's first lesson, matching how the SQL curriculum wires `curriculum/index.ts`).
   Build each part from the contract:
   - **Learn** (the read): expand `learnFocus` into a self-contained senior-engineer write-up. A
     learner who read only the Learn should be able to attempt the Apply. End with a one-line recap.
   - **Apply** (guided free-response): lead the prompt with the deliverable, carry over the
     `thinkAbout` questions, and provide the model answer built from `modelAnswerOutline`, gated behind
     the reveal.
   - **Practice** (harder real-world variant): a deeper or higher-scale twist on the same skill, same
     free-response shape.
   - **Model answer:** state assumptions, give the high-level design, name concrete technologies,
     quantify where sensible, and call out tradeoffs plus at least one common wrong turn. This is the
     payload the reveal shows — it must stand on its own as the thing a learner self-compares against.
4. **Register it** so the player can find it — add the lesson to its module in the level file and make
   sure the level flows through the system-design registry (parallel to `lib/tutorials/sql/registry.ts`).
5. **Verify** (below).
6. **Commit** this one lesson with a message like
   `content(sd): L{N} {slug} ({module}, {level-slug})`, then **immediately go back to step 1 for the
   next unwritten lesson in the same turn.** Do not pause, do not wait, do not end the turn. Keep this
   author -> verify -> commit -> next cycle running continuously until context runs low or the course
   is complete.

Keep changes scoped to the one lesson plus the minimal wiring it needs. Do not touch AGENT 1's engine,
the player, or other levels' content.

---

## Verifying a lesson (no tests to run — render + reveal instead)

Because Apply/Practice are free-response, "green" means **it renders and the save/reveal works**, not a
passing test run. For each authored lesson confirm:

- `pnpm typecheck` passes — the `SystemDesignLesson` object satisfies AGENT 1's type (this is the one
  automated gate; run it every iteration).
- `pnpm lint` is clean on the touched files.
- The lesson **renders** in the `SystemDesignLessonPlayer`: Learn markdown, the Apply prompt, and the
  `thinkAbout` questions all display without a crash or empty section.
- The **save-and-reveal flow works**: you can type into the Apply free-response box, save it, and then
  reveal — and the **model answer displays**. Repeat for Practice.
- **Model-answer quality bar** — read the revealed answer as a staff interviewer would. It must state
  assumptions, name concrete technologies, quantify where it helps, and end with tradeoffs plus a common
  wrong turn. If it reads like a generic checklist, rewrite it before committing.

Content style (enforce on every lesson):
- Apply/Practice prompts **lead with the deliverable** — "Design…", "Explain how you would…",
  "Choose and justify…" — not abstract framing.
- **No em dashes** in learner-facing prose (Learn, prompts, model answers). Use normal sentence
  punctuation.
- Concrete senior-engineer voice: real systems, real numbers, real tradeoffs.

---

## Stop condition

Stop the loop when **every lesson in `CONTENT.md` has an authored `SystemDesignLesson` object that
renders in the player and reveals a high-quality model answer**, and `pnpm typecheck` + `pnpm lint`
are clean across the whole `lib/tutorials/system-design/curriculum/` tree. At that point the 12 levels
are fully authored; report the final lesson count and stop. Until then, each iteration authors the next
single lesson and the loop continues.
