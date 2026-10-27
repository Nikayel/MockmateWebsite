# CodeSparring post-training and research-engineering strategy

Research date: October 12, 2026. Target graduation: May 2028.

This is a proposed learning and career plan, not an implementation or a report of achieved model results. Role requirements and program availability were checked against official company pages. Fit assessments, project choices, schedules, and dataset sizes below are recommendations, not hiring probabilities or evidence of future openings.

Planning assumption: roughly 8–10 focused hours per week, with a small compute budget. Time and budget preferences are still unconfirmed. No GPU resources, API calls for dataset generation, or production data exports have been purchased or initiated.

## Recommendation

Target **research engineering in post-training**, using **evaluations, coding environments, and training-data quality** as the entry point. Build ML systems depth alongside it through the incoming Intel role and a public PyTorch project.

The proposed progression is:

1. Reliable evaluation environments and behavior measurements.
2. A small coding tutor trained with SFT and DPO.
3. A separate code-repair policy trained with verifiable rewards and GRPO.
4. Profiling, efficient inference, and a modest distributed-training reproduction.

The first product integration belongs in personalized hint generation. Preserve the existing deterministic diagnosis and escalation rules. A new model should earn its place through better measured hint quality, acceptable latency, and acceptable operating cost.

The strongest eventual story is: **built environments and trustworthy training signals, improved a model through controlled experiments, and made the resulting system efficient enough to use.**

## Current career fit

Evidence supplied in the resume: production system ownership, retrieval evaluations, substantial latency improvements, authorization tests, annotation tools, real-world speech evaluation, executable coding tasks, and constrained agent behavior. These support engineering and measurement ability. They do not yet establish distributed model-training experience or independent post-training research results.

The incoming Intel work is considered prospectively, based on the user's description of inference, small-model fine-tuning, and applied AI for an optimization engine. Its actual tools, hardware, scope, and eventual outcomes are not verified here.

| Role family | Fit from current evidence | Missing evidence to build |
| --- | --- | --- |
| SWE building RL environments and human-data tools | Closest current match | Python services, reproducible environment validation, annotation QA, training integration |
| Research engineer for evals and environments | Strong direction | Statistical rigor, grader calibration, model intervention experiments, out-of-distribution evaluation |
| Code RL / post-training research engineer | Main development target | Actual training runs, learning dynamics, verifiable rewards, rigorous ablations, ML performance work |
| Inference / ML systems engineer | Promising complementary direction after Intel | Operator-level profiling, memory/bandwidth reasoning, batching, numerical correctness, distributed behavior |
| Alignment research engineer / scientist | Longer-term extension | Empirical safety research, well-motivated alignment questions, stronger research output and theory |
| Mechanistic interpretability / pretraining research | Less supported by present portfolio | Substantial additional specialization; not the first project priority |

### Anthropic roles checked

