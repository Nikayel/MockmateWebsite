# Public interview evidence and scenario coverage

Research date: 2026-11-04. Repository baseline: `6bdc1f5a`.

Implementation follow-up: the subsequent company-alignment change adds typed
profiles with a Generic default, a Meta maze-pattern workspace, and a Stripe-style
client-library workspace. It also corrects unsupported domain-based company tags.
The inventory and gap table below describe the research baseline; see
[debugging authoring](./debugging-authoring.md) for the implemented contract.

## Recommendation

Focus on this area. We already cover much of the investigation workflow, but the concrete publicly reported company tasks expose gaps that another generic billing or rollup exercise would not fill.

1. Reuse BookClub, cache cleanup, the exception-handling rate limiter, and playable Meridian reviews for code comprehension, diagnosis, verification, and reviewing AI output.
2. Build a phased maze workspace first, then a unique-character word-selection workspace. These have the strongest concrete Meta task evidence in this review.
3. Add an unfamiliar library debugging exercise and a deterministic external-API integration exercise for Stripe-style preparation.
4. Investigate a transaction-rule parser next, with its weaker company attribution made explicit. A bounded concurrent crawler is a useful later addition for Anthropic-style independent coding.
5. Keep Google preparation framed around its evidenced format. No sufficiently substantiated exact Google code-comprehension prompt was found in this review.

These are content priorities inferred from evidence and implementation cost, not measured demand, interview frequency, or conversion forecasts. This report does not implement or publish new questions.

## How to read the evidence

- **Official:** company guidance or a company-released exercise. Establishes what that source actually says, not a universal rule for every role.
- **Reported:** a public candidate account or original reporting based on interviews/documents. Useful evidence; not an authenticated company question bank.
- **Tentative:** a commercial preparation provider's relayed account, an anonymous single report with limited corroboration, or conflicting reports. Use as a research lead and transferable practice idea.
- **Exact:** a full assessed task and its material constraints are implemented. No verified full match to the concrete external tasks below was established.
- **Close:** substantially similar work is implemented, but domain, requirements, environment, or interview progression differs.
- **Partial:** a prerequisite or isolated skill exists; completing it does not establish readiness for the reported task.
- **Missing:** no corresponding task was found in the reviewed registered scenarios, Case Labs, or relevant Meridian tickets.

Question descriptions below are paraphrases of public descriptions, not verbatim interview scripts. Missing signatures, fixtures, constraints, and follow-ups have not been reconstructed as facts. Several sources are commercial prep providers; their report counts and claims of frequency are not treated as independent verification.

## Company formats and AI permissions

| Company | Evidence as of research date | Implication for CodeSparring |
| --- | --- | --- |
| Google SWE | Business Insider's May report describes a Gemini-assisted existing-code exercise; its October update says the pilot broadened but remained a pilot. [May reporting][google-may], [October reporting][google-oct] | Strong reason to support comprehension, debugging, and optimization. Exact Google question remains unknown. |
| Google DeepMind | Official guidance says AI is allowed for preparation, but live interviews/tasks require an explicit exception. It also distinguishes its recruiting process from Google's. [Official guide][deepmind] | Do not apply the Google SWE pilot to every DeepMind round. |
| Meta | Meta officially announced a pilot using authorized AI tools. Public reports describe debugging and extending existing projects. [Official announcement][meta-official], [candidate account][meta-multifile] | Prioritize phased workspaces; preserve independent reasoning and explanation alongside optional assistance. |
| Amazon | Amazon officially describes technical assessments with an interactive AI assistant on a coding platform. No exact task is disclosed there. [Official account][amazon] | Existing debugging/feature work fits the general format. No basis here for an exact Amazon question claim. |
| Canva | Its engineering team describes AI-assisted product challenges and explicitly emphasizes reviewing generated code. Its careers FAQ still describes real-time AI skills assessment. [Engineering post][canva-official], [current FAQ][canva-faq] | Backend work is partly covered; rendered frontend product building is a distinct gap. |
| Stripe | A firsthand report separates unfamiliar-library debugging from chained API integration; that candidate says AI was prohibited in those rounds. A separate firsthand post reports a newer AI round. [Debugging/integration account][stripe-debug], [AI round account][stripe-ai-firsthand] | Keep the rounds and permissions separate. Do not present every Stripe exercise as AI enabled. |
| Anthropic | Official policy disallows AI during live interviews/take-homes unless the specific assessment permits it. The company also released a historical performance take-home. [Official policy][anthropic-policy], [released exercise][anthropic-takehome] | Support both independent coding and explicitly permitted AI work. Historical public exercise is not evidence of the current live prompt. |
| OpenAI | Official guidance explicitly makes tool permissions interview-specific and emphasizes code quality, performance, testing, and communication. [Official guide][openai-guide] | A reported coding question should not automatically be labeled an AI-assisted question. |
| Atlassian | One recent candidate describes an AI-enabled Java/Spring Boot repository task. This review did not establish a company-wide AI policy. [Candidate account][atlassian-pin] | Useful task evidence, but a Python translation would not reproduce Spring/JPA competence. |
| Microsoft | Official guidance calls for independent work during assessments/interviews unless assistance is expressly permitted. [Official guidance][microsoft] | Do not market Microsoft company tags as evidence that an exercise is from an AI-enabled Microsoft round. |
| Palantir | A firsthand account describes learning a new concept from documentation, explaining supplied code, and improving efficiency. [Candidate account][palantir-learning] | Existing Ontology Learning lab is a close format match. This source does not establish AI permission or an exact Ontology interview question. |
| Datadog | Provider-relayed reports describe API integration and PR review; comments dispute whether AI was allowed in one review round. [API account][datadog-api], [review account and conflicting replies][datadog-review] | Transferable practice leads, with tentative company attribution and permissions. Existing Datadog-branded rollups are not evidence of exact interview coverage. |

