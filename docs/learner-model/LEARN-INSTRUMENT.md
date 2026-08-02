# The Learn-side instrument

*A companion to [`RESEARCH-MEMO.md`](./RESEARCH-MEMO.md), which describes the open learner model on the practice/spaced-repetition side. This one describes what the curriculum can now measure.*

## What changed

Until 2026-08-02 the `/learn` platform persisted exactly one document per learner per lesson: three section statuses, two timestamps, and a `lastExerciseScore` that was written as the constant `100`. Everything a learning scientist would want — attempts, hint use, which wrong answer was chosen, how long it took — existed in React state and was discarded on unmount. The two analytics events that did exist reached GA4 only, were suppressed for anyone who had not opted into analytics cookies (default off), and no code read them.

There is now an append-only log, `learn_item_responses`, holding one immutable row per learner action across all three courses.

## What a row carries

| Group | Fields |
|---|---|
| Identity | `subject` on export (salted pseudonym), lesson, level, course, item, section |
| Skill | `skills` as authored, plus `knowledge_components` from a controlled 27-term vocabulary |
| Exercise runs | attempt index, pass/fail, tests passed of total, up to three failing assertions with expected/actual, and a coarse `error_kind` (syntax, name, type, lookup, value, recursion, timeout, runtime) |
| Check answers | the option chosen **by label**, correctness, retry index, and for classify checks the full per-item bucket assignment |
| Scaffolding | hint reveals with index and total, reference-solution reveals |
| Exploration | ungraded demo runs, flagged for whether the learner edited the example first |
| Timing | latency to the action, clamped |
| Governance | `research_consent`, stamped at the moment of observation |

## Why the check data is the interesting part

The curriculum carries roughly 400 authored `check` widgets (~230 in Python as of this writing, ~343 in System Design). Every one is a multiple-choice item where **each wrong option carries a hand-written explanation of why it is tempting**. Those distractors were written by a domain expert as an act of teaching, not labelling, but they function as labels.

So a wrong answer does not merely say the learner got an item wrong. It names which misconception fired: aliasing mistaken for copying, `is` mistaken for `==`, threads expected to speed up CPU-bound work, replicas expected to add write capacity. That is a misconception-tracing dataset with the taxonomy already attached, collected in the field rather than elicited in a lab.

## Research questions this makes answerable

1. **Item-level difficulty and misconception structure.** Which distractors dominate, for which learners, and do they cluster into a small number of underlying wrong models?
2. **Does pretesting work here?** The authoring rule places misconception checks *before* the paragraph that resolves them, so the learner commits a prediction and then meets the correction. Placement is recorded in the content and outcomes in the log, so the prediction-then-correction effect is measurable against consolidation checks placed after their chunk.
3. **Does the exploration matter?** `demo_run` with its `edited` flag distinguishes learners who ran the worked example, who modified it, and who skipped it, against downstream first-try accuracy.
4. **Scaffolding and outcome.** Two learners who both pass are not equivalent if one took three hints. Hint reliance is now separable from eventual success.
5. **Transfer between task types.** This is the one that needs both instruments. The spaced-repetition side already logs per-review predicted-versus-actual retention and hosts an inspect/challenge/correct loop with falsifiable verification. Curriculum learning and retrieval practice are structurally different tasks; whether a learner's self-knowledge calibration transfers between them is a question the platform can now ask on its own data.

## Governance

Product use and research use are separated, and the separation is enforced rather than promised.

Recording happens for every signed-in learner because the product needs it: progress, resume, and finding lessons that are broken. Research use requires an explicit opt-in recorded in `user_research_consent`, surfaced in account settings in plain language that states declining costs nothing.

Consent is **stamped on each row at write time**, not resolved at export. Consent is a fact about the moment an observation was made: a learner who opts in today has not thereby consented to last month's rows, and one who withdraws has not un-consented rows they already agreed to. Resolving it lazily gets both directions wrong.

The export path (`/api/admin/learn-research?view=export`) returns consented rows only, with a salted pseudonym in place of the uid. It drops the document id too, because that id is composed from the uid and would otherwise carry it out inside the row's own primary key.

## Honest limitations

- **No time-on-task.** Latency to a single action is recorded; genuine session-level time-on-task, with idle detection, is not.
- **No code capture.** Learner submissions are still not persisted, only the graded outcome and the failing assertions. Capturing edit trajectories would be a much larger privacy decision.
- **No Learn-side experiment.** The A/B infrastructure that exists serves the scheduler and the learner-model condition. No lesson, sequencing, or pedagogy experiment is assigned or logged, so anything comparative here is observational.
- **Lessons still do not enter spaced repetition.** The controlled vocabulary that blocked it is now in place; the wiring is not.
- **Zero data so far.** This is instrumentation shipped ahead of a launch, not a result. Nothing here is evidence yet.
