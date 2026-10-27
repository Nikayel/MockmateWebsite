# CodeSparring v0 benchmark QA

Version `0.1.1` · seed `20261012` · base `1fe5a9ae66f40ae7d299d4497ef87d7e1da8e2f1`

This report measures authored fixture health. No model responses have been scored.

| Executed metric | Result |
| --- | --- |
| tasks | 20 |
| dsa tasks | 10 |
| bugfix tasks | 10 |
| dsa patterns | 10 |
| bug classes | 7 |
| reference cases passed | 1179 |
| reference cases total | 1179 |
| public cases | 93 |
| private cases | 1086 |
| unique inputs within tasks | 1134 |
| maximum size dsa cases | 10 |
| valid alternative programs accepted | 2 |
| authored mutants | 80 |
| authored mutants rejected | 80 |
| mutants passing all public cases | 23 |
| public output hardcodes rejected | 20 |
| starter programs rejected | 20 |
| learner states | 70 |
| hint requests | 210 |

## Selected tasks

| Task | Track | Group | Cases passed | Mutants rejected | Public-suite escapes |
| --- | --- | --- | --- | --- | --- |
| dsa-two-sum | dsa | arrays-hashing | 79/79 | 4/4 | 1 |
| dsa-valid-palindrome | dsa | two-pointers | 80/80 | 4/4 | 1 |
| dsa-valid-parentheses | dsa | stack | 86/86 | 4/4 | 1 |
| dsa-longest-substring-without-repeating | dsa | sliding-window | 80/80 | 4/4 | 2 |
| dsa-binary-search | dsa | binary-search | 82/82 | 4/4 | 1 |
| dsa-house-robber | dsa | dynamic-programming | 80/80 | 4/4 | 1 |
| dsa-course-schedule | dsa | graphs | 81/81 | 4/4 | 1 |
| dsa-subsets | dsa | backtracking | 76/76 | 4/4 | 1 |
| dsa-merge-intervals | dsa | intervals | 78/78 | 4/4 | 1 |
| dsa-last-stone-weight | dsa | heap | 77/77 | 4/4 | 1 |
| stripe-webhook-idempotency | bugfix | wrong-dedup-key | 38/38 | 4/4 | 1 |
| palantir-entity-resolution-merge | bugfix | wrong-dedup-key | 38/38 | 4/4 | 1 |
| datadog-metric-window-rollup | bugfix | off-by-one-window | 38/38 | 4/4 | 1 |
| generic-session-window-count | bugfix | off-by-one-window | 38/38 | 4/4 | 2 |
| generic-log-error-rollup | bugfix | accumulator-wrong-scope | 38/38 | 4/4 | 1 |
| datadog-monitor-empty-series | bugfix | silent-boundary | 38/38 | 4/4 | 2 |
| generic-cache-eviction-mutation | bugfix | mutation-during-iteration | 38/38 | 4/4 | 1 |
| stripe-payout-batch-mutation | bugfix | mutation-during-iteration | 38/38 | 4/4 | 1 |
| palantir-pipeline-order-dependence | bugfix | order-dependence | 38/38 | 4/4 | 1 |
| palantir-foundry-usage-rollup | bugfix | double-count | 38/38 | 4/4 | 1 |

## Interpretation

The private cases catch the authored wrong programs that escape the public suites. This is evidence about these specific counterexamples, not exhaustive mutation coverage.

Cases include repeated inputs; the unique-input metric exposes that overlap. The 210 requests are correlated views of 20 tasks, not 210 independent problems.

All 20 problem families are evaluation-only. Do not put their derivatives into training. Canonical DSA problems and published packs can already be present in model pretraining.

Boundary cases use independent small-domain oracles. Nine maximum-size DSA expected answers are constructive analytical answers; the subsets maximum-size case uses the independent oracle. Correctness checks do not prove asymptotic complexity.

Bugfix v0 tests phase 1 only. These are bounded single-file Python incidents, not a multi-repository autonomous-engineering benchmark.

The subprocess limits prevent common accidental hangs and output floods during authored QA. They do not isolate hostile code or block network/filesystem access; use a hardened sandbox before executing untrusted model-generated repairs.

Model win rate, disclosure rate, diagnosis accuracy, latency, cost, and learning gains remain unmeasured. See the rubric and annotation template for the next evaluation.

Recipe SHA-256: `ecb57fc85a3ab91c4499ddb9748591c7a28939b9941a50d6722600b207007ca4`
