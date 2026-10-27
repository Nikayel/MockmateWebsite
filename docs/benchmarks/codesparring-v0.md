> Revision 0.1.1 verifies the frozen source against its pinned Git commit. Later product scenario changes do not rewrite this benchmark; the current multi-file cache scenario needs a new authoring recipe before re-export.

# CodeSparring v0: candidate audit and benchmark design

Selected from the local scenario catalog at source commit
`1fe5a9ae66f40ae7d299d4497ef87d7e1da8e2f1`. The export audited **221 DSA and 24
bugfix scenarios**. Exact lineage is in the catalog hashes; this does not claim
that the local branch matches GitHub main.

The first version measures evidence-grounded hints on 20 fixed tasks. Executable
correctness QA establishes that the underlying tasks and learner states are
usable. Model behavior and learning outcomes are separate measurements.

## Candidate selection

| DSA | Pattern | Main diagnostic signal |
| --- | --- | --- |
| Two Sum | Arrays/hashing | Same-index reuse, original indices, duplicate values |
| Valid Palindrome | Two pointers | ASCII normalization, digits, punctuation |
| Valid Parentheses | Stack | Nesting, type, prefix and suffix validity |
| Longest Substring Without Repeating Characters | Sliding window | Contiguity and a left boundary that cannot retreat |
| Binary Search | Binary search | Inclusive bounds, return index, missing target |
| House Robber | Dynamic programming | Greedy/parity misconceptions and state updates |
| Course Schedule | Graphs | Disconnected cycles and isolated courses |
| Subsets | Backtracking | Mutable-list aliasing, multiplicity, unordered outputs |
| Merge Intervals | Intervals | Touching endpoints, containment, ordering |
| Last Stone Weight | Heap | Heaviest-first behavior and complete cancellation |

The selection gives ten patterns and straightforward Python interfaces. Tree,
linked-list, and stateful-class problems would add adapter ambiguity before the
first behavior benchmark is established. Kth Largest was considered, but its
catalog's unqualified O(n) target would complicate comparisons between heap and
quickselect approaches. Last Stone Weight has a clearer initial contract.

| Bugfix pack | Defect family | Required regression coverage |
| --- | --- | --- |
| Webhook Idempotency | Wrong dedup key | Same attributes/different IDs; refunds; true redelivery |
| Entity Resolution Merge | Wrong dedup key | Same name/different namespaces; normalization |
| Metric Window Rollup | Off-by-one window | Half-open window; exact boundary; duplicate samples |
| Session Window Count | Off-by-one window | Exactly 30 minutes stays one session; just over starts another |
| Log Error Rollup | Accumulator scope | Zero-error service after errors; first-seen output ordering |
| Monitor Empty Series | Silent boundary | No data versus observed zero; critical-threshold equality |
| Cache Eviction | Mutation during iteration | Consecutive expirations; last-write refresh; expiry equality |
| Payout Batch Mutation | Mutation during iteration | Adjacent replay followed by a legitimate payout; supported currencies |
| Pipeline Order Dependence | Order dependence | Partial/exact batches; per-pipeline isolation; invalid records |
| Foundry Usage Rollup | Double count | Cross-replica replay, backup-only records, normalized accounts |

These cover all seven authored pack defect classes and all three pack difficulty
levels. The selected sources are 65–118 lines, with a meaningful parse/reduce/report
flow. They are sufficient for a bounded hint pilot without adding filler files.
They do not represent broad multi-file software debugging.

The unselected four packs overlap these signals: endpoint peak/log accumulation,
ontology first-record/monitor silent-boundary handling, ledger/usage double
counting, and alert/pipeline state leakage. The legacy bank has ten workspaces,
including larger navigation tasks, but mixes JavaScript and Python and different
execution/visibility contracts. It remains a candidate for a later multi-file
version rather than being silently mixed into this first Python benchmark.

## Hardening performed

- Validate every shipped DSA expected answer and every selected authored example
  against an independent algorithm.
- Verify every public bugfix oracle against a separately written reducer.
- Execute correct reference programs on public, boundary, seeded generated, and
  maximum-size cases; accept reversed Two Sum indices and reordered valid subsets.
- Reject duplicate subsets, same-index Two Sum answers, type-confused answers,
  and plausible flawed programs.
- Add private inputs with new identities, values, orderings, duplicate deliveries,
  malformed records, and equality boundaries. Expected outputs are computed by
  the independent reducers, not copied from the program being tested.
- Demonstrate that hardcoding a public output passes the public suite but fails
  the private suite.
- Keep private cases, variant names, correctness labels, and repair notes outside
  the model request. Correct-code controls intentionally contain the learner's
  already-correct code; they test whether the tutor invents defects.
- Fingerprint source files, the hint policy, and the authoring recipe. Reject stale
  compiled packs, snapshot drift, and model responses from a different revision.

## Units and evaluation use

DSA: four states per task (unfinished, two plausible faulty programs, correct).
Bugfix: three states per task (shipped defect, partial fix, correct).
This yields **70 learner states and 210 requests** at hint levels 1–3, including
20 correct-code control states. They are repeated views of **20 task identities**.
Count tasks, not requests, as the cluster unit for uncertainty estimates.

All 20 families are evaluation-only. Create training data from other families
and keep related variants together. Familiar DSA algorithms may be in pretraining;
the authored faulty states increase diagnostic specificity but do not prove lack
of contamination. Once the benchmark is used for repeated tuning, create a new
held-out set before claiming generalization.

The seed is fixed at `20261012`. This is a regression and reference-validity seed,
not a secret. Later code-RL evaluation needs independently held-back test seeds
and a hardened execution environment.

## Results and next experiment

See [the executed report](../../benchmarks/codesparring/reports/qa.md) for counts
and [machine-readable per-task results](../../benchmarks/codesparring/reports/qa.json).
The public-suite escape count quantifies where existing tests missed the authored
counterexamples. It is not a universal estimate of grading accuracy.

The next experiment is to collect actual model responses to
`benchmarks/codesparring/model-inputs.jsonl` using identical decoding settings,
then complete a separate copy of the annotation template with the human rubric.
Report disclosure, unsupported diagnosis, usefulness, and correct-code-control
behavior. No model quality scores or learning gains are claimed by fixture QA.

Commands and response schema are in
[the benchmark README](../../benchmarks/codesparring/README.md).