## Repository inventory actually inspected

The runtime scenario registry resolves **221 DSA, 12 system-design, 26 debugging, and 4 add-functionality entries**. The 26 debugging entries include both languages of the exception-handling question, so they are not 26 unrelated questions.

- [`lib/scenarios.ts`](../../lib/scenarios.ts) and [`real-world/bugfix/all.ts`](../../lib/scenarios/real-world/bugfix/all.ts) combine the public bank; pack files alone are not a separate product catalog.
- [`add-functionality/index.ts`](../../lib/scenarios/add-functionality/index.ts) registers support search, digest scheduling, dispatch, and Ontology querying.
- [`lib/labs/case-labs/index.ts`](../../lib/labs/case-labs/index.ts) registers four Case Labs. Their build milestones reuse scenarios; do not count those again as additional implementations.
- [`Meridian's workbook`](../../lib/sprint-labs/content/meridian/workbook.ts) declares 50 tickets. Loading its compiled registry finds **20 marked playable and 30 marked unplayable**. Four playable tickets have `review-only` AI policy. Workbook-level runnability does not make every ticket playable.
- [`scenario-discovery.ts`](../../components/interview/scenario-discovery.ts) currently features the exception-handling rate limiter, cache cleanup, and comment-thread merge. BookClub is registered but is not one of these three featured IDs.

This is a source/registry coverage audit, not a deployed-site acceptance test. Playability flags and registration were checked; every scenario was not executed. UI access, entitlement behavior, persistence, and deployed runners still need verification before packaging any company preparation track.

## Public task to implementation mapping

