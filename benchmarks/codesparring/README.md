# CodeSparring benchmark v0

20 evaluation-only tasks: 10 DSA problems and 10 Python bugfix incidents. The task
selection, authoring recipe, public model requests, private QA labels, and executed
results are versioned together. This is a first benchmark for evidence-grounded
hints, not a training dataset.

Read [selection and scope](../../docs/benchmarks/codesparring-v0.md),
[the executed QA report](reports/qa.md), and [the human rubric](RUBRIC.md).

## Commands

Requires Git history containing the pinned source commit and Python 3.11+ on macOS/Linux.
Run from the repository root. No additional Python packages or model credentials
are required for fixture QA.

```sh
pnpm benchmark:test
pnpm benchmark:verify
```

`verify` checks source hashes against the pinned Git commit, executes references and wrong programs, and compares
generated artifacts with the frozen snapshot. It does not update those artifacts.
The report records the Python version of the run; changing that version also
changes the report provenance.

The product catalog can evolve independently. Revision 0.1.1 preserves the original
single-file cache task; main now has a multi-file cache task. Exporting a new
benchmark from current product scenarios requires reviewing that task and extending
the exporter and execution recipe for multiple files. Do not replace product files
to satisfy the frozen benchmark.

When deliberately authoring a new version, review the changes and bump
`selection.json`'s version, then run these commands separately:

```sh
pnpm benchmark:export
pnpm benchmark:audit
```

`export` reads the actual scenario registry, verifies compiled packs against their
authored files, and records source hashes. `audit` fails on incorrect reference
outputs, wrong authored example answers, out-of-domain DSA inputs, surviving
authored mutants, rejected valid alternatives, or unexpectedly passing starters.
It writes a blank annotation **template**, never completed human reviews.

## Artifacts

| File | Purpose |
| --- | --- |
| `selection.json` | Selected IDs, rationale, source paths, groups, original source commit |
| `catalog-inventory.json` | Audited metadata for all 245 DSA/bugfix scenarios |
| `catalog.json` | Frozen authoring snapshot; not a model-context export |
| `model-inputs.jsonl` | 210 allowlisted requests, with version and recipe fingerprints |
| `private/state-labels.jsonl` | Executed correctness labels for 70 learner states; no hint ratings |
| `annotations-template.csv` | Empty human-review rows for each request |
| `reports/qa.json` | Machine-readable fixture metrics and per-mutant failures |
| `reports/qa.md` | Readable results and interpretation limits |

Private means excluded from the provided model context. These files are still in
the repository; this is not a secrecy guarantee against an agent with repository
access or against pretraining contamination. Give a model only `messages` from the
public request file. Never attach the catalog, QA report, repair modules, rubric
answers, or private labels to the generation request.

## Recording model responses

Each response JSONL record has exactly these string fields:

```json
{
  "id": "unique-response-id",
  "request_id": "dsa-two-sum/state-00/L1",
  "model": "provider/model@revision",
  "benchmark_version": "0.1.0",
  "recipe_sha256": "copy-from-the-request",
  "content": "the actual model response"
}
```

Copy the annotation template to a separate review file. Fill `response_id`,
`reviewer`, and all six binary ratings after reading the response and rubric.
Record decoding settings, seed, model revision, context policy, and trial count
alongside the response file; compare models with the same generation setup.

Score a fully reviewed model run:

```sh
python3 -m benchmarks.codesparring score --responses /path/to/responses.jsonl --annotations /path/to/reviews.csv
```

Add `--allow-partial` only for an explicitly labeled pilot. Blank rows are
unmeasured, not zero. The scorer rejects mixed models, duplicate reviews, mismatched
benchmark fingerprints, missing ratings, and incomplete coverage by default.
Metrics are fractions in `[0, 1]`: higher is better for correctness, grounding,
actionability, and level compliance; lower is better for disclosure and unsupported
diagnosis. Macro means average trials within each request, then requests within
each task, then weight tasks equally. Micro means weight reviewed responses
equally after averaging raters. Intervals resample task clusters 2,000 times;
they do not measure rater uncertainty or generalization beyond these tasks.

## Execution boundary

The runner executes only trusted, developer-authored references and negative
fixtures. It bounds wall time, CPU time, and output; Linux additionally has an
address-space limit. macOS memory is not isolated. This is **not a security
sandbox** and does not block network or filesystem access. Run generated repairs
in a hardened isolated environment before connecting an RL loop.

Correctness tests do not prove optimal complexity. Bugfix v0 covers phase 1.
Keep all derivatives of these 20 problem families out of SFT/DPO/GRPO training.
Training examples must come from separate families. No model quality or human
learning improvement has yet been measured.