- [Full-Stack SWE, Reinforcement Learning](https://job-boards.greenhouse.io/anthropic/jobs/5186067008): builds environment platforms, labeling tools, reward-quality workflows, and researcher dashboards using Python and modern web technology. This maps directly to the platform, annotation interface, and full-stack ownership on the resume.
- [Research Engineer, Code RL](https://job-boards.greenhouse.io/anthropic/jobs/5254364008): combines coding tasks, verifiers, rewards, training experiments, and pipeline performance. The existing sandboxes and debugging scenarios are relevant; model-training depth remains the major gap.
- [Post-Training Model Evaluations](https://job-boards.greenhouse.io/anthropic/jobs/5198255008): emphasizes trustworthy measurement, regression investigation, Python, and production evaluation. The speech benchmark-to-real-world gap is useful evidence here. The posted role also involves substantial ownership during live training runs.
- [Production Model Post-Training](https://job-boards.greenhouse.io/anthropic/jobs/4613592008): requires Python, deep-learning frameworks, and distributed computing. The posting welcomes different experience levels but prefers senior engineers with frontier-system experience. Treat this as a skills target rather than an immediately established fit.
- [RL Engineering](https://job-boards.greenhouse.io/anthropic/jobs/4952051008): requires experience with large-scale training or supporting systems, controlled experiments, and an ML framework. A small single-GPU project is useful preparation, but it is not equivalent to this scale of experience.
- [Performance Engineer, Inference Systems](https://job-boards.greenhouse.io/anthropic/jobs/5224564008): emphasizes cross-layer profiling, numerical correctness, throughput/latency, and capacity tradeoffs. This could become a strong match if Intel provides direct, measurable ML performance responsibilities.
- [Alignment Research Engineer / Scientist](https://job-boards.greenhouse.io/anthropic/jobs/4631822008): asks for empirical research experience and safety familiarity, with work on oversight and robustness. A focused reward-integrity experiment could move the portfolio in this direction.

### OpenAI roles checked

- [Research Engineer, Frontier Evals & Environments](https://openai.com/careers/research-engineer-frontier-evals-and-environments-san-francisco/): the Agent Post-Training team builds environments, graders, data, and experiments. This is the clearest OpenAI match for the proposed project.
- [Personal AGI, Post Training](https://openai.com/careers/research-engineer-research-scientist-personal-agi-%28post-training%29-san-francisco/): product-driven model research, robust evals, and research-stack engineering. A deployed, carefully evaluated tutor would support this direction.
- [RL / Reasoning](https://openai.com/careers/research-engineerresearch-scientist-rlreasoning-san-francisco/): asks for RL research background and deep ML understanding. Knowledge of algorithm names alone is insufficient evidence.
- [Software Engineer, Model Inference](https://openai.com/careers/software-engineer-model-inference-san-francisco/): production model optimization is a complementary Intel-related route.
- [Researcher, Alignment](https://openai.com/careers/researcher-alignment-san-francisco/): asks for a PhD or equivalent research experience, PyTorch systems strength, and alignment understanding. It also values data-collection interfaces; the HCI background is relevant, but the research requirement remains material.

**Company choice:** Anthropic currently has an especially direct role for the existing full-stack portfolio inside its RL organization. OpenAI's evals/environment work fits the same planned capabilities. This does not establish that either company is easier to enter. Develop the evidence that transfers between both, and reassess actual openings before applying.

## Where ML belongs in the repository

These findings are from local branch `release/staging-20261004` at `1fe5a9ae`. The preceding check found 6 remote-main-only commits and 11 local-branch-only commits. Implementation should reconcile the branch base first; this plan does not perform a merge.

| Existing code | Verified behavior or contract | Proposed use |
| --- | --- | --- |
| `lib/agents/hints/llm-generator.ts` | Produces personalized hints through the AI provider; supports batches of progressive levels | First small-model generation adapter after offline evaluation |
| `lib/agents/hints/prompts.ts` | Defines disclosure levels, code specificity, and evidence requirements | Initial annotation rubric and behavior benchmark |
| `lib/agents/hints/diagnosis.ts` | Uses deterministic routing from test failures, code, trigger, and struggle | Preserve as a baseline and control boundary |
| `lib/agents/hints/graph-nodes.ts` | Combines generation with pattern, retrieval, and user-history hints | Inspect the final hint path as well as raw generator output |
| `lib/workspace-execution/` | Provides executable coding tasks and result contracts | Reuse task definitions and semantics in a separate offline runner |
| `lib/sprint-labs/grading/` | Existing rubric dimensions and grading logic | Reference for verifier design; do not blindly convert every product score into a reward |
| `lib/types.ts` | Session contract includes final code, test results, hint-related review data, and mastery history | Potential future research inputs, subject to data and consent review |
| `lib/learner-model/evidence.ts` | Surfaces scheduling predictions and observed review outcomes | Later learner-outcome analysis; not immediate hint ground truth |
| `docs/learner-model/LEARN-INSTRUMENT.md` | Defines item responses, test counts, reveals, timing, and research-use limits | Existing instrumentation reference; explicitly not code-edit trajectories |
| `lib/tutorials/research-consent.ts` | Research consent versioning and write-time consent handling | Review before extending to model training; do not assume current disclosure covers it |

Alternative features considered:

| Feature | Product value | Learning value for this goal | Priority |
| --- | --- | --- | --- |
| Evidence-grounded hint generation / candidate ranking | More specific help with less premature disclosure | SFT, DPO, preference labels, critic models, behavior evaluation | First |
| Offline code-repair policy and verifiers | Better task validation and evaluation infrastructure | GRPO, execution rewards, reward hacking, rollouts | Second |
| Neural retrieval reranker | Potentially better retrieval relevance | Useful supervised learning, but overlaps existing strengths | Optional later |
| Neural knowledge tracing / retention predictor | Potential personalization | Interesting ML, but requires repeated-user data and is less direct post-training evidence | Defer |
| Learned final interview scoring | Potential feedback consistency | Label quality and trust risks; broad subjective target | Defer until expert grading evidence exists |

## First project: evidence-grounded tutoring

Research question: **Can evidence-aware preference training reduce premature solution disclosure and unsupported diagnosis on held-out coding problems while preserving useful next-step guidance?**

This is an applied model-alignment problem. It becomes research evidence through a clear hypothesis, valid measurements, controlled interventions, and honest limitations. It does not by itself demonstrate frontier alignment expertise.

### Start with a narrow task

Begin with Python, a small set of DSA/debugging tasks, and levels 1–3. Add level 4 examples as a contrast set so the model does not learn that detailed help is always forbidden. Match the actual product policy: the current level-4 prompt allows detailed pseudocode and implementation guidance.

Example state: a learner accesses `nums[i + 1]` at the last loop iteration.

- Useful level-1 candidate: ask what happens to the index during that final iteration.
- Bad candidate: give a complete replacement implementation.
- Another bad candidate: provide generic advice about edge cases without locating the issue.
- Unsupported candidate: claim the learner used a hash map when no map appears in the supplied code.

The model input contains the problem, visible code, visible test evidence, requested hint level, and relevant preceding hints. Private solutions and grading-only tests stay outside the model-visible input.

### Dataset and labels

1. Start with 20–30 authored tasks and several deliberately constructed code states: starter code, a boundary bug, a wrong approach, a passing solution, or insufficient evidence. This is a debugging benchmark, not enough diversity for broad capability claims.
2. Group every derivative of a problem into one split. Keep a locked set of whole problems, and separately test an unseen pattern or bug family. Random splitting of near-identical hints would exaggerate generalization.
3. Generate or author candidate hints. Preserve source, generation configuration, task family, hint level, and label provenance. Check content rights and teacher/provider terms before generating a training corpus.
4. Use a rubric with separate labels for factual correctness, code grounding, disclosure level, useful next action, and uncertainty handling. Record ties and both-bad pairs rather than forcing false preferences.
5. Initially aim for 300–500 carefully reviewed preference pairs and 1,000–2,000 filtered SFT examples. These are workload targets; decide whether to grow them using validation curves and error analysis.
6. Add a second human annotator on a subset when available. Measure disagreement. A solo rubric can bootstrap development but should be described as a single-rater limitation.

Pilot usage hours and aggregate user counts do not imply thousands of usable training examples. Learn telemetry is not persisted source-code history. Existing session shapes are also not proof that fields are populated consistently in production. Audit actual completeness before using any real-user records.

### Experimental ladder

| Condition | Purpose |
| --- | --- |
| Current production hint pipeline | Product baseline |
| Small open model, unchanged weights | Model baseline |
| Same small model with improved prompt | Test whether training is necessary |
| SFT model | Learn format, grounding, and tutoring behavior |
| SFT + DPO | Test whether preference training improves the behavior tradeoff |
| Optional critic + candidate ranking | Test whether selection is better than modifying the generator |

Compare training conditions with the same context, decoding budget, and scaffold. Report separate model-only and final-pipeline results where useful, since later retrieval or fallback hints can change the output users receive. Select hyperparameters on validation data; evaluate the locked test set after selection.

A small model such as [Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B) is one feasible experimental candidate, not a claim about the best current model. Fix the model revision and thinking mode. Start with a capability smoke test; if the model cannot understand the code well enough, prefer a larger model or a narrower task rather than trying to train away the limitation blindly.

Use LoRA/adapters for economical initial experiments. Full training memory includes activations, optimizer states, sequence length, and reference-policy choices; parameter count alone cannot determine the required GPU. Benchmark a small run before setting a compute budget.

### PyTorch depth to demonstrate

- Write a small training loop: data loading, forward pass, loss, backward pass, optimizer, evaluation, checkpoint, and resume.
- Implement completion-only causal-LM loss correctly: next-token shift, padding/attention masks, prompt masking, and EOS handling.
- Implement a small pairwise critic with a scalar score and Bradley–Terry preference loss. Treat this as optional until labels justify it; compare with a simple baseline.
- Implement DPO on a toy/tiny model, then use a maintained trainer for larger runs. Understand policy/reference log-probabilities, `beta`, sequence reductions, length effects, and reference freezing. DPO does not require a separately trained reward model.
- Overfit a tiny batch intentionally, test padding invariance and reference gradients, and verify checkpoint resume. These checks reveal silent training errors.
- Explain AdamW, gradient accumulation, clipping, learning-rate schedules, mixed precision, and why a falling training loss can coexist with worse behavior.

The [original DPO paper](https://arxiv.org/abs/2305.18290) provides the objective and its relationship to preference-based alignment. Reproducing a small controlled result is more valuable here than a large list of unfamiliar algorithm names.

## Second project: verifiable code RL

Use the same task infrastructure for a separate policy that produces a Python solution or a minimal repair. Initially use single-turn episodes; move to tool-using repair trajectories only after the simple experiment works. The solver is an offline research tool, while the tutor remains the learner-facing product.

GRPO is a better fit for executable code rewards than for immediate tutor optimization. Tests can verify code outcomes; they cannot establish that a hint taught a human. An LLM student simulator can help find failure cases but is not evidence of real learning gains.

Environment requirements:

- Clean per-rollout state, bounded execution, restricted editable files, no credentials, and no network access by default.
- Keep the evaluator and private tests outside model-editable files and tools. Browser workers are useful product infrastructure, but should not simply be assumed to be adequate GPU-training sandbox infrastructure.
- Check required test counts and outcomes, not just a zero process exit code. Maintain independent evaluation tests and new inputs to catch hardcoding.
- Verify reference solutions and known-bad solutions. Distinguish a harness failure from a model failure.
- Record environment revision, model checkpoint, prompt, tools, generated patch, reward components, and failure reason.

First compare SFT, best-of-N sampling, and a small GRPO run at an explicit compute budget. Improvements from sampling more candidates should not be presented as improvements from training.

Learn grouped rollouts, relative advantages, zero-variance groups, old-policy probabilities, clipping, optional KL penalties, entropy, truncation, and rollout freshness. Track success on held-out tasks as well as training reward. Use the [DeepSeekMath paper](https://arxiv.org/abs/2402.03300) for the original GRPO formulation and [TRL's GRPO documentation](https://huggingface.co/docs/trl/main/grpo_trainer) for practical custom rewards. Pin the library version before implementation.

An alignment-oriented extension is to compare a naive verifier with a stronger verifier and study whether reward gains reflect real correctness. Anthropic's [reward-hacking research](https://www.anthropic.com/research/emergent-misalignment-reward-hacking) makes this a relevant question. Its [August 2026 update](https://www.anthropic.com/research/improving-alignment-security-efforts) also describes training-environment defects and reward-quality problems. A small public reproduction would address a related failure mode; it would not reproduce the scale or broader conclusions of those studies.

## Measurement and signals

| Metric | Definition / measurement | Important limit |
| --- | --- | --- |
| Premature disclosure | Fraction of L1–L3 outputs crossing the level-specific disclosure rubric | Code-block regex alone is insufficient; prose can reveal solutions |
| Unsupported diagnosis | Fraction asserting a bug or code fact without evidence | Include correct-code and insufficient-evidence cases |
| Useful grounded hint | Fraction that is correct, code-specific, actionable, and level-compliant | Prevents a vague model from winning by saying very little |
| Blind preference win rate | Human choice against a baseline; report ties and both-bad pairs | Randomize display order and include length-matched comparisons |
| Grader quality | Human agreement, confusion matrix, leakage recall at a fixed false-positive rate | A critic used for training is not an independent judge |
| Generalization | Results on new problems, code states, and a separate unseen family | Variations of the same problem are correlated |
| Training stability | Loss, gradient norm, KL where applicable, entropy, reward variance, truncation | Rising reward does not establish improved task performance |
| Code RL correctness | Pass@1 on independent evaluation tests; sampled pass@k separately | Fix sampling budget and separate environment errors |
| Reward exploitation | High training reward with failed independent correctness or forbidden evaluator manipulation | Manual review is needed for ambiguous cases |
| Serving efficiency | End-to-end p50/p95, tokens/sec, peak memory, cost per accepted hint | Include validation, fallback, concurrency, and idle GPU cost |
| Actual learning | Delayed unaided performance on a new related task | Requires an adequately powered human study; same-task completion is a proxy |

Use paired comparisons and confidence intervals with resampling at the problem/family level, not at the token or derived-example level. Repeat important training comparisons across seeds as budget allows. State sample sizes and uncertainty. A 20-task pilot cannot substantiate rare-failure or broad-generalization claims.

Anthropic's [agent-evaluation guide](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) is a useful practical reference for combining deterministic checks, calibrated model judgments, and human review. Keep the training reward and the final evaluation independent enough to detect optimization of a faulty proxy.

Before a user study, review consent, disclosure, retention/deletion, and any applicable university study requirements with the research supervisor. Current research opt-in is not automatically authorization to train models on user code or to release records publicly. Start with authored/synthetic data, and review the exact disclosure before extending the use.

## Intel and systems development

Ask for opportunities to own a measured model-quality/performance tradeoff: fine-tuning recipe, numerical validation, batching, quantization, model compression, or profiling an inference path. This is a proposal for shaping work, not a claim about available assignments.

Portable skills to pursue:

- Separate prefill from decode; reason about KV-cache memory, batching, and memory bandwidth.
- Find operator bottlenecks with [PyTorch Profiler](https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html), then verify the optimization at fixed model quality.
- Understand mixed precision and quantization error; measure correctness across hardware/backend configurations.
- Run a small DDP experiment and then study [FSDP2](https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html): parameter/gradient/optimizer sharding, communication, memory, and checkpointing.
- Learn CUDA/Triton through a small public reproduction if Intel work mainly uses CPU or different accelerators. Start with accelerator-independent concepts, then bridge to tools named in target postings.

The public CodeSparring project can reuse general methods learned at work. Employer code, datasets, weights, internal benchmark details, and nonpublic results belong outside it. Resume outcomes from Intel should be actual, measured, and approved for disclosure.

## Roadmap to May 2028

The first experiment is deliberately sized to finish alongside employment and the master's program. Later stages depend on earlier evidence; they are not obligations to run every algorithm.

| Period | Work | Evidence required before moving on |
| --- | --- | --- |
| Weeks 1–2 | Scope Python hint task; build 20–30 tasks; freeze rubric and grouped splits; run baselines | Error taxonomy, benchmark manifest, reference cases, baseline report |
| Weeks 3–6 | PyTorch training loop; tiny-batch debugging; assemble initial SFT data and preferences | Reproducible run, correct masking, validation results, provenance |
| Weeks 7–10 | SFT vs prompt-only vs DPO; focused ablations | Held-out behavior tradeoffs with uncertainty; documented failures |
| Weeks 11–12 | Write results; profile one model; decide whether any product pilot is justified | Report, runnable scripts, quality/latency/cost decision |
| Early–mid 2027 | Single-turn code-repair environment; small GRPO comparison if budget and skill permit | Independent verifier, equal-budget baseline, reward-integrity analysis |
| Mid–late 2027 | Systems reproduction; second research iteration; research feedback or relevant open-source contribution | Profiling trace, measured optimization, multi-GPU explanation, externally reviewable work |
| Late 2027–May 2028 | Apply selectively; rehearse experimental and ML-systems interviews; maintain project | One strong technical report, one model artifact, one systems artifact, clear role-specific resume |

A suggested weekly split is 4 hours of implementation, 2 hours of ML/math study, 2 hours of labeling/error analysis, and 1 hour of writing and reviewing results. If time is tighter, finish the eval + SFT/DPO study first and postpone GRPO.

### Focused study resources

1. [Stanford CS336](https://cs336.stanford.edu/): select architecture/training and systems work to close fundamentals gaps. The course covers language modeling from tokenization through alignment; completing all material is not a prerequisite to starting the narrow project.
2. [DPO paper](https://arxiv.org/abs/2305.18290): derive and implement the objective on a tiny example.
3. [DeepSeekMath](https://arxiv.org/abs/2402.03300): explain and reproduce a small grouped-policy update before using a trainer as a black box.
4. [PyTorch Profiler](https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html) and [FSDP2](https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html): turn one training or inference bottleneck into a measured systems result.

Statistics should accompany all four: conditional probability, likelihood, cross-entropy, KL divergence, experimental controls, bootstrap intervals, and learning-curve interpretation. Practical proficiency means being able to explain a failed run and design the next experiment.

## Applications and portfolio

Begin seeking research feedback and relevant opportunities during 2027 rather than waiting for graduation. Current programs to watch:

- [Anthropic ML Systems & RL Fellows](https://job-boards.greenhouse.io/anthropic/jobs/5183051008): the checked page describes four months of full-time research and rolling applications for an expected January 2027 cohort. That time commitment may conflict with Intel and school. Availability must be rechecked for a later cohort.
- [OpenAI Residency](https://openai.com/residency/): the checked page says 2026 applications are closed. Monitor future announcements rather than assuming a 2027/2028 opening.
- [OpenAI Emerging Talent](https://openai.com/careers/emerging-talent/): describes early-career routes, including roles for 0–3 years of experience. Check actual listed teams and requirements when applying.

Build a portfolio with an evaluation dataset card, labeling guide, versioned training configs, model card, runnable reproduction, ablation table, failure analysis, and a concise report. A null result with a trustworthy explanation is usable research evidence.

Role-specific resume emphasis:

- **Evals/environments:** task design, verifier validity, real-world evaluation gaps, annotation reliability, measurement uncertainty.
- **Post-training:** model size, algorithm, data provenance, baseline, actual improvement, generalization, training stability.
- **ML systems:** hardware, workload, profiling method, quality constraints, throughput/latency/memory tradeoff.

Future bullet templates below contain placeholders, not achieved results:

- “Built a coding-tutor benchmark across [N] held-out problem families; calibrated disclosure and grounding graders against [N] human judgments.”
- “Post-trained a [size] model using SFT and DPO, reducing premature solution disclosure from [A]% to [B]% while maintaining [metric] on held-out tasks.”
- “Built a verifiable code-repair environment and compared GRPO with SFT and equal-budget sampling; detected [failure mode] using an independent evaluator.”
- “Improved [workload] throughput by [X]% at fixed quality, reducing peak memory by [Y] through [measured intervention].”

The resume already contains substantial breadth. Prioritize these deeper, defensible artifacts over adding another unrelated application. Keep the speech research prominent for evaluation roles; it demonstrates discovering a mismatch between benchmark success and real behavior.

## First concrete implementation scope

Begin implementation with an offline Python evaluation package and 20–30 authored tasks. Keep training dependencies outside the Next.js runtime, store no secrets in task artifacts, and expose a typed model-service boundary only when a pilot is justified.

The first release decision is evidence-based: proceed to a product pilot only if the trained candidate improves a predefined behavior tradeoff or offers a worthwhile cost/performance tradeoff, with no unacceptable disclosure or correctness regression. Otherwise retain the better baseline and publish what the experiment taught.