| Task | Publicly described ask and evidence | Coverage in our repository | Focus decision |
| --- | --- | --- | --- |
| Google: code comprehension | Read supplied code, diagnose it, and improve it with Gemini. Format is reported; exact prompt not disclosed. [Source][google-may] | **Close format.** BookClub, cache cleanup, and Meridian `MER-304` cover investigation and improvement; `MER-105` exercises review judgment. | **Yes: reuse and surface.** No invented exact Google problem. |
| Meta: maze project | Repair an existing maze project, then extend traversal. A firsthand account mentions walls, portals, and serialization. [Source][meta-maze-firsthand] | **Partial.** `dsa-shortest-path-binary-matrix`, `dsa-walls-and-gates`, and `dsa-keys-and-rooms` teach graph skills, but there is no corresponding multi-file maze repair/extension workspace. | **Build first.** |
| Meta: maze follow-ups | Candidate notes describe path display, revisiting cells, directional cells, and key/door state. Follow-ups vary. [Public candidate notes][meta-maze-notes] | **Missing full task.** BookClub supplies phased debugging experience, not these graph-state constraints. | Add selected phases to one authored maze; do not treat every reported extension as mandatory. |
| Meta: unique-character word selection | Select words maximizing covered characters without repeating a character across the selection. A separate firsthand account reports removing words with shared letters, but does not fully specify the same optimization task. [Public question][meta-words], [firsthand account][meta-words-firsthand] | **Missing workspace.** Word Search, Word Ladder, and Word Break are different problems. Backtracking practice is a prerequisite only. | **Build second.** |
| Meta: card game | Repair move validation, then repeatedly select three drawn cards totaling 15. [Public question][meta-cards] | **Partial.** `dsa-3sum` teaches a related search primitive, but does not implement game state, invalid moves, or repeated removals. | Later; reuse algorithm knowledge, author a distinct game contract. |
| Meta: friend recommendations | Suggest a bounded set of candidates excluding self and current friends; test selection behavior. [Public question][meta-friends] | **Partial.** Ontology traversal and dispatch ranking are adjacent skills, not a friend recommender. | Later; lower priority than the better corroborated maze and words. |
| Meta: multi-file bug repair | Candidate describes defects distributed across a small supplied project and repairing failing tests. No exact task details published. [Source][meta-multifile] | **Close format.** BookClub has 27 files and three editable services, staged tests, and state across requests. Cache cleanup has 10 files and multiple editable modules. | **Yes: use existing content.** |
| Stripe: unfamiliar-library Bug Squash | Run failing tests in an unfamiliar library and repair the implementation. The account gives `requests`/`mako` as library examples, not exact patches. [Source][stripe-debug] | **Close workflow, missing library task.** BookClub/cache cleanup train navigation; billing webhooks and payment rollups are product incidents, not third-party-library debugging. | **High priority:** one compact unfamiliar HTTP-client or template/parser library exercise. |
| Stripe: API integration | Read request input from a file, call an API, parse its response, and use that result for another request across progressive parts. [Source][stripe-debug] | **Partial.** Ontology learning covers unfamiliar local APIs; support search covers service/API wiring. Neither implements the described client-side HTTP chain. | **High priority:** deterministic HTTP fixtures and a client integration task. |
| Stripe: AI transaction-rule parser | Provider reports a transaction decision engine growing from simple conditions to AND/OR expressions. No company-published specification found. [Provider-relayed report][stripe-rules] | **Missing.** Webhook deduplication and ledger balances do not parse or evaluate a rule language. | **Yes, conditional next:** original analogous exercise; tentative attribution. |
| Canva: airport control example | Company's own illustrative example asks for an aircraft takeoff/landing control system, replacing a simpler algorithm exercise. It is an example, not a disclosed universal live prompt. [Official post][canva-official] | **Partial.** `palantir-911-dispatch-build` exercises constrained resource selection, not runway occupancy or takeoff/landing sequencing. | Reuse dispatch for clarification/ranking; defer a separate airport scenario. |
| Canva: build a small design editor | Candidate reports building a Canva-like interface and describes a toolbar with draggable shapes on a canvas. [Firsthand report][canva-frontend] | **Missing executable UI task.** Current Python/JS workspace functions are not a rendered editor product-building exercise. | Valuable later; first verify a rendered frontend task environment. |
| Canva: review nested Todo state | Same candidate describes reviewing/refactoring nested Todo state through insert, edit, and delete actions. [Firsthand report][canva-frontend] | **Partial.** Comment-thread merge trains state-update diagnosis, but is a Python list-merge backend exercise. Meridian reviews train review judgment, not React/browser state. | Reuse review skills now; later author a frontend state task. |
| Anthropic: concurrent crawler | Candidate describes a same-domain crawler using a supplied link-fetch helper, then concurrency and multi-machine discussion; says no LLM was used. [Firsthand report][anthropic-crawler] | **Missing.** Graph traversal exercises do not establish bounded concurrency, duplicate scheduling, or completion detection. | Good later addition. Async fixtures can teach coordination; do not claim real thread/process equivalence. |
| Anthropic: accelerator optimization | Company-released historical take-home optimizes code on a simulated accelerator, checked by correctness tests and simulated cycles. [Official release][anthropic-takehome], [company explanation][anthropic-performance] | **Missing.** `MER-304` investigates query performance; it does not simulate accelerator instruction scheduling. | Link as specialist external practice; low priority for our general SWE bank. |
| OpenAI: expiring resource credits | Candidate reports describe granting credits with validity windows, consuming them, and querying remaining balance. This is a coding-screen report, not proof AI was permitted. [Candidate report][openai-credits] | **Partial.** Webhooks/ledger packs cover duplication and balances; `dsa-time-based-key-value-store` covers historical lookup. No expiring grant allocation implementation was found. | Later: useful independent coding system; clarify expiry/ordering semantics in our own contract. |
| Atlassian: card-PIN migration | Candidate describes preserving four-digit PINs, including leading zeros, while adding validation through an existing Spring Boot/JPA application. [Candidate report][atlassian-pin] | **Partial.** `MER-101` and `MER-204` cover boundary validation and representation compatibility. They are TypeScript tasks, not Java entities, request binding, and database mapping. | Reuse transferable concepts. Defer exact stack reproduction. |
| Palantir: learn an unfamiliar abstraction | Read minimal documentation, explain supplied behavior, then apply/improve it. [Firsthand account][palantir-learning] | **Close format.** Ontology Learning Case Lab and `palantir-ontology-org-build` directly exercise reading a new local object/link API and traversing it. | **Yes: maintain and surface.** Not an exact company-provided API task. |
| Datadog: query API client | Provider-relayed account describes submitting a Snowflake query and checking status, with batching, large results, and secrets as follow-ups. [Tentative report][datadog-api] | **Partial.** Local Ontology API learning is adjacent; Datadog rollup packs do not implement an external query client. | Reuse the proposed API integration exercise; do not build a second engine for the logo. |
| Datadog: review a batching PR | Relayed account describes missing fallback behavior and insufficient throughput in a processor change. Replies contradict the claimed AI permission. [Conflicting report][datadog-review] | **Close review workflow.** Playable `MER-105`, `MER-303`, and `MER-404` require review judgment; rate-limiter error handling trains failure policy. Exact batching PR absent. | Surface existing reviews. Obtain stronger evidence before company-specific claims. |

