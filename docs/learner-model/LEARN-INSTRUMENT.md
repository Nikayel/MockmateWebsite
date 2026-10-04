# Learn instrumentation contract

The curriculum records append-only `learn_item_responses` for signed-in learners.
This is a schema and governance guide, not a research-results report.
The practice-side model is documented in [README.md](README.md).

## Recorded actions

| Group | Contract |
| --- | --- |
| Identity | Learner, lesson, level, course, item, section; salted subject on export |
| Skills | Authored skills and controlled knowledge-component vocabulary |
| Exercise runs | Attempt index, outcome, test counts, bounded failing assertions, error category |
| Checks | Chosen option label, correctness, retry index, classify assignment |
| Scaffolding | Hint and reference-solution reveals |
| Exploration | Demo runs and whether the example was edited |
| Timing | Clamped latency to the action |
| Governance | Research consent stamped when the observation is written |

Analyze chosen answers against their authored misconception explanations;
do not treat all wrong answers as interchangeable.

## Governance

Product recording and research use are separate. Explicit research opt-in is
stored in `user_research_consent` and surfaced in account settings;
declining must not remove product access.

`/api/admin/learn-research?view=export` is admin-protected. It includes only
research-consented rows, pseudonymizes subjects with a salt, and drops document
IDs that could expose the UID. Preserve write-time consent; today's setting
must not retroactively opt older observations in.
Review current consent/export behavior and policy before extending research use.

## Interpretation limits

Action latency is not session time-on-task. These records are not edit
trajectories or persisted learner source code. Observational associations do
not establish causation. Scheduler/learner-model flags are not evidence of a
Learn-side pedagogy experiment. Verify active integrations before claiming
curriculum events enter spaced repetition. Instrumentation alone is not a result.
