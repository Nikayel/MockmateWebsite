# Curriculum Audit & Modernization — 2026-08-16

One-day, ~35-agent operation over the System Design (208 → 224 lessons) and Python (83 → 86
lessons) curricula: a read-only audit council, a verifier-first fix fleet, a subtle sourcing
pass, four new AI-era modules, and an adversarial audit of the finished work. This file is the
ledger; the per-finding detail lives in the session's findings files (scratchpad, not committed)
and in the individual commit messages.

## Why

The corpora had never had a dedicated factual audit; prior sweeps kept finding confidently wrong
claims (Spark broadcast threshold off 1000x, SQLite `date()` semantics, HAProxy absolutes). The
AI corpus in SD Level 11 was a correct 2024 syllabus aging in the fastest-rotting territory in
the field, and lessons carried no citations anywhere.

## Method

1. **Council (10 read-only auditors, disjoint level ranges).** Every one of the 291 lessons was
   read; every suspect claim quoted verbatim with file:line; executable claims executed;
   time-sensitive claims verified against primary sources on the live web. Negative results were
   recorded (the largest: all ~140 recomputed arithmetic chains across both tracks were correct;
   defects cluster in vendor attribution and currency, not math).
2. **Verifier before sweep.** Two guards landed before the fixes: `lesson-sources-format.test.ts`
   (the sourcing wave's format contract, seeded with its own failure cases) and
   `prose-conventions.test.ts` (British spellings + em dashes over learner-facing strings,
   shrink-only per-file baselines, graded contract tokens exempted).
3. **Fix waves (disjoint files, pathspec commits, one finding per commit).** ~120 correction
   commits across SD L0-L11 and Python L1-L5, plus modern-Python currency extensions (walrus,
   `itertools.batched`, `ExceptionGroup`, dataclass `slots`/`kw_only`, `StrEnum`, pattern
   matching, `TaskGroup`, `tomllib`, PEP 695, `Self`, `override`, TypedDict, `add_note`).
4. **Sourcing.** 53 existing claim-dense lessons gained a one-line `**Sources:** [..](..) · ..`
   footer (pattern spec'd, every URL verified live, one commit per lesson with a two-line diff).
   All 19 new lessons carry the line from birth. Floor-pinned at 72 sourced catalog entries.
5. **New content.** SD Level 11 gained 16 lessons: four appends to the LLM/GenAI module
   (prefill/decode split, prompt-cache economics, constrained decoding, GPU capacity economics)
   and three new modules — m5 Retrieval Engineering (chunking/contextual retrieval, document
   parsing, query understanding/HyDE, late interaction, graph retrieval, embedding lifecycle),
   m6 Agent Platforms (MCP, agent memory, multi-agent fan-out, injection-safe design), m7
   Operating AI Systems (agent tracing, trajectory evals). Python Level 4 gained
   `py-l4-ai-engineering` (retry/backoff+token budgets, streaming decode, chunk/score/fuse),
   authored against the real Pyodide constraint (stdlib only, no network; stub clients).
   Integration was gated: two modules were refused on measured guard breaches (openers,
   label-length leaks, rubric orphans) and repaired before landing — the pins held afterward,
   which is the proof the repairs were real.
6. **Wiring.** All 19 new lessons entered the related-concepts graph (107 edges incl.
   cross-track links to the Data Engineering AI level), with differentiator-carrying anchors.
7. **Adversarial audit on the finished work.** 21 findings (3 blocking) in exactly the classes
   automation could not see: a cached-cost curve mislabeled against its own formula, seeded
   fences printing outputs their code does not produce, positional cross-references broken by
   mid-module insertion, a model answer inventing a budget figure and ignoring its supplied
   gate, ungraded README contracts, and one claim refuted by the very source added beneath it.
   All fixed in a final wave; the audit's CLEAN list (arithmetic, seams, research-gap
   discipline, hidden suites) is as load-bearing as its findings.

## Highlights of what was wrong (fixed; sample)

- Kafka: ZooKeeper taught as a live option (removed in 4.0); `acks=all` misstated in a graded
  model answer; BACKWARD-compatibility bullet contradicted its own walkthrough.
- The geohash neighbor table: 8 of 9 cells wrong (verified by executing a codec).
- DynamoDB filed as leaderless with tunable quorums (it is leader-based per partition,
  Multi-Paxos); Postgres described as clustered storage with in-place updates.
- A graded Python check marking `37.0` correct where the expression returns `37`; a GIL race
  check whose "correct" answer expired in CPython 3.10; two graded items calling a linear
  `+=` loop quadratic; a hidden test failing a safe, hint-compliant answer.
- L11 currency: TGI cited as current (archived 2026-03); "autoscale on GPU utilization"
  (now anti-guidance; queue depth + KV-cache utilization); missing binary quantization, provider
  prompt caching, MCP, EAGLE-3, MLA; "RAG is the default" reframed as a design axis.
- VPA/HPA claim inverted vs upstream; ACM described as an ACME CA with 90-day certs; Istio
  sidecar-only framing predating ambient GA; Hystrix as sole named resilience library.
- 153 British spellings (census; the estimate had been ~18) minus 13 graded contract tokens
  that must never be respelled (`--colour`, `{"colour"...}`, `wrong_behaviours`, `"summarise"`).

## Fleet-engineering lessons (now in CLAUDE.md)

- **A printed commit sha is not proof.** Three commits vanished after printing success (two
  lint-staged ref races, one volume flush). Post-commit verification (`git cat-file -e` +
  `git merge-base --is-ancestor`) is now standing protocol; content survives in the working
  tree and is re-committed.
- Integrators re-measure author claims: both refused modules had author self-reports asserting
  the exact properties the integration tests then disproved.
- Corpus-count pins (`exercise-genres`, `coverage-floors`, `corpus-facts`) must move in the same
  commit as the content that moves them, by measured amounts.

## Verification cadence

Green gates before each push: `pnpm typecheck`, full `pnpm test` (finished at 387 files /
6,555+ tests after integration), `pnpm build`. Every agent-reported sha reconciled against
history. The prose baselines and sources floor are boundary-verified exact, not slack.

## Residuals (known, deliberate)

- 26 baseline British-spelling hits remain: 13 graded contract tokens (never respell) and the
  rest recorded per-file in `prose-conventions.test.ts`.
- `sd-l10-rate-limiter`'s `RateLimit-*` header triple: the IETF draft consolidates to two
  fields but is unconfirmed as an RFC; deployed convention still favors the triple. Left as is.
- The audit's 10-commit diff sample completed 2 of 10 before its budget; the remaining 8 are
  covered by per-agent verification only.
- F30 (one Python workspace's Pyodide-specific tempfile assumptions) is documented but only
  host-python verified.