## Existing content to focus on now

| Existing implementation | Why it earns focus | Limit to preserve |
| --- | --- | --- |
| [`BookClub`](../../lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace.ts) | Larger unfamiliar Python project; staged investigation of pagination, calendars, and caching across services. | A 90-minute guided learning lab is not automatically a timed Meta mock. Keep its teaching mode intact. |
| [`Cache cleanup`](../../lib/scenarios/real-world/bugfix/packs/generic-cache-eviction-mutation.ts) | Multiple independent defects and an adaptation path in a small multi-file project. | Authored through its pack source/compiler; generated TypeScript should not be hand-edited. |
| [`Rate-limiter exception handling`](../../lib/scenarios/real-world/bugfix/rate-limiter-error-handling/scenario.ts) | Failure classification, outage policy, tests, and JS/Python variants. | Do not label it an actual Google/Meta question without evidence. |
| [`Comment-thread merge`](../../lib/scenarios/real-world/bugfix/bugfix-comment-thread-merge.ts) | Minimal patch, data identity, correctness and complexity discussion. | Not a rendered frontend state or nested-tree exercise. |
| [`MER-105`](../../lib/sprint-labs/content/meridian/tickets/MER-105.ts), [`MER-303`](../../lib/sprint-labs/content/meridian/tickets/MER-303.ts), [`MER-404`](../../lib/sprint-labs/content/meridian/tickets/MER-404.ts) | Playable review-only tickets: challenge an apparently successful patch and supply evidence. | Review-only policy is part of the task; company formats can permit different assistance. |
| [`MER-304`](../../lib/sprint-labs/content/meridian/tickets/MER-304.ts) | Playable investigation of a performance regression with a bounded-query requirement. | Different from algorithm benchmarking or accelerator optimization. |
| [`Ontology build`](../../lib/scenarios/add-functionality/add-feature-ontology-org.ts) | Understand unfamiliar API contracts before implementing increasingly complex queries. | Local API learning is not external HTTP integration. |

## Ordered implementation briefs

These are proposed original practice requirements, not claims about hidden company tests.

### 1. Phased maze workspace

**Goal:** practice reading unfamiliar graph objects, repairing them, then adapting traversal without replacing the project.

- Reuse the workspace manifest, public tests, sealed references, prerequisites, and session evidence contracts in [debugging authoring](./debugging-authoring.md).
- Provide a small model/parser/renderer/solver project. Stage a rendering or traversal defect before the core implementation.
- Add directed cells and then key/door state as distinct follow-ups. Treat portals/serialization from the other candidate account as optional variants, not one purported canonical prompt.
- Grade observable paths and unreachable cases; verify revisiting a position with different key state. Preserve start/end markers and existing behavior.
- Prove starter failure and reference success, plus a plausible incomplete repair that still fails. Keep hidden tests and answers outside AI context.
- Start with one supported language. Add a variant only when it improves actual preparation value.

### 2. Unique-character word-selection workspace

**Goal:** practice repairing a supplied implementation, identifying overlap constraints, implementing selection, and improving it when input characteristics change.

