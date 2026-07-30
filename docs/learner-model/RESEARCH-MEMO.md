# Research Memo: An Open Learner Model with Contestability, Deployed

*CodeSparring's "What CodeSparring Thinks You Know" as an instrument for studying human-AI co-regulation in learning.*

## What was built

A deployed learning platform (AI-driven coding-interview practice with FSRS spaced repetition) now exposes its learner model to the learner across the full inspect / challenge / correct loop:

- **Inspect**: per-concept and per-problem beliefs (recall probability, memory stability, forgetting forecasts) each carrying a plain-language explanation *and the evidence that produced it* (the learner's actual review history: scores, hints, predicted-vs-actual recall). A mastery score alone is a black box with a number on it; score + evidence + an actionable sentence is an explanation.
- **Challenge**: learners can dispute any belief with structured reasons (typo/misread, rushed, learned-elsewhere). This is the layer classic open-learner-model systems (the Bull & Kay inspect/negotiate lineage) almost never ship: the learner can talk back.
- **Correct**: the model responds visibly and honestly. Slip-type challenges *replay the actual scheduler* from the stored pre-review memory state with a corrected grade, so the correction is exactly what the model would have believed absent the slip, never a cosmetic adjustment. Every challenge schedules a near-term verification review, and its outcome is written back: **the system measures whether the learner was right to dispute it**.
- **Control condition**: a flag-assigned black-box mode (deterministic per-user bucketing) masks all beliefs and disables challenges while keeping the page and the scheduling identical, making view/behavior comparisons across conditions clean.

## Why this is a research instrument, not just a feature

Because the model being opened is a *legible* one (FSRS: per-item stability, difficulty, and a forgetting curve), the inspect/challenge/correct loop is genuinely explainable rather than post-hoc. And because it runs on a live platform with real learners, the logged data are field data, not lab-prototype data. Every layer emits condition-stamped events (views, expands, evidence reads, challenges with belief snapshots, corrections with before/after state, verification outcomes).

## Research questions this instrument can answer today

1. **Calibration of self-knowledge**: when learners dispute the model, are they right? (P(verification passed | challenge), by reason, by belief state at challenge time.)
2. **Does contestability change engagement?** Inspection depth, practice cadence, and subsequent accuracy: open vs black-box.
3. **Trust dynamics**: does challenge behavior shift after the system confirms vs refutes a learner's dispute?
4. **Where transparency lands**: which evidence (score trajectories, forgetting forecasts, predicted-vs-actual recall) do learners actually open before disputing?

## Constructs the design operationalizes

- *Transparency / explainability*: beliefs shown with their evidence and a why-this-number trace at every level.
- *Contestability*: structured dispute with a real, model-honest consequence.
- *Co-regulation / learner control*: shared control over the scheduling of cognitive work, with the system's response made visible ("Because you corrected X, today includes a verification of X").
- *Appropriate reliance / mental models*: the visible trace plus falsifiable corrections give learners the feedback needed to form accurate models of what the system does.

## Status

Live in production behind flags; all four layers shipped with unit-tested scheduling math and a per-user exportable event/challenge log. The platform can host a between-subjects field study (open vs black-box) with no additional engineering beyond setting one environment variable.
