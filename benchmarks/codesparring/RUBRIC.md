# Hint review rubric v0

Judge the actual response against the exact request, visible code, and requested
level. Keep annotation separate from generation. Reference repairs and executed
state labels may assist reviewers, but must never be provided to the generating
model. Review both valid-code controls and faulty/unfinished-code states.

## Level contract

The system policy is copied from `lib/agents/hints/prompts.ts` and fingerprinted.

- **L1:** a specific guiding question or nudge anchored in available evidence;
  avoid naming the full solution or dictating the exact repair.
- **L2:** explain a relevant technique or debugging concept and why it applies;
  guide the next decision without delivering a complete solution.
- **L3:** give a grounded explanation and approach, including relevant pitfalls;
  no complete runnable implementation or full repair patch.
- **Already-correct code:** acknowledge what the evidence supports. A grounded
  validation, explanation, or tradeoff question is useful. Do not invent a bug
  solely because the request asks for a hint.

Level-3 explanation can legitimately identify a defect and explain a repair
strategy. Do not label every diagnosis as solution leakage. For one-line defects,
distinguish a conceptual explanation from supplying the complete exact edit.
Use a second reviewer to adjudicate ambiguous cases.

## Binary ratings

| Column | 1 means | 0 means |
| --- | --- | --- |
| `correct` | All material technical claims are correct under the task contract | At least one material claim is wrong |
| `grounded` | The help is tied accurately to visible code, tests, or constraints | The help invents evidence or remains generic when specific evidence exists |
| `actionable` | Gives a useful next thought, check, or step for this state | Vague, irrelevant, circular, or blocks progress without a reason |
| `level_compliant` | Matches the requested amount and kind of assistance | Over-discloses, under-delivers, or violates a material level rule |
| `premature_disclosure` | Gives a complete solution/patch or exceeds the requested disclosure level | Does not cross that boundary |
| `unsupported_diagnosis` | Asserts a defect or code fact not supported by the actual visible state | Makes no unsupported diagnosis |

For unfinished starter code, missing behavior is visible evidence; asking the
learner to make the first algorithmic decision is appropriate. For correct code,
inventing an off-by-one error counts as unsupported diagnosis even if the proposed
change sounds plausible. An incorrect, confident diagnosis can fail multiple
dimensions; do not force mutually exclusive labels.

Blank means not reviewed. Do not infer a hint rating from the program's execution
pass rate. Non-JSON output may still be technically correct; note the format error
and account for it under level compliance rather than changing correctness by
default.

## Review procedure

1. Read the task, requested level, code, and visible observations.
2. Read the response without the model name when possible; randomize presentation
   order for comparisons.
3. Fill every rating and add a concrete explanation for adverse labels.
4. Have another reviewer independently score a subset and discuss disagreements.
5. Score each model separately. Report coverage, per-track and per-level slices,
   task-weighted rates, intervals, and failure examples.

The automated scorer currently reports overall macro/micro rates and task-cluster
intervals. Inspect per-track, level, and correct-code-control slices explicitly
before making a model-selection decision. A small observed failure rate on this
20-task pilot does not establish rare-event safety or broad tutoring competence.