- Author our own documented alphabet, output, duplicate-word behavior, and tie-breaking rules. Published task summaries do not settle these details.
- Test overlap between words and repeated characters inside one word, alongside empty/no-feasible input and multiple optimal selections.
- Supply input families that distinguish a correct exhaustive baseline from a more efficient implementation. Avoid wall-clock-only pass/fail thresholds.
- Reuse ordinary bitmask/backtracking teaching; do not force a trie or other implementation because one preparation article mentions it.

### 3. Unfamiliar-library debugging workspace

**Goal:** approximate Stripe's library-reading burden rather than add another payment-domain toy.

- Use a compact original HTTP-client or template/parser library with public docs and separate failing regressions across modules.
- Require preserving existing public behavior, narrow patches, and regression explanations. Add realistic distracting code without manufacturing ambiguity in the spec.
- Run entirely with local deterministic fixtures. We do not need to vendor a large third-party project or add a new execution platform for the first useful exercise.
- Keep an independent mock option because the firsthand Stripe account prohibits AI in this round.

### 4. External-API integration workspace

**Goal:** exercise unfamiliar API documentation, response-driven requests, and failures. One implementation can cover skills reported for Stripe and tentatively Datadog.

- Provide deterministic request/response fixtures through an explicit transport interface, with input-file parsing, a dependent second call, and a status/pagination follow-up.
- Clearly label simulated HTTP. Do not claim that fixture execution proves real network authentication or package setup competence.
- Include rejected requests, retry limits, malformed responses, and bounded processing. Credentials remain fake; live accounts are unnecessary.
- Consider a transaction-rule parser after these higher-confidence tasks. The rules exercise can use the same workspace runner, but it is a different domain task, not an API-client variant.

## What not to expand yet

- Another batch of company-branded rollups: they add little coverage of maze state, word-selection optimization, third-party libraries, or HTTP orchestration.
- An exact Google question page: no adequately substantiated exact prompt was found.
- A Java/Spring runner solely for the one Atlassian report: current scenario languages are JS, TS, Python, and SQL. Teach representation and boundary concepts with existing content first.
- A new grading or AI-provider layer: the identified first additions fit existing scenario contracts. A new layer needs a concrete execution limitation to justify it.
- Claiming all Meridian tickets are runnable: `MER-1001` (three agent PRs) and `MER-1002` (concurrent outbox lag) are interesting adjacent authored content but explicitly `playable: false` today.
- Treating a logo, matching keyword, DSA primitive, authored file, or passing unit test as proof of a full company-round match.

## Verification and limits

- Imported the actual scenario registry to enumerate types, titles, workspace languages, file counts, and editable paths; checked the full bank rather than only filenames.
- Imported the compiled Meridian registry and checked per-ticket `playable` and `aiPolicy`; inspected relevant public task bodies and acceptance criteria.
- Traced Case Lab build references and featured discovery IDs. Read the runtime language boundary and authoring guidance before proposing scope.
- Searched the registered catalog and relevant labs for the reported task families. A negative match here means not found in this reviewed code, not proof that no related historical branch, lesson, or unregistered draft exists.
- Official policy, original reporting, firsthand reports, provider-relayed descriptions, and proposed practice requirements remain distinct. Reports can be inaccurate or stale; recruitment instructions for the actual round control permissions.
- No product code changed. No deployment or full interview journey was tested for this research document.

## Sources

All links checked during this review. Dates below are publication/report dates when available, not inferred rollout dates.

[google-may]: https://www.businessinsider.com/google-job-interview-software-engineers-ai-assistant-coding-2026-5 "Business Insider, Hugh Langley, May 7, 2026; original reporting"
[google-oct]: https://www.businessinsider.com/google-interview-process-ai-gemini-coding-comprehension-software-engineer-2026-10 "Business Insider, Hugh Langley, October 20, 2026; original reporting"
[deepmind]: https://storage.googleapis.com/deepmind-media/DeepMind.com/Assets/Docs/interviewing-at-google-deepmind.pdf "Official Google DeepMind interview guide; undated"
[meta-official]: https://www.linkedin.com/posts/meta_metacareers-interviewing-softwareengineering-activity-7386046074240737280-wnwA "Meta official account; pilot announcement"
[meta-multifile]: https://www.reddit.com/r/leetcode/comments/1r37w7q/meta_ml_research_scientist_interview_experience/ "Candidate account of January 2026 ML Research Scientist rounds; exact project withheld"
[meta-maze-firsthand]: https://www.reddit.com/r/leetcode/comments/1p35b98/meta_e4_software_product_interview_experience/ "Candidate account of October 2025 Bangalore E4 loop"
[meta-maze-notes]: https://www.hellointerview.com/community/questions/maze-solver-path/cmjlp495e05fs08adwrayjwbr "Public candidate notes including May 2026 reports; unverified identities"
[meta-words]: https://www.hellointerview.com/community/questions/unique-characters-subset/cmjdgvdgd00bn08adhvz1s58g "Public question description and reporting timeline through October 2026"
[meta-words-firsthand]: https://www.reddit.com/r/leetcode/comments/1p6z6pt/meta_sde2_interview_experience/ "Firsthand SDE2 account; shared-letter removal described, exact follow-ups unknown"
[meta-cards]: https://www.hellointerview.com/community/questions/cards-sum-15/cmj313k1c05rj08adjuwctql8 "Public question description and May/June 2026 reporting timeline"
[meta-friends]: https://www.hellointerview.com/community/questions/friend-recommendation-system/cmmjgcgav052c0eadi8f91wl8 "Public question description and candidate notes through October 2026"
[amazon]: https://www.aboutamazon.com/news/workplace/artificial-intelligence-resume-jobs-hiring-amazon "Official Amazon account of AI-assisted technical assessments"
[canva-official]: https://www.canva.dev/blog/engineering/yes-you-can-use-ai-in-our-interviews/ "Simon Newton, June 11, 2025; official engineering account and illustrative airport example"
[canva-faq]: https://www.lifeatcanva.com/en/how-we-hire "Official careers FAQ; current at access"
[canva-frontend]: https://www.reddit.com/r/cscareerquestionsOCE/comments/1t1jfxx/canva_interview_notes/ "Firsthand frontend candidate account; separate rounds and clarification in comments"
[stripe-debug]: https://www.reddit.com/r/leetcode/comments/1mgcc99/stripe_integration_and_bug_bash_rounds_interview/ "Firsthand senior Dublin account, published 2025; separate API and debugging rounds, AI prohibition in author's replies"
[stripe-ai-firsthand]: https://www.reddit.com/r/leetcode/comments/1vbpool/stripe_and_meta_new_ai_interview_experience/ "Firsthand July 31, 2026 post confirms experiencing AI rounds; does not disclose exact task"
[stripe-rules]: https://www.reddit.com/r/leetcode/comments/1u51q4w/stripes_new_ai_programming_exercise_interview/ "June 13, 2026; commercial provider relaying candidate descriptions, not firsthand or company-confirmed"
[anthropic-policy]: https://www.anthropic.com/candidate-ai-guidance "Official candidate AI guidance; page dated July 10, 2025"
[anthropic-crawler]: https://www.reddit.com/r/crack_ml_interview/comments/1ul41rs/anthropic_interview_experience_starts_simple_then/ "Firsthand self-described candidate account; author says no LLM in comments"
[anthropic-takehome]: https://github.com/anthropics/original_performance_takehome "Official released historical take-home; superseded as a time-limited assessment"
[anthropic-performance]: https://www.anthropic.com/research/AI-resistant-technical-evaluations "Tristan Hume, January 21, 2026; official explanation"
[openai-guide]: https://openai.com/interview-guide/ "Official interview guide; current at access"
[openai-credits]: https://www.reddit.com/r/OfferEngineering/comments/1vwfkyp/openai_senior_swe_phone_screen_august_2026/ "Anonymous August 2026 report; public account is not company validation or proof of AI permission"
[atlassian-pin]: https://interviewexperiences.in/experience/atlassian/atlassian-ai-enabled-coding-round-spring-boot-h2-pin-validation "Anonymous self-described Backend P40 candidate account, October 30, 2026"
[microsoft]: https://careers.microsoft.com/v2/global/en/hiring-tips "Official candidate code of conduct; current at access"
[palantir-learning]: https://www.reddit.com/r/csMajors/comments/1bwrtlu/palantir_interview_prep_intern_new_grad_rejection/ "Firsthand 2024 intern/new-grad account; older evidence, exact new concept unspecified"
[datadog-api]: https://www.reddit.com/r/InterviewDB/comments/1uflm18/datadog_ai_coding_interview_what_to_expect/ "June 25, 2026; commercial provider account with candidate narrative; tentative attribution"
[datadog-review]: https://www.reddit.com/r/InterviewDB/comments/1w8a3ui/datadog_swe_interview_experience_phone_screen/ "Provider-relayed account; AI permission disputed by replies, not treated as established policy"
